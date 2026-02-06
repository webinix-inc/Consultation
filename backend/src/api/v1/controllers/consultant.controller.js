const { Consultant } = require("../../../models/consultant.model");
const Category = require("../../../models/category.model");
const SubCategory = require("../../../models/subcategory.model");
const ClientConsultant = require("../../../models/clientConsultant.model");
const Appointment = require("../../../models/appointment.model");
const { Document } = require("../../../models/document.model");
const Transaction = require("../../../models/transaction.model");
const ConsultantSettings = require("../../../models/consultantSettings.model");
const { sendSuccess, ApiError } = require("../../../utils/response");
const httpStatus = require("../../../constants/httpStatus");
const bcrypt = require("bcryptjs");
const { deleteFile, extractKeyFromUrl } = require("../../../services/s3.service");

exports.list = async (req, res, next) => {
  try {
    const { category, status, q } = req.query;
    const filter = {};
    if (category) filter["category.name"] = category;
    if (status) filter.status = status;
    if (q) {
      const { escapeRegex } = require("../../../utils/string.util");
      const escaped = escapeRegex(String(q).slice(0, 100));
      if (escaped) filter.name = { $regex: escaped, $options: "i" };
    }

    // Find all consultants
    let consultants = await Consultant.find(filter).sort({ createdAt: -1 });

    // Get client counts for all consultants in parallel
    const consultantsWithCounts = await Promise.all(
      consultants.map(async (consultant) => {
        // ClientConsultant.consultant references User ID, so we need to check if consultant has a user field
        // If not, we'll need to update ClientConsultant model later, but for now try both
        let clientCount = 0;
        if (consultant.user) {
          // If consultant has a user reference, use that
          clientCount = await ClientConsultant.countClientsForConsultant(consultant.user);
        } else {
          // Try using consultant ID directly (in case ClientConsultant was updated)
          clientCount = await ClientConsultant.countClientsForConsultant(consultant._id);
        }
        return {
          ...consultant.toObject(),
          clientsCount: clientCount
        };
      })
    );

    return sendSuccess(res, "Consultants fetched", consultantsWithCounts);
  } catch (error) {
    next(error);
  }
};

const { resolveConsultantDto } = require("../../../helpers/consultantHelper");

