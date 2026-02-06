const User = require("../../../models/user.model");
const OTP = require("../../../models/otp.model");
const { sendEmail } = require("../../../jobs/email.job");
const { sendSuccess, sendError, ApiError } = require("../../../utils/response");
const { SUCCESS, ERROR } = require("../../../constants/messages");
const httpStatus = require("../../../constants/httpStatus");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Consultant } = require("../../../models/consultant.model");



/**
 * Bootstrap: Create first admin (only when no Admin users exist)
 * POST /api/v1/auth/create-admin
 */
exports.createAdmin = async (req, res, next) => {
  try {
    const adminCount = await User.countDocuments({ role: "Admin" });
    if (adminCount > 0) {
      throw new ApiError("Admin already exists. Use User Management to add more admins.", httpStatus.FORBIDDEN);
    }

    const { fullName, email, password, mobile } = req.body;
    const userId = "ADM-" + crypto.randomBytes(4).toString("hex").toUpperCase();

    const admin = await User.create({
      userId,
      fullName,
      email: email.toLowerCase(),
      mobile,
      password,
      role: "Admin",
      status: "Active",
      verificationStatus: "Approved",
    });

    return sendSuccess(res, "Admin created successfully", {
      id: admin._id,
      userId: admin.userId,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role,
    }, httpStatus.CREATED);
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(ERROR.USER_NOT_FOUND, httpStatus.NOT_FOUND);
    }

    if (fullName) {
      user.fullName = fullName;
    }



    await user.save();

    const responseData = {
      id: user._id,
      name: user.fullName,
      email: user.email,
      role: user.role,
    };

    return sendSuccess(res, SUCCESS.PROFILE_UPDATED, responseData);
  } catch (error) {
    next(error);
  }
};

exports.sendOtp = async (req, res, next) => {
  try {
    let { mobile } = req.body;

    // Mobile number should be in E.164 format (e.g. +1234567890) from frontend
    // mobile = mobile.replace(/\D/g, '');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.findOneAndUpdate(
      { mobile },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    // Security: Never log or return OTP. In production, OTP should only be sent via SMS.
    // For dev/testing without SMS, set ALLOW_OTP_IN_RESPONSE=true (never in production)
    const responseData = process.env.NODE_ENV === "development" && process.env.ALLOW_OTP_IN_RESPONSE === "true"
      ? { otp }
      : undefined;
    return sendSuccess(res, "OTP sent successfully", responseData);
  } catch (error) {
    next(error);
  }
};

// Get phone/mobile variants for flexible lookup (Admin may store "9876543210", login sends "+919876543210")
const getPhoneLookupVariants = (mobile) => {
  if (!mobile || typeof mobile !== 'string') return [];
  const digits = mobile.replace(/\D/g, '');
  if (!digits) return [mobile];
  const variants = new Set([mobile, digits]);
  // Indian numbers: 91 + 10 digits → also try last 10 (national format Admin often uses)
  if (digits.length === 12 && digits.startsWith('91')) {
    variants.add(digits.slice(2));
  } else if (digits.length === 10 && !mobile.startsWith('+')) {
    variants.add('+91' + digits);
    variants.add('91' + digits);
  }
  return [...variants];
};

// Normalize role for case-insensitive matching (Client vs client, Consultant vs consultant)
const normalizeRole = (r) => {
  if (!r || typeof r !== 'string') return null;
  const s = r.trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower === 'client') return 'Client';
  if (lower === 'consultant') return 'Consultant';
  if (lower === 'admin') return 'Admin';
  if (lower === 'employee') return 'Employee';
  return s;
};

