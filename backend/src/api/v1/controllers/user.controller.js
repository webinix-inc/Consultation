const User = require("../../../models/user.model");
const { sendEmail } = require("../../../jobs/email.job");
const { sendSuccess, sendError, ApiError } = require("../../../utils/response");
const { SUCCESS, ERROR } = require("../../../constants/messages");
const httpStatus = require("../../../constants/httpStatus");

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find()

      .populate('category subcategory')
      .sort({ createdAt: -1 });

    return sendSuccess(res, SUCCESS.USERS_FETCHED, users);
    // res.json(users);
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)

      .populate("category subcategory");

    if (!user) {
      throw new ApiError(ERROR.USER_NOT_FOUND, httpStatus.NOT_FOUND);
    }

    return sendSuccess(res, "Profile fetched successfully", user);
  } catch (error) {
    next(error);
  }
};

// Get active consultants (for Client role to see available consultants)
exports.getActiveConsultants = async (req, res, next) => {
  try {
    const users = await User.find({
      role: "Consultant",
      status: "Active",
      verificationStatus: "Approved"
    })

      .populate('category subcategory')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch Consultant profile details (fees, commission) for each user
    const Consultant = require("../../../models/consultant.model").Consultant;

    const enhancedUsers = await Promise.all(users.map(async (user) => {
      const consultantProfile = await Consultant.findOne({ email: user.email }).select('fees commission country currency').lean();
      return {
        ...user,
        fees: consultantProfile?.fees || 0,
        commission: consultantProfile?.commission || {},
        country: consultantProfile?.country || "IN",
        currency: consultantProfile?.currency || "",
        consultantProfileId: consultantProfile?._id
      };
    }));

    return sendSuccess(res, "Active consultants fetched", enhancedUsers);
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const userData = req.body;

    // User model is only for Admin and Employee roles
    if (userData.role === 'Consultant' || userData.role === 'Client') {
      throw new ApiError(
        `Cannot create ${userData.role} using User endpoint. Please use the ${userData.role} creation endpoint instead.`,
        httpStatus.BAD_REQUEST
      );
    }

    // Check if user already exists (email, userId, or mobile)
    const existingUser = await User.findOne({
      $or: [
        { email: userData.email },
        { userId: userData.userId },
        { mobile: userData.mobile }
      ]
    });

    if (existingUser) {
      let field = 'email';
      if (existingUser.userId === userData.userId) field = 'User ID';
      if (existingUser.mobile === userData.mobile) field = 'mobile number';

      throw new ApiError(`User with this ${field} already exists`, httpStatus.CONFLICT);
    }

    // Clean up category and subcategory - remove if empty string
    if (userData.category === '' || userData.category === null || userData.category === undefined) {
      delete userData.category;
    }
    if (userData.subcategory === '' || userData.subcategory === null || userData.subcategory === undefined) {
      delete userData.subcategory;
    }

    // Set verificationStatus - Admin and Employee are auto-approved
    userData.verificationStatus = 'Approved';
    userData.status = 'Active';



    const newUser = await User.create(userData);

    // Populate category and subcategory
    await newUser.populate('category subcategory');

    // Return user data with generated password if applicable
    const userResponse = {
      id: newUser._id,
      userId: newUser.userId,
      fullName: newUser.fullName,
      email: newUser.email,
      mobile: newUser.mobile,
      role: newUser.role,
      category: newUser.category,
      subcategory: newUser.subcategory,
      status: newUser.status,
      createdAt: newUser.createdAt,
    };

    // Include generated password in response if it was auto-generated


    return sendSuccess(res, SUCCESS.USER_CREATED, userResponse, httpStatus.CREATED);
  } catch (error) {
    next(error);
  }
};


exports.updateUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const updateData = { ...req.body };

    // Remove fields that shouldn't be updated
    delete updateData._id;
    delete updateData.userId;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.role;

    // If password is being updated, mark it as not auto-generated


    // Clean up category and subcategory - remove if empty string
    if (updateData.category === '' || updateData.category === null) {
      updateData.category = null; // Set to null to clear the field
    }
    if (updateData.subcategory === '' || updateData.subcategory === null) {
      updateData.subcategory = null; // Set to null to clear the field
    }

    // Sync status with verificationStatus
    if (updateData.verificationStatus === 'Blocked') {
      updateData.status = 'Inactive';
    } else if (updateData.verificationStatus === 'Approved') {
      updateData.status = 'Active';
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    )

      .populate('category subcategory');

    if (!updatedUser) {
      throw new ApiError(ERROR.USER_NOT_FOUND, httpStatus.NOT_FOUND);
    }

    return sendSuccess(res, SUCCESS.USER_UPDATED, updatedUser);
  } catch (error) {
    next(error);
  }
};