exports.getOne = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Use helper to resolve consultant by either Consultant ID or User ID
    const consultant = await resolveConsultantDto(id);

    if (!consultant) {
      throw new ApiError("Consultant not found", httpStatus.NOT_FOUND);
    }

    // Get client count (using the resolved ID, which might be a User ID or Consultant ID)
    // Note: countClientsForConsultant likely expects a User ID now since we migrated relationships
    // But let's check if we need to pass the User ID specifically
    const userId = consultant.raw?.user || consultant._id;
    const clientCount = await ClientConsultant.countClientsForConsultant(userId);

    const consultantWithCount = {
      ...consultant,
      clientsCount: clientCount
    };

    return sendSuccess(res, "Consultant fetched", consultantWithCount);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const consultantData = { ...req.body };
    console.log("🛠️ [Consultant Create] Incoming Body:", JSON.stringify(req.body, null, 2));
    console.log("🛠️ [Consultant Create] Initial Category:", req.body.category, "Type:", typeof req.body.category);

    // Check if consultant already exists (by email or mobile/phone)
    const phoneVal = consultantData.phone || consultantData.mobile;
    const digits = (phoneVal || '').replace(/\D/g, '');
    const phoneVariants = [phoneVal, digits];
    if (digits.length === 10) phoneVariants.push('+91' + digits, '91' + digits);
    if (digits.length === 12 && digits.startsWith('91')) phoneVariants.push(digits.slice(2));
    const phoneOr = phoneVariants.filter(Boolean).flatMap((v) => [{ phone: v }, { mobile: v }]);
    const existingConsultant = await Consultant.findOne({
      $or: [
        { email: consultantData.email?.toLowerCase() },
        ...phoneOr
      ]
    });

    if (existingConsultant) {
      throw new ApiError("Consultant with this email or mobile already exists", httpStatus.CONFLICT);
    }

    // Ensure required fields are present
    if (!consultantData.email) {
      throw new ApiError("Email is required", httpStatus.BAD_REQUEST);
    }
    if (!consultantData.phone && !consultantData.mobile) {
      throw new ApiError("Phone or mobile number is required", httpStatus.BAD_REQUEST);
    }

    // Sync phone and mobile fields
    if (consultantData.phone && !consultantData.mobile) {
      consultantData.mobile = consultantData.phone;
    }
    if (consultantData.mobile && !consultantData.phone) {
      consultantData.phone = consultantData.mobile;
    }

    // Normalize to E.164 for OTP login compatibility (Admin may enter "9876543210", login uses "+919876543210")
    const raw = (consultantData.phone || consultantData.mobile || '').replace(/\D/g, '');
    const currentVal = (consultantData.phone || consultantData.mobile || '').trim();
    if (raw.length === 10 && !raw.startsWith('91')) {
      consultantData.phone = '+91' + raw;
      consultantData.mobile = consultantData.phone;
    } else if (raw.length === 12 && raw.startsWith('91') && !currentVal.startsWith('+')) {
      consultantData.phone = '+' + raw;
      consultantData.mobile = consultantData.phone;
    }

    // Set name from fullName if provided
    if (consultantData.fullName && !consultantData.name) {
      consultantData.name = consultantData.fullName;
    }



    // Handle image upload from S3 (if uploaded via multer middleware)
    if (req.file) {
      consultantData.image = req.file.location;
    }

    // Set default status if not provided
    if (!consultantData.status) {
      consultantData.status = 'Pending';
    }

    // Handle category object structure
    // Handle category snapshot
    if (!consultantData.category) {
      consultantData.category = { name: "General" };
    } else if (typeof consultantData.category === "string") {
      // Try to find category by ID or Title
      let catDoc = null;
      if (consultantData.category.match(/^[0-9a-fA-F]{24}$/)) {
        catDoc = await Category.findById(consultantData.category);
      }
      if (!catDoc) {
        catDoc = await Category.findOne({ title: consultantData.category });
      }

      if (catDoc) {
        consultantData.category = {
          name: catDoc.title,
          description: catDoc.description,
          imageUrl: catDoc.image
        };
      } else {
        consultantData.category = { name: consultantData.category };
      }
    } else if (typeof consultantData.category === "object" && !consultantData.category.name) {
      consultantData.category.name = "General";
    }

    // Handle subcategory snapshot
    if (consultantData.subcategory && typeof consultantData.subcategory === "string") {
      // Try to find subcategory by ID or Title
      let subDoc = null;
      if (consultantData.subcategory.match(/^[0-9a-fA-F]{24}$/)) {
        subDoc = await SubCategory.findById(consultantData.subcategory);
      }
      if (!subDoc) {
        subDoc = await SubCategory.findOne({ title: consultantData.subcategory });
      }

      if (subDoc) {
        consultantData.subcategory = {
          name: subDoc.title,
          description: subDoc.description,
          imageUrl: subDoc.image
        };
      } else {
        consultantData.subcategory = { name: consultantData.subcategory };
      }
    }


    // Failsafe: Ensure name exists if it's an object
    if (consultantData.category && typeof consultantData.category === 'object' && !consultantData.category.name) {
      console.log("⚠️ [Consultant Create] Category name missing after logic, forcing 'General'");
      consultantData.category.name = "General";
    }

    console.log("🛠️ [Consultant Create] Final Category Payload:", JSON.stringify(consultantData.category, null, 2));

    const consultant = await Consultant.create(consultantData);
    console.log("🛠️ [Consultant Create] Created successfully:", consultant._id);

    const consultantResponse = consultant.toObject();
    delete consultantResponse.password; // Never expose password (even hashed) in API response

    return sendSuccess(res, "Consultant created", consultantResponse, httpStatus.CREATED);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Handle category object structure
    if (updateData.category && typeof updateData.category === "string") {
      // Try to find category by ID or Title
      let catDoc = null;
      if (updateData.category.match(/^[0-9a-fA-F]{24}$/)) {
        catDoc = await Category.findById(updateData.category);
      }
      if (!catDoc) {
        catDoc = await Category.findOne({ title: updateData.category });
      }

      if (catDoc) {
        updateData.category = {
          name: catDoc.title,
          description: catDoc.description,
          imageUrl: catDoc.image
        };
      } else {
        updateData.category = { name: updateData.category };
      }
    }

    // Handle subcategory object structure
    if (updateData.subcategory && typeof updateData.subcategory === "string") {
      // Try to find subcategory by ID or Title
      let subDoc = null;
      if (updateData.subcategory.match(/^[0-9a-fA-F]{24}$/)) {
        subDoc = await SubCategory.findById(updateData.subcategory);
      }
      if (!subDoc) {
        subDoc = await SubCategory.findOne({ title: updateData.subcategory });
      }

      if (subDoc) {
        updateData.subcategory = {
          name: subDoc.title,
          description: subDoc.description,
          imageUrl: subDoc.image
        };
      } else {
        updateData.subcategory = { name: updateData.subcategory };
      }
    }

    // Handle image upload from S3 (if uploaded via multer middleware)
    if (req.file) {
      // Get existing consultant to delete old image
      const existingConsultant = await Consultant.findById(id);
      if (existingConsultant && existingConsultant.image) {
        try {
          // Extract S3 key from old image URL and delete it
          const oldKey = extractKeyFromUrl(existingConsultant.image);
          if (oldKey) {
            await deleteFile(oldKey);
          }
        } catch (deleteError) {
          console.error("Error deleting old image from S3:", deleteError);
          // Continue with update even if old image deletion fails
        }
      }
      // Set new image URL from S3
      updateData.image = req.file.location;
    }

    const updated = await Consultant.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      throw new ApiError("Consultant not found", httpStatus.NOT_FOUND);
    }

    // Sync with User model if user reference exists
    if (updated.user) {
      const User = require("../../../models/user.model");
      const userUpdate = {};

      if (updateData.image) userUpdate.profileImage = updateData.image;
      if (updateData.name) userUpdate.fullName = updateData.name;
      // if (updateData.phone) userUpdate.mobile = updateData.phone; // Optional: sync phone/mobile

      if (Object.keys(userUpdate).length > 0) {
        await User.findByIdAndUpdate(updated.user, userUpdate);
      }
    }

    return sendSuccess(res, "Consultant updated", updated);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const consultant = await Consultant.findById(id);

    if (!consultant) {
      throw new ApiError("Consultant not found", httpStatus.NOT_FOUND);
    }

    // Delete image from S3 if exists
    if (consultant.image) {
      try {
        const imageKey = extractKeyFromUrl(consultant.image);
        if (imageKey) {
          await deleteFile(imageKey);
        }
      } catch (deleteError) {
        console.error("Error deleting image from S3:", deleteError);
        // Continue with deletion even if S3 deletion fails
      }
    }

    const deleted = await Consultant.findByIdAndDelete(id);
    return sendSuccess(res, "Consultant deleted", { deletedId: id });
  } catch (error) {
    next(error);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Consultant.findByIdAndUpdate(
      id,
      { status: "Active" },
      { new: true }
    );
    if (!updated) {
      throw new ApiError("Consultant not found", httpStatus.NOT_FOUND);
    }
    return sendSuccess(res, "Consultant approved", updated);
  } catch (error) {
    next(error);
  }
};

