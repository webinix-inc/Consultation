const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const socialSchema = new mongoose.Schema(
  {
    website: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    twitter: { type: String, default: "" },
    instagram: { type: String, default: "" },
    facebook: { type: String, default: "" },
  },
  { _id: false, strict: false }
);

const crypto = require("crypto");
const educationSchema = new mongoose.Schema(
  {
    institute: { type: String, default: "" },
    qualification: { type: String, default: "" },
    startYear: { type: String, default: "" },
    endYear: { type: String, default: "" },
    year: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: false }
);

const experienceSchema = new mongoose.Schema(
  {
    company: { type: String, default: "" },
    role: { type: String, default: "" },
    startYear: { type: String, default: "" },
    endYear: { type: String, default: "" },
    years: { type: String, default: "" },
    year: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: false }
);

const awardSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    year: { type: String, default: "" },
    desc: { type: String, default: "" },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const appointmentSummarySchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    date: { type: Date },
    duration: { type: Number },
    status: { type: String },
    fees: { type: Number },
  },
  { _id: false }
);

const ratingBreakdownSchema = new mongoose.Schema(
  {
    rating: { type: Number, min: 1, max: 5 },
    count: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const consultantSchema = new mongoose.Schema(
  {
    // Link to User account (optional - only for backward compatibility)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true, // Allow null for backward compatibility
    },

    // Basic identity
    name: { type: String, trim: true },
    firstName: { type: String, trim: true, default: "" },
    lastName: { type: String, trim: true, default: "" },
    displayName: { type: String, trim: true, default: "" },

    // Authentication fields (required for Consultant)
    email: {
      type: String,
      lowercase: true,
      unique: true,
      required: true,
      trim: true,
    },
    phone: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true }, // Alias for phone, for consistency
    alternatePhone: { type: String, trim: true, default: "" },


    // OTP Fields
    otp: { type: String },
    otpExpires: { type: Date },

    // Password & Recovery
    password: {
      type: String,
      select: false
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    lastLogin: { type: Date },

    // Professional
    category: {
      name: { type: String, required: true },
      description: { type: String, default: "" },
      imageUrl: { type: String, default: "" },
    },
    subcategory: {
      name: { type: String, default: "" },
      description: { type: String, default: "" },
      imageUrl: { type: String, default: "" },
    },
    tags: {
      type: [String],
      default: [],
      set(value) {
        if (Array.isArray(value)) {
          return value.filter(Boolean).map((tag) => tag.trim());
        }
        if (typeof value === "string") {
          return value
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean);
        }
        return [];
      },
    },
    regNo: { type: String, default: "" },
    fees: { type: Number, default: 0 },
    gender: { type: String, default: "" },
    yearsOfExperience: { type: Number, min: 0, default: 0 },
    bioTitle: { type: String, trim: true, default: "" },

    // Profile
    languages: {
      type: [String],
      default: [],
      set(value) {
        if (Array.isArray(value)) {
          return value.filter(Boolean).map((lang) => lang.trim());
        }
        if (typeof value === "string") {
          return value
            .split(",")
            .map((lang) => lang.trim())
            .filter(Boolean);
        }
        return [];
      },
    },
    about: { type: String, default: "" },
    image: { type: String, default: "" },

    socials: { type: socialSchema, default: () => ({}) },

    // Address
    address: { type: String, default: "" },
    country: { type: String, default: "" },
    state: { type: String, default: "" },
    city: { type: String, default: "" },
    pincode: { type: String, default: "" },

    // Structured resume sections
    education: { type: [educationSchema], default: [] },
    experiences: { type: [experienceSchema], default: [] },
    awards: { type: [awardSchema], default: [] },

    // Business commission/settings
    commission: {
      platformPercent: { type: Number, default: 0 },
      minDurationMin: { type: Number, default: 30 },
      maxDurationMin: { type: Number, default: 180 },
      cancellationWindowHours: { type: Number, default: 24 },
    },

    // Client info & stats for analytics and profile cards
    clientInfo: {
      totalClients: { type: Number, default: 0 },
      totalAppointments: { type: Number, default: 0 },
      completedAppointments: { type: Number, default: 0 },
      avgRating: { type: Number, default: 0 },
      responseTimeHours: { type: Number, default: 0 },
    },
    ratingSummary: {
      totalReviews: { type: Number, default: 0 },
      average: { type: Number, default: 0 },
      breakdown: { type: [ratingBreakdownSchema], default: [] },
      lastReviewAt: { type: Date },
    },
    reviews: { type: [reviewSchema], default: [] },

    appointmentsSnapshot: {
      upcoming: { type: [appointmentSummarySchema], default: [] },
      past: { type: [appointmentSummarySchema], default: [] },
      lastSyncedAt: { type: Date },
    },

    // Stats
    clients: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Approved", "Active", "Pending", "Rejected", "Blocked", "Inactive"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

consultantSchema.virtual("fullName").get(function getFullName() {
  if (this.displayName) return this.displayName;
  if (this.name) return this.name;
  return `${this.firstName || ""} ${this.lastName || ""}`.trim();
});

consultantSchema.pre("save", async function (next) {
  // Derive name if not set
  if (!this.name) {
    this.name = this.fullName || `${this.firstName} ${this.lastName}`.trim();
  }
  if (!this.displayName && this.fullName) {
    this.displayName = this.fullName;
  }

  // Sync phone and mobile fields
  if (this.phone && !this.mobile) {
    this.mobile = this.phone;
  }
  if (this.mobile && !this.phone) {
    this.phone = this.mobile;
  }



  next();
});

// Encrypt password using bcrypt
// Encrypt password using bcrypt
consultantSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Match user entered password to hashed password in database
consultantSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
consultantSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};


// Generate JWT token
consultantSchema.methods.generateAuthToken = function () {
  const jwt = require("jsonwebtoken");
  return jwt.sign(
    { id: this._id, email: this.email, role: "Consultant" },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    }
  );
};