/**
 * GDPR Art. 15 - Right to Access: Export all personal data (Admin/Employee only)
 * GET /api/v1/users/profile/export
 */
exports.exportMyData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId)
      .populate("category subcategory")
      .select("-password -otp -otpExpires -resetPasswordToken -resetPasswordExpire")
      .lean();

    if (!user) {
      throw new ApiError(ERROR.USER_NOT_FOUND, httpStatus.NOT_FOUND);
    }

    // Only Admin/Employee can use this endpoint (enforced by route)
    if (user.role !== "Admin" && user.role !== "Employee") {
      throw new ApiError("This endpoint is for Admin/Employee only", httpStatus.FORBIDDEN);
    }

    const AdminSettings = require("../../../models/adminSettings.model");
    const Notification = require("../../../models/notification.model");

    const [adminSettings, notifications] = await Promise.all([
      AdminSettings.findOne({ admin: userId }).lean(),
      Notification.find({ recipient: userId })
        .select("name message type category read createdAt")
        .lean(),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: user,
      adminSettings: adminSettings || null,
      notifications,
    };

    res.setHeader("Content-Disposition", `attachment; filename="my-data-export-${Date.now()}.json"`);
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json(exportData);
  } catch (error) {
    next(error);
  }
};

/**
 * GDPR Art. 17 - Right to Erasure: Self-service account deletion (Admin/Employee only)
 * DELETE /api/v1/users/profile
 */
exports.deleteMyAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { password } = req.body || {};

    const user = await User.findById(userId).select("+password");
    if (!user) {
      throw new ApiError(ERROR.USER_NOT_FOUND, httpStatus.NOT_FOUND);
    }

    if (user.role !== "Admin" && user.role !== "Employee") {
      throw new ApiError("This endpoint is for Admin/Employee only", httpStatus.FORBIDDEN);
    }

    if (user.password) {
      if (!password) throw new ApiError("Password is required to delete your account", httpStatus.BAD_REQUEST);
      const isMatch = await user.matchPassword(password);
      if (!isMatch) throw new ApiError("Invalid password", httpStatus.UNAUTHORIZED);
    }

    const AdminSettings = require("../../../models/adminSettings.model");
    const Notification = require("../../../models/notification.model");

    await Promise.all([
      AdminSettings.deleteMany({ admin: userId }),
      Notification.deleteMany({ recipient: userId }),
    ]);

    await User.findByIdAndDelete(userId);

    return sendSuccess(res, "Your account and all associated data have been permanently deleted.");
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Check if user exists first
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(ERROR.USER_NOT_FOUND, httpStatus.NOT_FOUND);
    }

    // Prevent deleting the currently logged-in user
    if (userId === req.user.id) {
      throw new ApiError("Cannot delete your own account", httpStatus.BAD_REQUEST);
    }

    // If the user is a Consultant, delete related Consultant, ConsultantSettings, and ClientConsultant data
    if (user.role === 'Consultant') {
      const Consultant = require("../../../models/consultant.model").Consultant;
      const ConsultantSettings = require("../../../models/consultantSettings.model");
      const ClientConsultant = require("../../../models/clientConsultant.model");

      // Delete ConsultantSettings associated with this user (ConsultantSettings.consultant is User ID)
      await ConsultantSettings.deleteMany({ consultant: userId });

      // Find the consultant profile by User ID
      const consultant = await Consultant.findOne({ user: userId });

      if (consultant) {
        // Delete the Consultant profile
        await Consultant.findByIdAndDelete(consultant._id);
        console.log(`Deleted Consultant profile for User ID ${userId}`);
      }

      // Delete ClientConsultant links (where consultant is the User ID)
      await ClientConsultant.deleteMany({ consultant: userId });
      console.log(`Deleted ConsultantSettings and ClientConsultant links for User ID ${userId}`);
    }

    // Delete Notifications for this user
    const Notification = require("../../../models/notification.model");
    await Notification.deleteMany({ recipient: userId });
    console.log(`Deleted Notifications for User ID ${userId}`);

    await User.findByIdAndDelete(userId);

    return sendSuccess(res, SUCCESS.USER_DELETED, {
      deletedUserId: userId,
      deletedUserName: user.fullName
    });
  } catch (error) {
    next(error);
  }
};