exports.reject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Consultant.findByIdAndUpdate(
      id,
      { status: "Rejected" },
      { new: true }
    );
    if (!updated) {
      throw new ApiError("Consultant not found", httpStatus.NOT_FOUND);
    }
    return sendSuccess(res, "Consultant rejected", updated);
  } catch (error) {
    next(error);
  }
};

exports.block = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Consultant.findByIdAndUpdate(
      id,
      { status: "Blocked" },
      { new: true }
    );
    if (!updated) {
      throw new ApiError("Consultant not found", httpStatus.NOT_FOUND);
    }
    return sendSuccess(res, "Consultant blocked", updated);
  } catch (error) {
    next(error);
  }
};

exports.unblock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Consultant.findByIdAndUpdate(
      id,
      { status: "Active" },
      { new: true }
    );
    if (!updated) {
      throw new ApiError("Consultant not found", httpStatus.NOT_FOUND);
    }
    return sendSuccess(res, "Consultant unblocked", updated);
  } catch (error) {
    next(error);
  }
};

/**
 * GDPR Art. 15 - Right to Access: Export all personal data
 * GET /api/v1/consultants/me/export
 */
exports.exportMyData = async (req, res, next) => {
  try {
    const consultantId = req.user.id;
    let consultant = await Consultant.findById(consultantId);
    if (!consultant) consultant = await Consultant.findOne({ user: consultantId });
    if (!consultant) throw new ApiError("Consultant not found", httpStatus.NOT_FOUND);

    const ids = [consultantId, consultant._id.toString(), consultant.user].filter(Boolean);

    const [appointments, documents, transactions, settings] = await Promise.all([
      Appointment.find({ consultant: { $in: ids } })
        .select("date startAt endAt status session fee reason notes clientSnapshot consultantSnapshot")
        .lean(),
      Document.find({ consultant: { $in: ids }, status: { $ne: "Deleted" } })
        .select("title type appointment createdAt description status")
        .lean(),
      Transaction.find({ consultant: { $in: ids } })
        .select("amount currency type status createdAt userSnapshot consultantSnapshot")
        .lean(),
      ConsultantSettings.findOne({ consultant: { $in: ids } }).lean(),
    ]);

    const profile = consultant.toObject();
    delete profile.password;
    delete profile.otp;
    delete profile.otpExpires;
    delete profile.resetPasswordToken;
    delete profile.resetPasswordExpire;

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile,
      appointments,
      documents,
      transactions,
      settings: settings || null,
    };

    res.setHeader("Content-Disposition", `attachment; filename="my-data-export-${Date.now()}.json"`);
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json(exportData);
  } catch (error) {
    next(error);
  }
};

