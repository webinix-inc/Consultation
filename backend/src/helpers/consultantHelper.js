// server/src/helpers/consultantHelper.js
const mongoose = require("mongoose");
const User = require("../models/user.model");
const { Consultant } = require("../models/consultant.model");

/**
 * Resolve consultant details given a consultantId that may point to either
 * Consultant collection or User collection (with role Consultant).
 * Returns null if not found.
 */
async function resolveConsultantDto(consultantId) {
  if (!consultantId) return null;

  // If passed as object
  if (typeof consultantId === "object") {
    // Already a populated document
    const doc = consultantId;
    const displayName = doc.displayName || doc.name || doc.fullName || `${doc.firstName || ""} ${doc.lastName || ""}`.trim();
    return {
      _id: doc._id || doc.id,
      id: doc._id || doc.id,
      name: doc.name || doc.displayName || doc.fullName || null,
      displayName: displayName || null,
      fullName: doc.fullName || null,
      email: doc.email || null,
      phone: doc.phone || doc.mobile || null,
      status: doc.status || null,
      category: doc.category || null,
      subcategory: doc.subcategory || null,
      raw: doc,
    };
  }

  // consultantId is string
  const id = String(consultantId);
  if (!mongoose.isValidObjectId(id)) return null;

  // Helper to resolve category/subcategory names
  const resolveNames = async (catId, subId) => {
    let catTitle = catId;
    let subTitle = subId;

    if (catId && mongoose.isValidObjectId(catId)) {
      const Category = require("../models/category.model");
      const cat = await Category.findById(catId).select("title").lean();
      if (cat) catTitle = cat.title;
    }

    if (subId && mongoose.isValidObjectId(subId)) {
      const Subcategory = require("../models/subcategory.model");
      const sub = await Subcategory.findById(subId).select("title").lean();
      if (sub) subTitle = sub.title;
    }
    return { category: catTitle, subcategory: subTitle };
  };

  // Try Consultant model first
  let consultant = await Consultant.findById(id).lean();
  if (consultant) {
    const displayName = consultant.displayName || consultant.name || consultant.fullName || `${consultant.firstName || ""} ${consultant.lastName || ""}`.trim();
    const { category, subcategory } = await resolveNames(consultant.category, consultant.subcategory);

    return {
      _id: consultant._id,
      id: consultant._id,
      name: consultant.name || null,
      displayName: displayName || null,
      fullName: consultant.fullName || null,
      email: consultant.email || null,
      phone: consultant.phone || null,
      status: consultant.status || null,
      category: category || null,
      subcategory: subcategory || null,
      fees: consultant.fees || 0,
      image: consultant.image || null,
      yearsOfExperience: consultant.yearsOfExperience || 0,
      bioTitle: consultant.bioTitle || null,
      about: consultant.about || null,
      languages: consultant.languages || [],
      city: consultant.city || null,
      state: consultant.state || null,
      ratingSummary: consultant.ratingSummary || null,
      raw: consultant,
    };
  }

  // Fallback to User model with role Consultant
  const consultantUser = await User.findOne({ _id: id, role: "Consultant" }).lean();
  if (consultantUser) {
    const displayName = consultantUser.fullName || `${consultantUser.firstName || ""} ${consultantUser.lastName || ""}`.trim();
    const { category, subcategory } = await resolveNames(consultantUser.category, consultantUser.subcategory);

    // Fetch the linked Consultant profile to get fees and other details
    const linkedProfile = await Consultant.findOne({ user: consultantUser._id }).lean();

    return {
      _id: consultantUser._id,
      id: consultantUser._id,
      name: consultantUser.fullName || null,
      displayName: displayName || null,
      fullName: consultantUser.fullName || null,
      email: consultantUser.email || null,
      phone: consultantUser.mobile || null,
      status: consultantUser.status || null,
      category: category || null,
      subcategory: subcategory || null,
      fees: linkedProfile?.fees || 0,
      image: linkedProfile?.image || consultantUser.image || null,
      yearsOfExperience: linkedProfile?.yearsOfExperience || 0,
      bioTitle: linkedProfile?.bioTitle || null,
      about: linkedProfile?.about || consultantUser.about || null,
      languages: linkedProfile?.languages || consultantUser.languages || [],
      city: linkedProfile?.city || consultantUser.city || null,
      state: linkedProfile?.state || consultantUser.state || null,
      ratingSummary: linkedProfile?.ratingSummary || consultantUser.ratingSummary || null,
      raw: consultantUser,
    };
  }

  return null;
}

module.exports = {
  resolveConsultantDto,
};
