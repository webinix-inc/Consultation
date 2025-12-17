const SubCategory = require("../../../models/subcategory.model");
const { Consultant } = require("../../../models/consultant.model");
const User = require("../../../models/user.model");
const { sendSuccess, ApiError } = require("../../../utils/response");
const httpStatus = require("../../../constants/httpStatus");

// Helper function to calculate stats for a subcategory
const calculateSubcategoryStats = async (subcategoryId, subcategoryTitle) => {
  // Count consultants linked to this subcategory (by category field matching subcategory title)
  const consultants = await Consultant.find({
    category: subcategoryTitle,
    status: "Active",
  });

  // Count users with Consultant role linked to this subcategory
  const consultantUsers = await User.find({
    role: "Consultant",
    subcategory: subcategoryId,
    status: "Active",
  });

  // Total consultant count = Consultant model + User model with Consultant role
  const consultantCount = consultants.length + consultantUsers.length;

  // Count users with Client role linked to this subcategory
  const clientUsers = await User.find({
    role: "Client",
    subcategory: subcategoryId,
    status: "Active",
  });

  // Calculate total clients from all consultants (from Consultant model)
  const clientsFromConsultants = consultants.reduce(
    (sum, consultant) =>
      sum + (consultant.clientInfo?.totalClients || consultant.clients || 0),
    0
  );

  // Total client count = clients from Consultant model + users with Client role
  const totalClients = clientsFromConsultants + clientUsers.length;

  // Calculate monthly revenue (simplified - sum of base fees * client count)
  // In a real system, this would come from appointment/revenue data
  const monthlyRevenue = consultants.reduce((sum, consultant) => {
    const baseFee = consultant.pricing?.baseFee || consultant.fees || 0;
    const clients = consultant.clientInfo?.totalClients || consultant.clients || 0;
    // Simplified calculation: assume average 2 appointments per client per month
    return sum + baseFee * clients * 2;
  }, 0);

  return {
    consultants: consultantCount,
    clients: totalClients,
    monthlyRevenue: Math.round(monthlyRevenue),
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
      .sort({ createdAt: -1 });

    // Calculate stats for each subcategory and update the database
    const subcategoriesWithStats = await Promise.all(
      subcategories.map(async (subcat) => {
        const stats = await calculateSubcategoryStats(
          subcat._id,
          subcat.title
        );
        
        // Update the subcategory with calculated stats
        await SubCategory.findByIdAndUpdate(subcat._id, {
          consultants: stats.consultants,
          clients: stats.clients,
          monthlyRevenue: stats.monthlyRevenue,
        });

        return {
          ...subcat.toObject(),
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
    );
    if (!subcategory) {
      throw new ApiError("Subcategory not found", httpStatus.NOT_FOUND);
    }

    const stats = await calculateSubcategoryStats(
      subcategory._id,
      subcategory.title
    );

    // Update the subcategory with calculated stats
    await SubCategory.findByIdAndUpdate(id, {
      consultants: stats.consultants,
      clients: stats.clients,
      monthlyRevenue: stats.monthlyRevenue,
    });

    return sendSuccess(res, "Subcategory fetched", {
      ...subcategory.toObject(),
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