exports.verifyOtp = async (req, res, next) => {
  try {
    let { mobile, otp, role: requestedRole } = req.body;

    // Normalize role so "client" / "Client" both work
    const normalizedRole = normalizeRole(requestedRole);

    const otpRecord = await OTP.findOne({ mobile, otp });

    if (!otpRecord) {
      throw new ApiError("Invalid OTP", httpStatus.BAD_REQUEST);
    }

    if (otpRecord.expiresAt < Date.now()) {
      throw new ApiError("OTP expired", httpStatus.BAD_REQUEST);
    }

    let account = null;
    let role = null;
    let accountName = null;
    let accountEmail = null;

    // Phone variants for flexible lookup (Admin stores "9876543210", login sends "+919876543210")
    const phoneVariants = getPhoneLookupVariants(mobile);
    const consultantPhoneOr = phoneVariants.flatMap((v) => [{ phone: v }, { mobile: v }]);
    const clientMobileOr = phoneVariants.map((v) => ({ mobile: v }));

    // If role is specified, only check that specific model (use normalized role for case-insensitive match)
    if (normalizedRole === 'Consultant') {
      // Check Consultant model only
      const Consultant = require("../../../models/consultant.model").Consultant;
      account = await Consultant.findOne({ $or: consultantPhoneOr });

      if (account) {
        role = "Consultant";
        accountName = account.name || account.fullName || `${account.firstName} ${account.lastName}`.trim();
        accountEmail = account.email;
      }
    } else if (normalizedRole === 'Client') {
      // Check Client model only - never fall through to Consultant when user selected Client
      const Client = require("../../../models/client.model");
      account = await Client.findOne({ $or: clientMobileOr });

      if (account) {
        role = "Client";
        accountName = account.fullName;
        accountEmail = account.email;
      }
    } else if (normalizedRole === 'Admin' || normalizedRole === 'Employee') {
      // Check User model (Admin/Employee)
      account = await User.findOne({ $or: clientMobileOr });

      if (account) {
        role = account.role;
        accountName = account.fullName;
        accountEmail = account.email;
      }
    } else {
      // No role specified - check Client FIRST, then Consultant (fixes: Client selected but role not sent → was returning Consultant)
      const Client = require("../../../models/client.model");
      const Consultant = require("../../../models/consultant.model").Consultant;

      account = await Client.findOne({ $or: clientMobileOr });
      if (account) {
        role = "Client";
        accountName = account.fullName;
        accountEmail = account.email;
      } else {
        account = await Consultant.findOne({ $or: consultantPhoneOr });
        if (account) {
          role = "Consultant";
          accountName = account.name || account.fullName || `${account.firstName} ${account.lastName}`.trim();
          accountEmail = account.email;
        }
      }
    }

    if (account) {
      // Check if account is active
      if (account.status && account.status !== 'Active') {
        if (account.status === 'Pending') {
          throw new ApiError("Your account is pending approval.", httpStatus.FORBIDDEN);
        } else if (account.status === 'Rejected') {
          throw new ApiError("Your account application has been rejected.", httpStatus.FORBIDDEN);
        } else if (account.status === 'Blocked') {
          throw new ApiError("Your account has been blocked by the administrator.", httpStatus.FORBIDDEN);
        }
        // For other non-Active statuses (Inactive, Archived, etc.)
        throw new ApiError("Account is inactive. Please contact administrator.", httpStatus.FORBIDDEN);
      }

      // Update lastLogin - use updateOne to avoid validation issues with related User references
      const modelName = account.constructor.modelName;

      if (modelName === 'Consultant') {
        const Consultant = require("../../../models/consultant.model").Consultant;
        await Consultant.updateOne({ _id: account._id }, { lastLogin: new Date() });
      } else if (modelName === 'Client') {
        const Client = require("../../../models/client.model");
        await Client.updateOne({ _id: account._id }, { lastLogin: new Date() });
      } else {
        // For User model (Admin/Employee), save normally
        account.lastLogin = new Date();
        await account.save();
      }

      const token = account.generateAuthToken();

      await OTP.deleteOne({ _id: otpRecord._id });

      return sendSuccess(res, SUCCESS.LOGIN_SUCCESS, {
        token,
        user: {
          id: account._id,
          name: accountName,
          email: accountEmail,
          role: role,
          mobile: mobile,
          avatar: account.avatar || account.image || account.profileImage || "",
          image: account.image || account.avatar || account.profileImage || "",
          profileImage: account.profileImage || account.avatar || account.image || ""
        },
        isNewUser: false
      });
    } else {
      const registrationToken = jwt.sign(
        { mobile },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      await OTP.deleteOne({ _id: otpRecord._id });

      return sendSuccess(res, "OTP verified. Please complete registration.", {
        registrationToken,
        isNewUser: true
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, mobile, otp, role: requestedRole } = req.body;

    // Normalize role for case-insensitive matching
    const normalizedRole = normalizeRole(requestedRole);

    // 1. Check if login is via OTP (mobile + otp) -> Existing Logic
    if (otp && mobile) {
      // Reuse verifyOtp logic or call it? verifyOtp is an endpoint.
      // It's better to guide frontend to call verifyOtp for OTP login.
      // But if we want a unified login endpoint:
      // For now, let's keep OTP login separate via verifyOtp endpoint as implemented before.
      // If frontend calls login with password:
    }

    // 2. Password Login
    if (!email || !password) {
      throw new ApiError("Please provide an email and password", httpStatus.BAD_REQUEST);
    }

    // Check for user in all collections (or specific based on role)
    // Use requestedRole to determine lookup order so Client/Consultant with same email get correct role
    let user;
    let role;

    const Consultant = require("../../../models/consultant.model").Consultant;
    const Client = require("../../../models/client.model");
    const emailLower = email.toLowerCase();

    // Lookup order based on normalizedRole (Client first vs Consultant first)
    if (normalizedRole === "Client") {
      user = await Client.findOne({ email: emailLower }).select("+password");
      if (user) role = "Client";
      if (!user) {
        user = await Consultant.findOne({ email: emailLower }).select("+password");
        if (user) role = "Consultant";
      }
      if (!user) {
        user = await User.findOne({ email: emailLower }).select("+password");
        if (user) role = user.role;
      }
    } else if (normalizedRole === "Consultant") {
      user = await Consultant.findOne({ email: emailLower }).select("+password");
      if (user) role = "Consultant";
      if (!user) {
        user = await Client.findOne({ email: emailLower }).select("+password");
        if (user) role = "Client";
      }
      if (!user) {
        user = await User.findOne({ email: emailLower }).select("+password");
        if (user) role = user.role;
      }
    } else if (!normalizedRole) {
      // No role specified - check Client first, then Consultant, then User (fixes Client selection returning Consultant)
      user = await Client.findOne({ email: emailLower }).select("+password");
      if (user) role = "Client";
      if (!user) {
        user = await Consultant.findOne({ email: emailLower }).select("+password");
        if (user) role = "Consultant";
      }
      if (!user) {
        user = await User.findOne({ email: emailLower }).select("+password");
        if (user) role = user.role;
      }
    } else {
      // normalizedRole is Admin/Employee - only check User
      user = await User.findOne({ email: emailLower }).select("+password");
      if (user) role = user.role;
    }

    // Enforce role match if role was provided (reject when user selected Client but account is Consultant, or vice versa)
    if (normalizedRole && user && role !== normalizedRole) {
      throw new ApiError("Invalid credentials or role mismatch", httpStatus.UNAUTHORIZED);
    }

    if (!user) {
      throw new ApiError("Invalid credentials", httpStatus.UNAUTHORIZED);
    }

    // Verify Password
    // Verify Password
    if (!user.password) {
      throw new ApiError("Password not set. Please login via OTP.", httpStatus.UNAUTHORIZED);
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      throw new ApiError("Invalid credentials", httpStatus.UNAUTHORIZED);
    }

    // Check Status
    if (user.status && user.status !== 'Active') {
      if (user.status === 'Pending') throw new ApiError("Account pending approval", httpStatus.FORBIDDEN);
      if (user.status === 'Rejected') throw new ApiError("Account rejected", httpStatus.FORBIDDEN);
      if (user.status === 'Blocked') throw new ApiError("Account blocked", httpStatus.FORBIDDEN);
      throw new ApiError("Account inactive", httpStatus.FORBIDDEN);
    }

    // Update Last Login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = user.generateAuthToken();

    return sendSuccess(res, SUCCESS.LOGIN_SUCCESS, {
      token,
      user: {
        id: user._id,
        name: user.name || user.fullName,
        email: user.email,
        role: role,
        mobile: user.mobile || user.phone,
        avatar: user.avatar || user.image || user.profileImage || ""
      }
    });

  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email, role: requestedRole } = req.body;
    console.log(`[ForgotPassword] Request received for email: ${email}, role: ${requestedRole || 'None'}`);

    const Consultant = require("../../../models/consultant.model").Consultant;
    const Client = require("../../../models/client.model");

    let user = null;
    let userType = null;

    // Normalize role for case-insensitive matching
    const normalizedRole = normalizeRole(requestedRole);

    if (normalizedRole === 'Consultant') {
      user = await Consultant.findOne({ email: email.toLowerCase() });
      userType = user ? 'Consultant' : null;
    } else if (normalizedRole === 'Client') {
      user = await Client.findOne({ email: email.toLowerCase() });
      userType = user ? 'Client' : null;
    } else if (normalizedRole === 'Admin' || normalizedRole === 'Employee') {
      user = await User.findOne({ email: email.toLowerCase() });
      userType = user ? 'User' : null;
    } else {
      // Legacy behavior: Check Consultant -> Client -> User
      user = await Consultant.findOne({ email: email.toLowerCase() });
      userType = user ? 'Consultant' : null;

      if (!user) {
        user = await Client.findOne({ email: email.toLowerCase() });
        userType = user ? 'Client' : null;
      }
      if (!user) {
        user = await User.findOne({ email: email.toLowerCase() });
        userType = user ? 'User' : null;
      }
    }

    // Return error if user does not exist (User Enumeration allowed per requirement)
    if (!user) {
      console.log(`[ForgotPassword] No user found with email: ${email} (Role: ${normalizedRole || 'Any'})`);
      throw new ApiError("Account does not exist with this email and role", httpStatus.NOT_FOUND);
    }

    // Double check if role matches found user type (only relevant if role was unspecified but found user might be wrong type if duplicates exist)
    // Actually, if role IS specified, we only searched that collection, so userType is correct.
    // If role IS NOT specified, we found the first match in priority order.

    console.log(`[ForgotPassword] User found - Type: ${userType}, ID: ${user._id}, Email: ${user.email}`);

    // Get reset token
    const resetToken = user.getResetPasswordToken();
    console.log(`[ForgotPassword] Reset token generated for user: ${user._id}`);

    await user.save({ validateBeforeSave: false });

    // Create reset url
    // Since frontend is separate, we need the frontend URL.
    // Assuming it's in env or we construct it.
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173"; // Fallback dev url
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
    console.log(`[ForgotPassword] Reset URL generated: ${resetUrl}`);

    try {
      // Get user's display name
      const userName = user.fullName || user.name || user.email.split('@')[0];

      console.log(`[ForgotPassword] Sending password reset email to: ${user.email} (User: ${userName})`);

      await sendEmail({
        template: 'reset-password',
        to: user.email,
        subject: 'Reset Your Password',
        data: {
          user_name: userName,
          reset_link: resetUrl,
          expiry_time: '10 minutes',
        },
      });

      console.log(`[ForgotPassword] Password reset email sent successfully to: ${user.email}`);
      return sendSuccess(res, "If an account exists with that email, you will receive a reset link.");
    } catch (err) {
      console.error(`[ForgotPassword] Failed to send email to ${user.email}:`, err.message);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      throw new ApiError("Email could not be sent", httpStatus.INTERNAL_SERVER_ERROR);
    }
  } catch (error) {
    console.error(`[ForgotPassword] Error:`, error.message);
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    console.log(`[ResetPassword] Request received with token: ${req.params.resettoken?.substring(0, 10)}...`);

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const Consultant = require("../../../models/consultant.model").Consultant;
    const Client = require("../../../models/client.model");

    // Check all collections for the token
    let user = await Consultant.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    let userType = user ? 'Consultant' : null;

    if (!user) {
      user = await Client.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
      });
      userType = user ? 'Client' : null;
    }

    if (!user) {
      user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
      });
      userType = user ? 'User' : null;
    }

    if (!user) {
      console.log(`[ResetPassword] Invalid or expired token`);
      throw new ApiError("Invalid token", httpStatus.BAD_REQUEST);
    }

    console.log(`[ResetPassword] Valid token found - Type: ${userType}, User ID: ${user._id}, Email: ${user.email}`);

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();
    console.log(`[ResetPassword] Password updated successfully for user: ${user._id} (${user.email})`);

    const token = user.generateAuthToken();

    return sendSuccess(res, "Password updated", { token });

  } catch (error) {
    console.error(`[ResetPassword] Error:`, error.message);
    next(error);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { registrationToken, fullName, email, role, category, subcategory, categories, fees, password } = req.body;

    let decoded;
    try {
      decoded = jwt.verify(registrationToken, process.env.JWT_SECRET);
    } catch (err) {
      throw new ApiError("Invalid or expired registration session", httpStatus.UNAUTHORIZED);
    }

    let { mobile } = decoded;

    // Mobile number should be in E.164 format
    // mobile = mobile.replace(/\D/g, '');

    if (role === 'Consultant') {
      // Check if consultant already exists
      const existingConsultant = await Consultant.findOne({
        $or: [{ email: email.toLowerCase() }, { phone: mobile }, { mobile: mobile }]
      });

      if (existingConsultant) {
        throw new ApiError("Consultant with this email or mobile already exists", httpStatus.CONFLICT);
      }

      const CategoryModel = require("../../../models/category.model");
      const SubCategoryModel = require("../../../models/subcategory.model");

      // Resolve categories array (multiple categories support)
      let categoriesResolved = [];
      if (Array.isArray(categories) && categories.length > 0) {
        for (const c of categories) {
          const catId = c.categoryId || c.category;
          const subId = c.subcategoryId || c.subcategory;
          let catName = c.categoryName || "General";
          let subName = c.subcategoryName || "";
          if (catId) {
            const catDoc = await CategoryModel.findById(catId);
            if (catDoc) catName = catDoc.title || "General";
          }
          if (subId) {
            const subDoc = await SubCategoryModel.findById(subId);
            if (subDoc) subName = subDoc.title || "";
          }
          categoriesResolved.push({
            categoryId: catId,
            categoryName: catName,
            subcategoryId: subId,
            subcategoryName: subName,
          });
        }
      }

      // Primary category/subcategory (backward compat) - from categories[0] or single category/subcategory
      let categoryName = "General";
      let subcategoryName = "";
      if (categoriesResolved.length > 0) {
        categoryName = categoriesResolved[0].categoryName;
        subcategoryName = categoriesResolved[0].subcategoryName || "";
      } else if (category) {
        const categoryDoc = await CategoryModel.findById(category);
        if (categoryDoc) categoryName = categoryDoc.title || "General";
        if (subcategory) {
          const subDoc = await SubCategoryModel.findById(subcategory);
          if (subDoc) subcategoryName = subDoc.title || "";
        }
      }

      // Create Consultant directly
      const createPayload = {
        name: fullName,
        email: email.toLowerCase(),
        phone: mobile,
        mobile: mobile,
        category: { name: categoryName, description: "", imageUrl: "" },
        subcategory: { name: subcategoryName, description: "", imageUrl: "" },
        status: "Pending",
        fees: fees || 0,
        currency: req.body.currency,
        password: password
      };
      if (categoriesResolved.length > 0) {
        createPayload.categories = categoriesResolved;
      }
      const newConsultant = await Consultant.create(createPayload);

      // Notify Admins about new registration
      try {
        const NotificationService = require("../../../services/notificationService");
        await NotificationService.notifyRole("Admin", {
          name: "New Consultant Registration",
          message: `${fullName} has registered as a consultant and is pending approval.`,
          type: "registration",
          category: "system",
          priority: "high",
          actionUrl: "/consultants",
          actionLabel: "Review"
        });
      } catch (notifErr) {
        console.error("Failed to create registration notification:", notifErr);
      }

      const token = newConsultant.generateAuthToken();

      return sendSuccess(res, SUCCESS.USER_CREATED, {
        token,
        user: {
          id: newConsultant._id,
          name: newConsultant.name || fullName,
          email: newConsultant.email,
          role: 'Consultant',
          mobile: newConsultant.mobile || newConsultant.phone,
        }
      }, httpStatus.CREATED);

    } else if (role === 'Client') {
      // Check if client already exists
      const Client = require("../../../models/client.model");
      const existingClient = await Client.findOne({
        $or: [{ email: email.toLowerCase() }, { mobile: mobile }]
      });

      if (existingClient) {
        throw new ApiError("Client with this email or mobile already exists", httpStatus.CONFLICT);
      }

      // Create Client directly
      const newClient = await Client.create({
        fullName,
        email: email.toLowerCase(),
        mobile: mobile,
        status: 'Active',
        password: password
      });

      // Notify Admins about new client registration
      try {
        const NotificationService = require("../../../services/notificationService");
        await NotificationService.notifyRole("Admin", {
          name: "New Client Registration",
          message: `${fullName} has registered as a client.`,
          type: "registration",
          category: "system",
          actionUrl: "/clients",
          actionLabel: "View"
        });
      } catch (notifErr) {
        console.error("Failed to create registration notification:", notifErr);
      }

      const token = newClient.generateAuthToken();

      return sendSuccess(res, SUCCESS.USER_CREATED, {
        token,
        user: {
          id: newClient._id,
          name: newClient.fullName,
          email: newClient.email,
          role: 'Client',
          mobile: newClient.mobile,
        }
      }, httpStatus.CREATED);

    } else {
      throw new ApiError("Invalid role. Only Consultant and Client can register.", httpStatus.BAD_REQUEST);
    }

  } catch (error) {
    next(error);
  }
};

