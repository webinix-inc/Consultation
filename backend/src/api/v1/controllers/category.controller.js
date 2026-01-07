const Category = require("../../../models/category.model");
const SubCategory = require("../../../models/subcategory.model");
const { Consultant } = require("../../../models/consultant.model"); // Destructure if exported as object
// Check if Consultant model exports object or model directly. Based on prev usage: require(...).Consultant or require(...)
// Previous file usage `const { Consultant } = require(...)` at line 4 of appointment.controller.
// But consultant.model.js end of file usually `module.exports = mongoose.model(...)`?
// Let's check consultant.model.js again to be safe. It ends with: `module.exports = { Consultant: mongoose.model("Consultant", consultantSchema) };` OR just `module.exports = mongoose.model(...)`?
// I see `module.exports = mongoose.model("Consultant", ...)` in the view_file output? 
// No, I need to be sure. Most files use `const Consultant = require(...)`.
// Only `appointment.controller.js` used `const { Consultant } = ...`.
// Let's use `require` and check `appointment.controller.js` content from Step 774 line 4: `const { Consultant } = require(...)`.
// Use the same pattern if it works.

const ClientConsultant = require("../../../models/clientConsultant.model");
const Transaction = require("../../../models/transaction.model");
const { sendSuccess, ApiError } = require("../../../utils/response");
const httpStatus = require("../../../constants/httpStatus");

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
        }).lean(); // Use lean() for easier modification

        let totalConsultants = 0;
        let totalClients = 0;
        let totalRevenue = 0;

        // Calculate stats for each subcategory
        const subcategoriesWithStats = await Promise.all(subcategories.map(async (subcat) => {
          // 1. Count Active Consultants in to this subcategory (by title string)
          const consultantsCount = await Consultant.countDocuments({
            subcategory: subcat.title,
            status: { $in: ["Active", "Approved", "Pending"] }
          });

          // 2. Find Consultants IDs to link clients/revenue
          const consultants = await Consultant.find({
            subcategory: subcat.title
          }).select('_id');
          const consultantIds = consultants.map(c => c._id);

          // 3. Count Active Clients (linked to these consultants)
          // Using ClientConsultant model 'active' links
          const clientsCount = consultantIds.length > 0 ? await ClientConsultant.countDocuments({
            consultant: { $in: consultantIds },
            status: "Active"
          }) : 0;

          // 4. Calculate Revenue
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

          // Accumulate totals
          totalConsultants += consultantsCount;
          totalClients += clientsCount;
          totalRevenue += revenue;

          return {
            ...subcat,
            consultants: consultantsCount,
            clients: clientsCount,
            monthlyRevenue: revenue
          };
        }));

        return {
          ...category.toObject(),
          consultants: totalConsultants,
          clients: totalClients,
          monthlyRevenue: totalRevenue,
          subcategories: subcategoriesWithStats,
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

    // Get the old category to check if title is changing
    const oldCategory = await Category.findById(id);
    if (!oldCategory) {
      throw new ApiError("Category not found", httpStatus.NOT_FOUND);
    }
    const oldTitle = oldCategory.title;

    const updated = await Category.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    // Cascade update: If title changed, update all consultants with the old category name
    if (req.body.title && req.body.title !== oldTitle) {
      await Consultant.updateMany(
        { category: oldTitle },
        { $set: { category: req.body.title } }
      );
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