const Consultant = mongoose.model("Consultant", consultantSchema);

const Joi = require("joi");

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const educationItem = Joi.object({
  institute: Joi.string().allow("").max(150).optional(),
  qualification: Joi.string().allow("").max(120).optional(),
  startYear: Joi.string().allow("").max(20).optional(),
  endYear: Joi.string().allow("").max(20).optional(),
  year: Joi.string().allow("").max(20).optional(),
  description: Joi.string().allow("").max(400).optional(),
});

const experienceItem = Joi.object({
  company: Joi.string().allow("").max(150).optional(),
  role: Joi.string().allow("").max(120).optional(),
  startYear: Joi.string().allow("").max(20).optional(),
  endYear: Joi.string().allow("").max(20).optional(),
  years: Joi.string().allow("").max(20).optional(),
  year: Joi.string().allow("").max(20).optional(),
  description: Joi.string().allow("").max(400).optional(),
});

const awardItem = Joi.object({
  title: Joi.string().allow("").max(150).optional(),
  year: Joi.string().allow("").max(20).optional(),
  desc: Joi.string().allow("").max(400).optional(),
});

const socialItem = Joi.object({
  website: Joi.string().uri().allow("").optional(),
  linkedin: Joi.string().uri().allow("").optional(),
  twitter: Joi.string().uri().allow("").optional(),
  facebook: Joi.string().uri().allow("").optional(),
  instagram: Joi.string().uri().allow("").optional(),
});

const languagesField = Joi.alternatives().try(
  Joi.array().items(Joi.string().max(40)),
  Joi.string().allow("").max(400)
);

const tagsField = Joi.alternatives().try(
  Joi.array().items(Joi.string().max(40)),
  Joi.string().allow("").max(400)
);

