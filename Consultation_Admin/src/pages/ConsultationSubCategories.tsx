import React, { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Users, Briefcase, IndianRupee, Star, Plus, X, ArrowLeft, Trash2, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import SubcategoryAPI from "@/api/subcategory.api";
import CategoryAPI from "@/api/category.api";
import { toast } from "react-hot-toast";

const ConsultationSubCategories: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", desc: "", selectedCategory: "" });
  const [editingSubcategory, setEditingSubcategory] = useState<{ id: string; title: string; description: string; parentCategory?: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryId = searchParams.get("categoryId");
  const categoryName = searchParams.get("categoryName") || "Consultation Types";

  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["subcategories", categoryId],
    queryFn: () => SubcategoryAPI.getAll(categoryId || undefined),
    enabled: !!categoryId,
    refetchOnWindowFocus: true,
  });

  // Fetch categories for the dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: CategoryAPI.getAll,
    refetchOnWindowFocus: true,
  });

  const { mutate: createSubcategory, isPending: isCreating } = useMutation({
    mutationFn: SubcategoryAPI.create,
    onSuccess: () => {
      toast.success("Subcategory created");
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      setShowModal(false);
      setForm({ name: "", desc: "", selectedCategory: "" });
      setEditingSubcategory(null);
    },
    onError: (e: any) => {
      const message = e?.response?.data?.message || "Failed to create subcategory";
      toast.error(message);
    },
  });

  const { mutate: updateSubcategory, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => SubcategoryAPI.update(id, data),
    onSuccess: () => {
      toast.success("Subcategory updated successfully");
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowModal(false);
      setForm({ name: "", desc: "", selectedCategory: "" });
      setEditingSubcategory(null);
    },
    onError: (e: any) => {
      const message = e?.response?.data?.message || "Failed to update subcategory";
      toast.error(message);
    },
  });

  const { mutate: deleteSubcategory, isPending: isDeleting } = useMutation({
    mutationFn: SubcategoryAPI.remove,
    onSuccess: () => {
      toast.success("Subcategory deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDeleteConfirm(null);
    },
    onError: (e: any) => {
      const message = e?.response?.data?.message || "Failed to delete subcategory";
      toast.error(message);
    },
  });

  const handleEdit = (subcat: any) => {
    const parentCategoryId = typeof subcat.parentCategory === 'object' 
      ? subcat.parentCategory._id 
      : subcat.parentCategory;
    setEditingSubcategory({ 
      id: subcat._id, 
      title: subcat.title, 
      description: subcat.description || "",
      parentCategory: parentCategoryId
    });
    setForm({ 
      name: subcat.title, 
      desc: subcat.description || "",
      selectedCategory: parentCategoryId || ""
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm({ name: "", desc: "", selectedCategory: "" });
    setEditingSubcategory(null);
  };

  const handleOpenModal = () => {
    // Set default category from URL if available
    setForm({ name: "", desc: "", selectedCategory: categoryId || "" });
    setShowModal(true);
  };


  // ✅ Framer Motion variants (type-safe)
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 },
    },
  };

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 90, damping: 16 },
    },
  };

  if (!categoryId) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Please select a category first.{" "}
            <button
              onClick={() => navigate("/consultation-categories")}
              className="text-blue-600 underline"
            >
              Go to Categories
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Consultation Sub Categories
          </h2>
          <p className="text-sm text-gray-500">
            Home &gt; Consultation Types &gt; {decodeURIComponent(categoryName)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/consultation-categories")}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            <Plus size={16} /> Add Sub Category
          </button>
        </div>
      </div>

      {/* Grid */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          show: { transition: { staggerChildren: 0.1 } },
        }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Loading subcategories...
          </div>
        ) : isError ? (
          <div className="col-span-full text-center py-8 text-red-500">
            Error loading subcategories
          </div>
        ) : (data?.data || []).length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No subcategories found. Create one to get started.
          </div>
        ) : (
          (data?.data || []).map((subcat: any, i: number) => (
            <motion.div
              key={subcat._id || i}
              variants={fadeUp}
              whileHover={{
                y: -5,
                boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
              }}
              transition={{ type: "spring", stiffness: 120, damping: 16 }}
              className="bg-white rounded-xl p-5 border shadow-sm transition-all duration-300 relative group"
            >
              {/* Action Buttons */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(subcat);
                  }}
                  className="p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100"
                  title="Edit subcategory"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm({ id: subcat._id, title: subcat.title });
                  }}
                  className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
                  title="Delete subcategory"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Title */}
              <div className="flex justify-between items-start mb-2 pr-8">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Briefcase size={18} className="text-blue-600" /> {subcat.title}
                </h3>
                <div className="flex items-center text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded-md">
                  <Star size={14} className="mr-1 text-green-600" />{" "}
                  {(subcat.rating || 0).toFixed(1)}
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4">{subcat.description}</p>

              {/* Stats */}
              <div className="grid grid-cols-2 text-sm text-gray-700 mb-3">
                <div className="flex items-center gap-1">
                  <Users size={14} className="text-gray-500" />
                  <span>Consultants</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={14} className="text-gray-500" />
                  <span>Active Clients</span>
                </div>
                <div className="ml-5 text-gray-900 font-medium">
                  {subcat.consultants || 0}
                </div>
                <div className="ml-5 text-gray-900 font-medium">
                  {subcat.clients || 0}
                </div>
              </div>

              {/* Revenue */}
              <div className="flex items-center gap-1 text-sm text-gray-700 mb-4">
                <IndianRupee size={14} className="text-green-500" />
                <span>Monthly Revenue</span>
              </div>
              <p className="text-green-600 font-semibold text-sm mb-4">
                ₹{(subcat.monthlyRevenue || 0).toLocaleString("en-IN")}
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => navigate(`/consultants?subcategory=${subcat._id}&subcategoryName=${encodeURIComponent(subcat.title)}`)}
                  className="w-full border border-gray-300 rounded-md py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition"
                >
                  Consultants
                </button>
                <button className="w-full border border-gray-300 rounded-md py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition">
                  Bookings
                </button>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 14 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative"
            >
              {/* Close */}
              <button
                onClick={handleCloseModal}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>

              <h3 className="text-lg font-semibold text-gray-800">
                {editingSubcategory ? "Edit Sub Category" : "Add New Sub Category"}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {editingSubcategory
                  ? "Update the subcategory details below."
                  : `Fill in the details to add a new subcategory under ${decodeURIComponent(categoryName)}.`}
              </p>

              {/* Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const selectedCategoryId = form.selectedCategory || categoryId;
                  
                  if (!selectedCategoryId) {
                    toast.error("Please select a category");
                    return;
                  }

                  if (editingSubcategory) {
                    updateSubcategory({
                      id: editingSubcategory.id,
                      data: { 
                        title: form.name, 
                        description: form.desc,
                        parentCategory: selectedCategoryId
                      },
                    });
                  } else {
                    createSubcategory({
                      title: form.name,
                      description: form.desc,
                      parentCategory: selectedCategoryId,
                    });
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.selectedCategory}
                    onChange={(e) =>
                      setForm({ ...form, selectedCategory: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    required
                  >
                    <option value="">Select Category</option>
                    {(categoriesData?.data || []).map((cat: any) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Sub Category Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="Enter subcategory name"
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={form.desc}
                    onChange={(e) =>
                      setForm({ ...form, desc: e.target.value })
                    }
                    placeholder="Enter description"
                    className="w-full mt-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none"
                    rows={3}
                    required
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isCreating || isUpdating}
                    className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || isUpdating}
                    className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-60"
                  >
                    {isUpdating
                      ? "Updating..."
                      : isCreating
                        ? "Creating..."
                        : editingSubcategory
                          ? "Update Sub Category"
                          : "Add Sub Category"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 14 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Delete Subcategory
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete <strong>{deleteConfirm.title}</strong>?
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteSubcategory(deleteConfirm.id)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-60"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConsultationSubCategories;
