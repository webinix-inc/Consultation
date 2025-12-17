const Category = require("../../../models/category.model");
const SubCategory = require("../../../models/subcategory.model");
const { sendSuccess, ApiError } = require("../../../utils/response");
const httpStatus = require("../../../constants/httpStatus");

// Helper function to calculate aggregated stats for a category from its subcategories
const calculateCategoryStats = async (categoryId) => {
  const subcategories = await SubCategory.find({
    parentCategory: categoryId,
    status: "Active",
  });

  const aggregatedStats = {
    consultants: 0,
    clients: 0,
    monthlyRevenue: 0,
  };

  // Sum up stats from all subcategories
  for (const subcat of subcategories) {
    aggregatedStats.consultants += subcat.consultants || 0;
    aggregatedStats.clients += subcat.clients || 0;
    aggregatedStats.monthlyRevenue += subcat.monthlyRevenue || 0;
  }

  return aggregatedStats;
};

exports.list = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });

    // Calculate aggregated stats for each category from its subcategories
    const categoriesWithStats = await Promise.all(
      categories.map(async (category) => {
        // Fetch subcategories for this category
        const subcategories = await SubCategory.find({
          parentCategory: category._id,
          status: "Active",
        }).select('_id name title description status');

        // Calculate stats
        const stats = await calculateCategoryStats(category._id);

        return {
          ...category.toObject(),
          consultants: stats.consultants,
          clients: stats.clients,
          monthlyRevenue: stats.monthlyRevenue,
          subcategories: subcategories, // Include subcategories
        };
      })
    );

    return sendSuccess(res, "Categories fetched", categoriesWithStats);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const category = await Category.create(req.body);
    return sendSuccess(res, "Category created", category, httpStatus.CREATED);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await Category.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      throw new ApiError("Category not found", httpStatus.NOT_FOUND);
    }
    return sendSuccess(res, "Category updated", updated);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) {
      throw new ApiError("Category not found", httpStatus.NOT_FOUND);
    }

    // Cascade delete: Remove all subcategories associated with this category
    await SubCategory.deleteMany({ parentCategory: id });

    return sendSuccess(res, "Category deleted", { deletedId: id });
  } catch (error) {
    next(error);
  }
};