exports.signup = async (req, res, next) => {
  try {
    const { fullName, email, mobile, role, category, subcategory, categories, fees, password } = req.body;

    // Validate role
    if (role !== 'Client' && role !== 'Consultant') {
      throw new ApiError("Role must be either Client or Consultant", httpStatus.BAD_REQUEST);
    }

    // Mobile number should be in E.164 format
    const normalizedMobile = mobile;

    if (role === 'Consultant') {
      // Check if consultant already exists
      const Consultant = require("../../../models/consultant.model").Consultant;
      const CategoryModel = require("../../../models/category.model");
      const SubCategoryModel = require("../../../models/subcategory.model");
      const existingConsultant = await Consultant.findOne({
        $or: [{ email: email.toLowerCase() }, { phone: normalizedMobile }, { mobile: normalizedMobile }]
      });

      if (existingConsultant) {
        throw new ApiError("Consultant with this email or mobile already exists", httpStatus.CONFLICT);
      }

      // Resolve categories array (multiple categories support)
      let categoriesResolved = [];
      if (Array.isArray(categories) && categories.length > 0) {
        for (const c of categories) {
          const catId = c.categoryId || c.category;
          const subId = c.subcategoryId || c.subcategory;
          let catName = c.categoryName || "General";
          let subName = c.subcategoryName || "";
          if (catId) {
            const catDoc = await CategoryModel.findById(catId);
            if (catDoc) catName = catDoc.title || "General";
          }
          if (subId) {
            const subDoc = await SubCategoryModel.findById(subId);
            if (subDoc) subName = subDoc.title || "";
          }
          categoriesResolved.push({
            categoryId: catId,
            categoryName: catName,
            subcategoryId: subId,
            subcategoryName: subName,
          });
        }
      }

      // Primary category/subcategory (from categories[0] or single category/subcategory)
      let categoryData = { name: 'General', description: '', imageUrl: '' };
      let subcategoryData = { name: '', description: '', imageUrl: '' };
      if (categoriesResolved.length > 0) {
        categoryData = { name: categoriesResolved[0].categoryName, description: '', imageUrl: '' };
        subcategoryData = { name: categoriesResolved[0].subcategoryName || '', description: '', imageUrl: '' };
      } else if (category || subcategory) {
        if (category) {
          if (typeof category === 'object') {
            categoryData = { name: category.name || 'General', description: category.description || '', imageUrl: category.imageUrl || '' };
          } else if (typeof category === 'string') {
            const objectIdPattern = /^[0-9a-fA-F]{24}$/;
            if (objectIdPattern.test(category)) {
              const catDoc = await CategoryModel.findById(category);
              if (catDoc) categoryData = { name: catDoc.title, description: catDoc.description || '', imageUrl: catDoc.image || '' };
            } else {
              categoryData = { name: category, description: '', imageUrl: '' };
            }
          }
        }
        if (subcategory) {
          if (typeof subcategory === 'object') {
            subcategoryData = { name: subcategory.name || '', description: subcategory.description || '', imageUrl: subcategory.imageUrl || '' };
          } else if (typeof subcategory === 'string') {
            const objectIdPattern = /^[0-9a-fA-F]{24}$/;
            if (objectIdPattern.test(subcategory)) {
              const subDoc = await SubCategoryModel.findById(subcategory);
              if (subDoc) subcategoryData = { name: subDoc.title, description: subDoc.description || '', imageUrl: subDoc.image || '' };
            } else {
              subcategoryData = { name: subcategory, description: '', imageUrl: '' };
            }
          }
        }
      }

      const now = new Date();
      const createPayload = {
        name: fullName,
        email: email.toLowerCase(),
        phone: normalizedMobile,
        mobile: normalizedMobile,
        category: categoryData,
        subcategory: subcategoryData,
        status: 'Pending',
        fees: fees || 0,
        currency: req.body.currency,
        password: password,
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
      };
      if (categoriesResolved.length > 0) {
        createPayload.categories = categoriesResolved;
      }

      const newConsultant = await Consultant.create(createPayload);

      // Notify Admins about new consultant signup
      try {
        const NotificationService = require("../../../services/notificationService");
        await NotificationService.notifyRole("Admin", {
          name: "New Consultant Signup",
          message: `${fullName} has signed up as a consultant and is pending approval.`,
          type: "registration",
          category: "system",
          priority: "high",
          actionUrl: "/consultants",
          actionLabel: "Review"
        });
      } catch (notifErr) {
        console.error("Failed to create registration notification:", notifErr);
      }

      const token = newConsultant.generateAuthToken();

      return sendSuccess(res, SUCCESS.USER_CREATED, {
        token,
        user: {
          id: newConsultant._id,
          name: newConsultant.name || fullName,
          email: newConsultant.email,
          role: 'Consultant',
          mobile: newConsultant.mobile || newConsultant.phone,
        }
      }, httpStatus.CREATED);

    } else {
      // Client Signup Logic (Existing)
      const Client = require("../../../models/client.model");
      const existingClient = await Client.findOne({
        $or: [{ email: email.toLowerCase() }, { mobile: normalizedMobile }]
      });

      if (existingClient) {
        throw new ApiError("Client with this email or mobile already exists", httpStatus.CONFLICT);
      }

      const now = new Date();
      const newClient = await Client.create({
        fullName,
        email: email.toLowerCase(),
        mobile: normalizedMobile,
        status: 'Active',
        password: password,
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
      });

      // Notify Admins about new client signup
      try {
        const NotificationService = require("../../../services/notificationService");
        await NotificationService.notifyRole("Admin", {
          name: "New Client Signup",
          message: `${fullName} has signed up as a client.`,
          type: "registration",
          category: "system",
          actionUrl: "/clients",
          actionLabel: "View"
        });
      } catch (notifErr) {
        console.error("Failed to create registration notification:", notifErr);
      }

      const token = newClient.generateAuthToken();

      return sendSuccess(res, SUCCESS.USER_CREATED, {
        token,
        user: {
          id: newClient._id,
          name: newClient.fullName,
          email: newClient.email,
          role: 'Client',
          mobile: newClient.mobile,
        }
      }, httpStatus.CREATED);
    }

  } catch (error) {
    next(error);
  }
};