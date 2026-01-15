const User = require("../../../models/user.model");
const OTP = require("../../../models/otp.model");
const sendEmail = require("../../../jobs/email.job");
const { sendSuccess, sendError, ApiError } = require("../../../utils/response");
const { SUCCESS, ERROR } = require("../../../constants/messages");
const httpStatus = require("../../../constants/httpStatus");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Consultant } = require("../../../models/consultant.model");



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

    // Normalize mobile number: strip all non-digit characters
    mobile = mobile.replace(/\D/g, '');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.findOneAndUpdate(
      { mobile },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    console.log(`🔐 OTP for ${mobile}: ${otp}`);

    return sendSuccess(res, "OTP sent successfully", { otp });
  } catch (error) {
    next(error);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    let { mobile, otp, role: requestedRole } = req.body;

    // Normalize mobile number: strip all non-digit characters
    mobile = mobile.replace(/\D/g, '');

    console.log(`🔍 Verifying OTP - Mobile: ${mobile}, OTP: ${otp}, Requested Role: ${requestedRole || 'Any'}`);

    const otpRecord = await OTP.findOne({ mobile, otp });

    console.log(`🔍 OTP Record found:`, otpRecord);

    if (!otpRecord) {
      const anyOtpForMobile = await OTP.findOne({ mobile });
      console.log(`🔍 Any OTP for mobile ${mobile}:`, anyOtpForMobile);

      throw new ApiError("Invalid OTP", httpStatus.BAD_REQUEST);
    }

    if (otpRecord.expiresAt < Date.now()) {
      throw new ApiError("OTP expired", httpStatus.BAD_REQUEST);
    }

    let account = null;
    let role = null;
    let accountName = null;
    let accountEmail = null;

    // If role is specified, only check that specific model
    if (requestedRole === 'Consultant') {
      // Check Consultant model only
      const Consultant = require("../../../models/consultant.model").Consultant;
      account = await Consultant.findOne({
        $or: [
          { phone: mobile },
          { mobile: mobile }
        ]
      });

      if (account) {
        role = "Consultant";
        accountName = account.name || account.fullName || `${account.firstName} ${account.lastName}`.trim();
        accountEmail = account.email;
      }
    } else if (requestedRole === 'Client') {
      // Check Client model only
      const Client = require("../../../models/client.model");
      account = await Client.findOne({ mobile });

      if (account) {
        role = "Client";
        accountName = account.fullName;
        accountEmail = account.email;
      }
    } else if (requestedRole === 'Admin' || requestedRole === 'Employee') {
      // Check User model (Admin/Employee)
      account = await User.findOne({ mobile });

      if (account) {
        if (account.role !== requestedRole) {
          // If user exists but role mismatch, we might want to reject or just handle it
          // For now, let's just respect the found user's role
        }
        role = account.role;
        accountName = account.fullName;
        accountEmail = account.email;
      }
    } else {
      // No role specified - check all models (backward compatibility)
      // Check User model (Admin/Employee) - but skip for this portal
      // Check Consultant model
      const Consultant = require("../../../models/consultant.model").Consultant;
      account = await Consultant.findOne({
        $or: [
          { phone: mobile },
          { mobile: mobile }
        ]
      });

      if (account) {
        role = "Consultant";
        accountName = account.name || account.fullName || `${account.firstName} ${account.lastName}`.trim();
        accountEmail = account.email;
      } else {
        // Check Client model
        const Client = require("../../../models/client.model");
        account = await Client.findOne({ mobile });

        if (account) {
          role = "Client";
          accountName = account.fullName;
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
    // To support unified login, we might need to check multiple.

    let user;
    let role;

    // Check Consultant
    const Consultant = require("../../../models/consultant.model").Consultant;
    user = await Consultant.findOne({ email: email.toLowerCase() }).select("+password");
    if (user) {
      role = "Consultant";
    }

    // Check Client if not found
    if (!user) {
      const Client = require("../../../models/client.model");
      user = await Client.findOne({ email: email.toLowerCase() }).select("+password");
      if (user) {
        role = "Client";
      }
    }

    // Check Admin/User if not found
    if (!user) {
      user = await User.findOne({ email: email.toLowerCase() }).select("+password");
      if (user) {
        role = user.role; // Admin or Employee
      }
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
    const { email } = req.body;
    const Consultant = require("../../../models/consultant.model").Consultant;
    const Client = require("../../../models/client.model");

    let user = await Consultant.findOne({ email: email.toLowerCase() });
    if (!user) user = await Client.findOne({ email: email.toLowerCase() });
    if (!user) user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      throw new ApiError("There is no user with that email", httpStatus.NOT_FOUND);
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset url
    // Since frontend is separate, we need the frontend URL.
    // Assuming it's in env or we construct it.
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173"; // Fallback dev url
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password Reset Token",
        message, // Use simple message or HTML template if available
        html: `
        <h1>Password Reset Request</h1>
        <p>You requested a password reset. Please click the link below to reset your password:</p>
        <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
        <p>This link will expire in 10 minutes.</p>
        `
      });

      return sendSuccess(res, "Email sent", { data: "Email sent" });
    } catch (err) {
      console.error(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      throw new ApiError("Email could not be sent", httpStatus.INTERNAL_SERVER_ERROR);
    }
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
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

    if (!user) {
      user = await Client.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
      });
    }

    if (!user) {
      user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
      });
    }

    if (!user) {
      throw new ApiError("Invalid token", httpStatus.BAD_REQUEST);
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    const token = user.generateAuthToken();

    return sendSuccess(res, "Password updated", { token });

  } catch (error) {
    next(error);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { registrationToken, fullName, email, role, category, subcategory, fees, password } = req.body;

    let decoded;
    try {
      decoded = jwt.verify(registrationToken, process.env.JWT_SECRET);
    } catch (err) {
      throw new ApiError("Invalid or expired registration session", httpStatus.UNAUTHORIZED);
    }

    let { mobile } = decoded;

    // Normalize mobile number: strip all non-digit characters
    mobile = mobile.replace(/\D/g, '');

    if (role === 'Consultant') {
      // Check if consultant already exists
      const existingConsultant = await Consultant.findOne({
        $or: [{ email: email.toLowerCase() }, { phone: mobile }, { mobile: mobile }]
      });

      if (existingConsultant) {
        throw new ApiError("Consultant with this email or mobile already exists", httpStatus.CONFLICT);
      }

      // Get category name if category is an ObjectId
      let categoryName = 'General';
      if (category) {
        const Category = require("../../../models/category.model");
        const categoryDoc = await Category.findById(category);
        if (categoryDoc) {
          categoryName = categoryDoc.title || 'General';
        }
      }

      // Create Consultant directly
      const newConsultant = await Consultant.create({
        name: fullName,
        email: email.toLowerCase(),
        phone: mobile,
        mobile: mobile,
        category: categoryName,
        status: 'Pending',
        fees: fees || 0,
        password: password
      });

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
    const { fullName, email, mobile, role, category, subcategory, fees, password } = req.body;

    // Validate role
    if (role !== 'Client' && role !== 'Consultant') {
      throw new ApiError("Role must be either Client or Consultant", httpStatus.BAD_REQUEST);
    }

    // Normalize mobile number: strip all non-digit characters
    const normalizedMobile = mobile.replace(/\D/g, '');

    if (role === 'Consultant') {
      // Check if consultant already exists
      const Consultant = require("../../../models/consultant.model").Consultant;
      const existingConsultant = await Consultant.findOne({
        $or: [{ email: email.toLowerCase() }, { phone: normalizedMobile }, { mobile: normalizedMobile }]
      });

      if (existingConsultant) {
        throw new ApiError("Consultant with this email or mobile already exists", httpStatus.CONFLICT);
      }

      // Validate and Normalize Category
      let categoryData = { name: 'General' };
      if (category) {
        if (typeof category === 'object') {
          categoryData = {
            name: category.name || 'General',
            description: category.description || '',
            imageUrl: category.imageUrl || ''
          };
        } else if (typeof category === 'string') {
          const objectIdPattern = /^[0-9a-fA-F]{24}$/;
          if (objectIdPattern.test(category)) {
            try {
              const Category = require("../../../models/category.model");
              const categoryDoc = await Category.findById(category);
              if (categoryDoc) {
                categoryData = {
                  name: categoryDoc.title,
                  description: categoryDoc.description,
                  imageUrl: categoryDoc.image
                };
              }
            } catch (err) { console.error("Category lookup failed", err); }
          } else {
            categoryData = { name: category };
          }
        }
      }

      // Validate and Normalize Subcategory
      let subcategoryData = { name: '' };
      if (subcategory) {
        if (typeof subcategory === 'object') {
          subcategoryData = {
            name: subcategory.name || '',
            description: subcategory.description || '',
            imageUrl: subcategory.imageUrl || ''
          };
        } else if (typeof subcategory === 'string') {
          const objectIdPattern = /^[0-9a-fA-F]{24}$/;
          if (objectIdPattern.test(subcategory)) {
            try {
              const SubCategory = require("../../../models/subcategory.model");
              const subDoc = await SubCategory.findById(subcategory);
              if (subDoc) {
                subcategoryData = {
                  name: subDoc.title,
                  description: subDoc.description,
                  imageUrl: subDoc.image
                };
              }
            } catch (err) { console.error("Subcategory lookup failed", err); }
          } else {
            subcategoryData = { name: subcategory };
          }
        }
      }

      // Create Consultant
      const newConsultant = await Consultant.create({
        name: fullName,
        email: email.toLowerCase(),
        phone: normalizedMobile,
        mobile: normalizedMobile,

        category: categoryData,
        subcategory: subcategoryData,
        status: 'Pending',
        fees: fees || 0,
        password: password
      });

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

      const newClient = await Client.create({
        fullName,
        email: email.toLowerCase(),
        mobile: normalizedMobile,

        status: 'Active',
        password: password
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