const createConsultantSchema = Joi.object({
  // Accept either a single name or first+last
  name: Joi.string().min(2).max(100).optional(),
  firstName: Joi.string().allow("").max(100).optional(),
  lastName: Joi.string().allow("").max(100).optional(),
  displayName: Joi.string().allow("").max(120).optional(),

  email: Joi.string().email().required(),
  phone: Joi.string().min(6).max(30).required(),
  mobile: Joi.string().min(6).max(30).optional(), // Optional, will sync with phone
  alternatePhone: Joi.string().allow("").max(30).optional(),
  category: Joi.alternatives().try(
    Joi.object({
      name: Joi.string().required(),
      description: Joi.string().allow("").optional(),
      imageUrl: Joi.string().uri().allow("").optional(),
    }),
    Joi.string().required()
  ).required(),
  subcategory: Joi.alternatives().try(
    Joi.object({
      name: Joi.string().allow("").optional(),
      description: Joi.string().allow("").optional(),
      imageUrl: Joi.string().uri().allow("").optional(),
    }),
    Joi.string().allow("").optional()
  ).optional(),

  regNo: Joi.string().allow("").max(120).optional(),
  fees: Joi.number().min(0).optional(),
  gender: Joi.string().allow("").max(30).optional(),
  yearsOfExperience: Joi.number().min(0).optional(),
  bioTitle: Joi.string().allow("").max(150).optional(),



  languages: languagesField.optional(),
  about: Joi.string().allow("").max(2000).optional(),
  image: Joi.string().uri().allow("").optional(),
  socials: socialItem.optional(),

  address: Joi.string().allow("").max(200).optional(),
  country: Joi.string().allow("").max(80).optional(),
  state: Joi.string().allow("").max(80).optional(),
  city: Joi.string().allow("").max(80).optional(),
  pincode: Joi.string().allow("").max(20).optional(),

  tags: tagsField.optional(),

  // Structured arrays
  education: Joi.array().items(educationItem).optional(),
  experiences: Joi.array().items(experienceItem).optional(),
  awards: Joi.array().items(awardItem).optional(),

  // Business commission/settings
  commission: Joi.object({
    platformPercent: Joi.number().min(0).max(100).optional(),
    minDurationMin: Joi.number().min(0).optional(),
    maxDurationMin: Joi.number().min(0).optional(),
    cancellationWindowHours: Joi.number().min(0).optional(),
  }).optional(),

  clients: Joi.number().min(0).optional(),
  status: Joi.string().valid("Active", "Pending", "Inactive", "Archived").optional(),
}).custom((obj, helpers) => {
  // Require either name or (firstName and lastName)
  if (!obj.name && !(obj.firstName && obj.lastName)) {
    return helpers.error("any.custom", { message: "Provide either name or firstName and lastName" });
  }
  return obj;
}, "name validation");

const updateConsultantSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  firstName: Joi.string().allow("").max(100).optional(),
  lastName: Joi.string().allow("").max(100).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().min(6).max(30).optional(),
  alternatePhone: Joi.string().allow("").max(30).optional(),
  displayName: Joi.string().allow("").max(120).optional(),
  category: Joi.alternatives().try(
    Joi.object({
      name: Joi.string().optional(),
      description: Joi.string().allow("").optional(),
      imageUrl: Joi.string().uri().allow("").optional(),
    }),
    Joi.string().allow("").optional()
  ).optional(),
  subcategory: Joi.alternatives().try(
    Joi.object({
      name: Joi.string().allow("").optional(),
      description: Joi.string().allow("").optional(),
      imageUrl: Joi.string().uri().allow("").optional(),
    }),
    Joi.string().allow("").optional()
  ).optional(),
  regNo: Joi.string().allow("").max(120).optional(),
  fees: Joi.number().min(0).optional(),
  gender: Joi.string().allow("").max(30).optional(),
  yearsOfExperience: Joi.number().min(0).optional(),
  bioTitle: Joi.string().allow("").max(150).optional(),

  languages: languagesField.optional(),
  about: Joi.string().allow("").max(2000).optional(),
  image: Joi.string().uri().allow("").optional(),
  socials: socialItem.optional(),

  address: Joi.string().allow("").max(200).optional(),
  country: Joi.string().allow("").max(80).optional(),
  state: Joi.string().allow("").max(80).optional(),
  city: Joi.string().allow("").max(80).optional(),
  pincode: Joi.string().allow("").max(20).optional(),

  tags: tagsField.optional(),

  education: Joi.array().items(educationItem).optional(),
  experiences: Joi.array().items(experienceItem).optional(),
  awards: Joi.array().items(awardItem).optional(),

  commission: Joi.object({
    platformPercent: Joi.number().min(0).max(100).optional(),
    minDurationMin: Joi.number().min(0).optional(),
    maxDurationMin: Joi.number().min(0).optional(),
    cancellationWindowHours: Joi.number().min(0).optional(),
  }).optional(),

  clients: Joi.number().min(0).optional(),
  status: Joi.string().valid("Active", "Pending", "Inactive", "Archived").optional(),
}).min(1);

const consultantIdSchema = Joi.object({
  id: Joi.string().pattern(objectIdPattern).required(),
});

module.exports = {
  Consultant,
  createConsultantSchema,
  updateConsultantSchema,
  consultantIdSchema,
};