/**
 * GDPR Art. 17 - Right to Erasure: Self-service account deletion
 * DELETE /api/v1/consultants/me
 */
exports.deleteMyAccount = async (req, res, next) => {
  try {
    const consultantId = req.user.id;
    const { password } = req.body || {};

    let consultant = await Consultant.findById(consultantId).select("+password");
    if (!consultant) consultant = await Consultant.findOne({ user: consultantId }).select("+password");
    if (!consultant) throw new ApiError("Consultant not found", httpStatus.NOT_FOUND);

    if (consultant.password) {
      if (!password) throw new ApiError("Password is required to delete your account", httpStatus.BAD_REQUEST);
      const isMatch = await consultant.matchPassword(password);
      if (!isMatch) throw new ApiError("Invalid password", httpStatus.UNAUTHORIZED);
    }

    const ids = [consultantId, consultant._id.toString(), consultant.user].filter(Boolean);

    const documents = await Document.find({ consultant: { $in: ids } }).select("fileKey");
    for (const doc of documents) {
      try {
        if (doc.fileKey) await deleteFile(doc.fileKey);
      } catch (e) { /* ignore */ }
    }

    if (consultant.image) {
      try {
        const key = extractKeyFromUrl(consultant.image);
        if (key) await deleteFile(key);
      } catch (e) { /* ignore */ }
    }

    await Promise.all([
      Document.deleteMany({ consultant: { $in: ids } }),
      Transaction.deleteMany({ consultant: { $in: ids } }),
      Appointment.deleteMany({ consultant: { $in: ids } }),
      ConsultantSettings.deleteMany({ consultant: { $in: ids } }),
      ClientConsultant.deleteMany({ consultant: { $in: ids } }),
    ]);

    const Notification = require("../../../models/notification.model");
    await Notification.deleteMany({ recipient: { $in: ids } });

    await Consultant.findByIdAndDelete(consultant._id);

    return sendSuccess(res, "Your account and all associated data have been permanently deleted.");
  } catch (error) {
    next(error);
  }
};

/**
 * GDPR - Update consent preferences
 * PATCH /api/v1/consultants/me/consent
 */
exports.updateConsent = async (req, res, next) => {
  try {
    const consultantId = req.user.id;
    const { marketingConsent, dataProcessingConsent } = req.body || {};

    const update = {};
    if (typeof marketingConsent === "boolean") update.marketingConsent = marketingConsent;
    if (typeof dataProcessingConsent === "boolean") update.dataProcessingConsent = dataProcessingConsent;

    if (Object.keys(update).length === 0) {
      throw new ApiError("No valid consent fields to update", httpStatus.BAD_REQUEST);
    }

    let consultant = await Consultant.findByIdAndUpdate(consultantId, { $set: update }, { new: true });
    if (!consultant) consultant = await Consultant.findOneAndUpdate({ user: consultantId }, { $set: update }, { new: true });
    if (!consultant) throw new ApiError("Consultant not found", httpStatus.NOT_FOUND);

    return sendSuccess(res, "Consent preferences updated", {
      marketingConsent: consultant.marketingConsent,
      dataProcessingConsent: consultant.dataProcessingConsent,
    });
  } catch (error) {
    next(error);
  }
};
