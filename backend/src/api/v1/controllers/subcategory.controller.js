const SubCategory = require("../../../models/subcategory.model");
const { Consultant } = require("../../../models/consultant.model");
const ClientConsultant = require("../../../models/clientConsultant.model");
const Transaction = require("../../../models/transaction.model");
const { sendSuccess, ApiError } = require("../../../utils/response");
const httpStatus = require("../../../constants/httpStatus");


// Helper function to calculate stats for a subcategory
const calculateSubcategoryStats = async (subcategoryId, subcategoryTitle) => {
  // 1. Count Active Consultants in to this subcategory (by title string)
  const consultantsCount = await Consultant.countDocuments({
    subcategory: subcategoryTitle,
    status: { $in: ["Active", "Approved"] }
  });

  // 2. Find Consultants IDs to link clients/revenue
  const consultants = await Consultant.find({
    subcategory: subcategoryTitle
  }).select('_id');
  const consultantIds = consultants.map(c => c._id);

  // 3. Count Active Clients (linked to these consultants)
  const clientsCount = consultantIds.length > 0 ? await ClientConsultant.countDocuments({
    consultant: { $in: consultantIds },
    status: "Active"
  }) : 0;

  // 4. Calculate Revenue from successful transactions
  let revenue = 0;
  if (consultantIds.length > 0) {
    const revenueResult = await Transaction.aggregate([
      {
        $match: {
          consultant: { $in: consultantIds },
          status: "Success",
          type: "Payment"
        }
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    revenue = revenueResult[0]?.total || 0;
  }

  return {
    consultants: consultantsCount,
    clients: clientsCount,
    monthlyRevenue: revenue,
  };
};

exports.list = async (req, res, next) => {
  try {
    const { categoryId } = req.query;
    const filter = {};
    if (categoryId) {
      filter.parentCategory = categoryId;
    }
    const subcategories = await SubCategory.find(filter)
      .populate("parentCategory", "title")
      .sort({ createdAt: -1 })
      .lean();

    // Calculate stats for each subcategory
    const subcategoriesWithStats = await Promise.all(
      subcategories.map(async (subcat) => {
        const stats = await calculateSubcategoryStats(
          subcat._id,
          subcat.title
        );

        return {
          ...subcat,
          consultants: stats.consultants,
          clients: stats.clients,
          monthlyRevenue: stats.monthlyRevenue,
        };
      })
    );

    return sendSuccess(res, "Subcategories fetched", subcategoriesWithStats);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const subcategory = await SubCategory.findById(id).populate(
      "parentCategory",
      "title"
    ).lean();

    if (!subcategory) {
      throw new ApiError("Subcategory not found", httpStatus.NOT_FOUND);
    }

    const stats = await calculateSubcategoryStats(
      subcategory._id,
      subcategory.title
    );

    return sendSuccess(res, "Subcategory fetched", {
      ...subcategory,
      ...stats,
    });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const subcategory = await SubCategory.create(req.body);
    const populated = await SubCategory.findById(subcategory._id).populate(
      "parentCategory",
      "title"
    );
    return sendSuccess(
      res,
      "Subcategory created",
      populated,
      httpStatus.CREATED
    );
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await SubCategory.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).populate("parentCategory", "title");
    if (!updated) {
      throw new ApiError("Subcategory not found", httpStatus.NOT_FOUND);
    }
    return sendSuccess(res, "Subcategory updated", updated);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await SubCategory.findByIdAndDelete(id);
    if (!deleted) {
      throw new ApiError("Subcategory not found", httpStatus.NOT_FOUND);
    }
    return sendSuccess(res, "Subcategory deleted", { deletedId: id });
  } catch (error) {
    next(error);
  }
};

