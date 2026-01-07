const Joi = require("joi");

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

const educationItem = Joi.object({
  institute: Joi.string().allow("").max(150).optional(),
  qualification: Joi.string().allow("").max(120).optional(),
  year: Joi.string().allow("").max(20).optional(),
  description: Joi.string().allow("").max(400).optional(),
});

const experienceItem = Joi.object({
  company: Joi.string().allow("").max(150).optional(),
  role: Joi.string().allow("").max(120).optional(),
  years: Joi.string().allow("").max(20).optional(),
  year: Joi.string().allow("").max(20).optional(),
  description: Joi.string().allow("").max(400).optional(),
});

const awardItem = Joi.object({
  title: Joi.string().allow("").max(150).optional(),
  year: Joi.string().allow("").max(20).optional(),
  desc: Joi.string().allow("").max(400).optional(),
});

const customRateItem = Joi.object({
  durationMin: Joi.number().min(0).required(),
  rate: Joi.number().min(0).required(),
  label: Joi.string().allow("").max(100).optional(),
});

const documentItem = Joi.object({
  label: Joi.string().allow("").max(150).optional(),
  url: Joi.string().uri().allow("").optional(),
  type: Joi.string().allow("").max(80).optional(),
  verified: Joi.boolean().optional(),
  uploadedAt: Joi.date().optional(),
});

const socialItem = Joi.object({
  website: Joi.string().uri().allow("").optional(),
  linkedin: Joi.string().uri().allow("").optional(),
  twitter: Joi.string().uri().allow("").optional(),
  facebook: Joi.string().uri().allow("").optional(),
  instagram: Joi.string().uri().allow("").optional(),
});

const availabilitySlotItem = Joi.object({
  start: Joi.string().allow("").max(20).optional(),
  end: Joi.string().allow("").max(20).optional(),
  channel: Joi.string().valid("video", "audio", "chat").optional(),
  notes: Joi.string().allow("").max(200).optional(),
});

const weeklyAvailabilityItem = Joi.object({
  day: Joi.string()
    .valid("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")
    .required(),
  isAvailable: Joi.boolean().optional(),
  slots: Joi.array().items(availabilitySlotItem).optional(),
});

const appointmentSummaryItem = Joi.object({
  appointmentId: Joi.string().pattern(objectIdPattern).optional(),
  clientName: Joi.string().allow("").max(150).optional(),
  initials: Joi.string().allow("").max(5).optional(),
  title: Joi.string().allow("").max(150).optional(),
  scheduledFor: Joi.date().optional(),
  durationMinutes: Joi.number().min(0).optional(),
  channel: Joi.string().valid("video", "audio", "chat", "in_person").optional(),
  status: Joi.string().valid("pending", "confirmed", "completed", "cancelled", "no_show").optional(),
  review: Joi.string().allow("").max(1000).optional(),
  rating: Joi.number().min(0).max(5).optional(),
  lastUpdatedAt: Joi.date().optional(),
});

const ratingBreakdownItem = Joi.object({
  star: Joi.number().integer().min(1).max(5).required(),
  count: Joi.number().min(0).optional(),
});

const mediaItem = Joi.object({
  gallery: Joi.array().items(Joi.string().uri()).optional(),
  introVideo: Joi.string().uri().allow("").optional(),
});

