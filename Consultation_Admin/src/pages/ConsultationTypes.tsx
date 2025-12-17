import React, { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Users, Briefcase, IndianRupee, Star, Plus, X, Trash2, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CategoryAPI from "@/api/category.api";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const ConsultationCategories: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", desc: "" });
  const [editingCategory, setEditingCategory] = useState<{ id: string; title: string; description: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["categories"],
    queryFn: CategoryAPI.getAll,
    refetchOnWindowFocus: true,
  });

  const { mutate: createCategory, isPending: isCreating } = useMutation({
    mutationFn: CategoryAPI.create,
    onSuccess: () => {
      toast.success("Category created");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowModal(false);
      setForm({ name: "", desc: "" });
      setEditingCategory(null);
    },
    onError: (e: any) => {
      const message = e?.response?.data?.message || "Failed to create category";
      toast.error(message);
    },
  });

  const { mutate: updateCategory, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => CategoryAPI.update(id, data),
    onSuccess: () => {
      toast.success("Category updated successfully");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowModal(false);
      setForm({ name: "", desc: "" });
      setEditingCategory(null);
    },
    onError: (e: any) => {
      const message = e?.response?.data?.message || "Failed to update category";
      toast.error(message);
    },
  });

  const { mutate: deleteCategory, isPending: isDeleting } = useMutation({
    mutationFn: CategoryAPI.remove,
    onSuccess: () => {
      toast.success("Category deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDeleteConfirm(null);
    },
    onError: (e: any) => {
      const message = e?.response?.data?.message || "Failed to delete category";
      toast.error(message);
    },
  });

  const handleEdit = (cat: any) => {
    setEditingCategory({ id: cat._id, title: cat.title, description: cat.description || "" });
    setForm({ name: cat.title, desc: cat.description || "" });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm({ name: "", desc: "" });
    setEditingCategory(null);
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

  return (
    <div className="min-h-screen bg-white p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Consultation Categories
          </h2>
          <p className="text-sm text-gray-500">Home &gt; Consultation Types</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          <Plus size={16} /> Add Categories
        </button>
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
        {(data?.data || []).map((cat: any, i: number) => (
          <motion.div
            key={cat._id || i}
            variants={fadeUp}
            whileHover={{
              y: -5,
              boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            }}
            transition={{ type: "spring", stiffness: 120, damping: 16 }}
            className="bg-white rounded-xl p-5 border shadow-sm transition-all duration-300 cursor-pointer relative group"
            onClick={() => {
              navigate(`/consultation-sub-categories?categoryId=${cat._id}&categoryName=${encodeURIComponent(cat.title)}`);
            }}
          >
            {/* Action Buttons */}
            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(cat);
                }}
                className="p-1.5 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100"
                title="Edit category"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirm({ id: cat._id, title: cat.title });
                }}
                className="p-1.5 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
                title="Delete category"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Title */}
            <div className="flex justify-between items-start mb-2 pr-8">
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Briefcase size={18} className="text-blue-600" /> {cat.title}
              </h3>
              <div className="flex items-center text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded-md">
                <Star size={14} className="mr-1 text-green-600" />{" "}
                {(cat.rating || 0).toFixed(1)}
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-4">{cat.description}</p>

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
                {cat.consultants}
              </div>
              <div className="ml-5 text-gray-900 font-medium">{cat.clients}</div>
            </div>

            {/* Revenue */}
            <div className="flex items-center gap-1 text-sm text-gray-700 mb-4">
              <IndianRupee size={14} className="text-green-500" />
              <span>Monthly Revenue</span>
            </div>
            <p className="text-green-600 font-semibold text-sm mb-4">
              ₹{(cat.monthlyRevenue || 0).toLocaleString("en-IN")}
            </p>

            
          </motion.div>
        ))}
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
                {editingCategory ? "Edit Category" : "Add New Category"}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {editingCategory
                  ? "Update the category details below."
                  : "Fill in the details to add a new category to the platform."}
              </p>

              {/* Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingCategory) {
                    updateCategory({
                      id: editingCategory.id,
                      data: { title: form.name, description: form.desc },
                    });
                  } else {
                    createCategory({ title: form.name, description: form.desc });
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="Enter category name"
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
                      : editingCategory
                      ? "Update Category"
                      : "Add Category"}
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
                Delete Category
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to delete <strong>{deleteConfirm.title}</strong>? 
                This action cannot be undone and will also delete all associated subcategories.
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
                  onClick={() => deleteCategory(deleteConfirm.id)}
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

export default ConsultationCategories;