const dashboardSettingsItem = Joi.object({
  pinnedSections: Joi.array().items(Joi.string().max(50)).optional(),
  showCommissionCard: Joi.boolean().optional(),
  showAppointmentsCard: Joi.boolean().optional(),
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
  alternatePhone: Joi.string().allow("").max(30).optional(),



  lastLogin: Joi.date().optional(),

  category: Joi.string().min(2).max(100).required(),
  subcategory: Joi.string().allow("").max(100).optional(),
  specialization: Joi.string().allow("").max(100).optional(),
  regNo: Joi.string().allow("").max(120).optional(),
  fees: Joi.number().min(0).optional(),
  gender: Joi.string().allow("").max(30).optional(),
  yearsOfExperience: Joi.number().min(0).optional(),
  bioTitle: Joi.string().allow("").max(150).optional(),

  pricing: Joi.object({
    baseFee: Joi.number().min(0).optional(),
    currency: Joi.string().allow("").max(10).optional(),
    billingType: Joi.string().valid("per_session", "per_hour").optional(),
    discountPercent: Joi.number().min(0).max(100).optional(),
    customRates: Joi.array().items(customRateItem).optional(),
  }).optional(),

  languages: languagesField.optional(),
  about: Joi.string().allow("").max(2000).optional(),
  image: Joi.string().uri().allow("").optional(),
  bannerImage: Joi.string().uri().allow("").optional(),
  media: mediaItem.optional(),
  socials: socialItem.optional(),

  address: Joi.string().allow("").max(200).optional(),
  addressLine2: Joi.string().allow("").max(200).optional(),
  country: Joi.string().allow("").max(80).optional(),
  state: Joi.string().allow("").max(80).optional(),
  city: Joi.string().allow("").max(80).optional(),
  pincode: Joi.string().allow("").max(20).optional(),

  // Legacy/simple fields
  location: Joi.string().allow("").max(120).optional(),
  experience: Joi.string().allow("").max(50).optional(),
  tags: tagsField.optional(),

  // Structured arrays
  education: Joi.array().items(educationItem).optional(),
  experiences: Joi.array().items(experienceItem).optional(),
  awards: Joi.array().items(awardItem).optional(),
  certifications: Joi.array().items(documentItem).optional(),
  documents: Joi.array().items(documentItem).optional(),

  // Business commission/settings
  commission: Joi.object({
    platformPercent: Joi.number().min(0).max(100).optional(),
    minDurationMin: Joi.number().min(0).optional(),
    maxDurationMin: Joi.number().min(0).optional(),
    cancellationWindowHours: Joi.number().min(0).optional(),
    payoutDelayDays: Joi.number().min(0).optional(),
    notes: Joi.string().allow("").max(400).optional(),
    customRates: Joi.array().items(customRateItem).optional(),
  }).optional(),

  appointmentPreferences: Joi.object({
    bookingWindowDays: Joi.number().min(0).optional(),
    minNoticeHours: Joi.number().min(0).optional(),
    bufferMinutes: Joi.number().min(0).optional(),
    allowInstantBooking: Joi.boolean().optional(),
    allowClientReschedule: Joi.boolean().optional(),
    allowClientCancellation: Joi.boolean().optional(),
    allowNotes: Joi.boolean().optional(),
    defaultMeetingLink: Joi.string().uri().allow("").optional(),
  }).optional(),

  availability: Joi.object({
    timezone: Joi.string().allow("").max(60).optional(),
    weekly: Joi.array().items(weeklyAvailabilityItem).optional(),
    blackoutDates: Joi.array().items(Joi.date()).optional(),
    lastUpdatedAt: Joi.date().optional(),
  }).optional(),

  // Client info & stats
  clientInfo: Joi.object({
    totalClients: Joi.number().min(0).optional(),
    totalAppointments: Joi.number().min(0).optional(),
    completedAppointments: Joi.number().min(0).optional(),
    avgRating: Joi.number().min(0).max(5).optional(),
    responseTimeHours: Joi.number().min(0).optional(),
  }).optional(),
  ratingSummary: Joi.object({
    totalReviews: Joi.number().min(0).optional(),
    average: Joi.number().min(0).max(5).optional(),
    breakdown: Joi.array().items(ratingBreakdownItem).optional(),
    lastReviewAt: Joi.date().optional(),
  }).optional(),
  reviews: Joi.array()
    .items(
      Joi.object({
        clientName: Joi.string().allow("").max(120).optional(),
        rating: Joi.number().min(0).max(5).optional(),
        comment: Joi.string().allow("").max(1000).optional(),
        date: Joi.date().optional(),
      })
    )
    .optional(),

  appointmentsSnapshot: Joi.object({
    upcoming: Joi.array().items(appointmentSummaryItem).optional(),
    past: Joi.array().items(appointmentSummaryItem).optional(),
    lastSyncedAt: Joi.date().optional(),
  }).optional(),

  clients: Joi.number().min(0).optional(),
  profileCompleteness: Joi.number().min(0).max(100).optional(),
  status: Joi.string().valid("Active", "Approved", "Pending", "Rejected", "Blocked", "Inactive", "Archived").optional(),
  dashboardSettings: dashboardSettingsItem.optional(),

  notes: Joi.string().allow("").max(2000).optional(),
  isFeatured: Joi.boolean().optional(),
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
  category: Joi.string().min(2).max(100).optional(),
  subcategory: Joi.string().allow("").max(100).optional(),
  specialization: Joi.string().allow("").max(100).optional(),
  regNo: Joi.string().allow("").max(120).optional(),
  fees: Joi.number().min(0).optional(),
  gender: Joi.string().allow("").max(30).optional(),
  yearsOfExperience: Joi.number().min(0).optional(),
  bioTitle: Joi.string().allow("").max(150).optional(),
  pricing: Joi.object({
    baseFee: Joi.number().min(0).optional(),
    currency: Joi.string().allow("").max(10).optional(),
    billingType: Joi.string().valid("per_session", "per_hour").optional(),
    discountPercent: Joi.number().min(0).max(100).optional(),
    customRates: Joi.array().items(customRateItem).optional(),
  }).optional(),
  languages: languagesField.optional(),
  about: Joi.string().allow("").max(2000).optional(),
  image: Joi.string().uri().allow("").optional(),
  bannerImage: Joi.string().uri().allow("").optional(),
  media: mediaItem.optional(),
  socials: socialItem.optional(),

  address: Joi.string().allow("").max(200).optional(),
  addressLine2: Joi.string().allow("").max(200).optional(),
  country: Joi.string().allow("").max(80).optional(),
  state: Joi.string().allow("").max(80).optional(),
  city: Joi.string().allow("").max(80).optional(),
  pincode: Joi.string().allow("").max(20).optional(),

  location: Joi.string().allow("").max(120).optional(),
  experience: Joi.string().allow("").max(50).optional(),
  tags: tagsField.optional(),

  education: Joi.array().items(educationItem).optional(),
  experiences: Joi.array().items(experienceItem).optional(),
  awards: Joi.array().items(awardItem).optional(),
  certifications: Joi.array().items(documentItem).optional(),
  documents: Joi.array().items(documentItem).optional(),

  commission: Joi.object({
    platformPercent: Joi.number().min(0).max(100).optional(),
    minDurationMin: Joi.number().min(0).optional(),
    maxDurationMin: Joi.number().min(0).optional(),
    cancellationWindowHours: Joi.number().min(0).optional(),
    payoutDelayDays: Joi.number().min(0).optional(),
    notes: Joi.string().allow("").max(400).optional(),
    customRates: Joi.array().items(customRateItem).optional(),
  }).optional(),

  appointmentPreferences: Joi.object({
    bookingWindowDays: Joi.number().min(0).optional(),
    minNoticeHours: Joi.number().min(0).optional(),
    bufferMinutes: Joi.number().min(0).optional(),
    allowInstantBooking: Joi.boolean().optional(),
    allowClientReschedule: Joi.boolean().optional(),
    allowClientCancellation: Joi.boolean().optional(),
    allowNotes: Joi.boolean().optional(),
    defaultMeetingLink: Joi.string().uri().allow("").optional(),
  }).optional(),

  availability: Joi.object({
    timezone: Joi.string().allow("").max(60).optional(),
    weekly: Joi.array().items(weeklyAvailabilityItem).optional(),
    blackoutDates: Joi.array().items(Joi.date()).optional(),
    lastUpdatedAt: Joi.date().optional(),
  }).optional(),

  clientInfo: Joi.object({
    totalClients: Joi.number().min(0).optional(),
    totalAppointments: Joi.number().min(0).optional(),
    completedAppointments: Joi.number().min(0).optional(),
    avgRating: Joi.number().min(0).max(5).optional(),
    responseTimeHours: Joi.number().min(0).optional(),
  }).optional(),
  ratingSummary: Joi.object({
    totalReviews: Joi.number().min(0).optional(),
    average: Joi.number().min(0).max(5).optional(),
    breakdown: Joi.array().items(ratingBreakdownItem).optional(),
    lastReviewAt: Joi.date().optional(),
  }).optional(),
  reviews: Joi.array()
    .items(
      Joi.object({
        clientName: Joi.string().allow("").max(120).optional(),
        rating: Joi.number().min(0).max(5).optional(),
        comment: Joi.string().allow("").max(1000).optional(),
        date: Joi.date().optional(),
      })
    )
    .optional(),

  appointmentsSnapshot: Joi.object({
    upcoming: Joi.array().items(appointmentSummaryItem).optional(),
    past: Joi.array().items(appointmentSummaryItem).optional(),
    lastSyncedAt: Joi.date().optional(),
  }).optional(),

  clients: Joi.number().min(0).optional(),
  profileCompleteness: Joi.number().min(0).max(100).optional(),
  status: Joi.string().valid("Active", "Approved", "Pending", "Rejected", "Blocked", "Inactive", "Archived").optional(),
  dashboardSettings: dashboardSettingsItem.optional(),

  notes: Joi.string().allow("").max(2000).optional(),
  isFeatured: Joi.boolean().optional(),
}).min(1);

const consultantIdSchema = Joi.object({
  id: Joi.string().pattern(objectIdPattern).required(),
});

module.exports = {
  createConsultantSchema,
  updateConsultantSchema,
  consultantIdSchema,
};


