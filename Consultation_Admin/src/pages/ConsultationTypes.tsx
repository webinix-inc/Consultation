import React, { useState } from "react";
import { Users, Briefcase, IndianRupee, Star, Plus, X, Trash2, Pencil, Upload } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CategoryAPI from "@/api/category.api";
import UploadAPI from "@/api/upload.api";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const ConsultationCategories: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", desc: "", image: "" });
  const [editingCategory, setEditingCategory] = useState<{ id: string; title: string; description: string; image?: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
      setForm({ name: "", desc: "", image: "" });
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
      setForm({ name: "", desc: "", image: "" });
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
    setEditingCategory({ id: cat._id, title: cat.title, description: cat.description || "", image: cat.image || "" });
    setForm({ name: cat.title, desc: cat.description || "", image: cat.image || "" });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm({ name: "", desc: "", image: "" });
    setEditingCategory(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size exceeds 5MB limit");
        return;
      }
      setIsUploading(true);
      try {
        const response = await UploadAPI.uploadImage(e.target.files[0]);
        setForm({ ...form, image: response.data.url });
        toast.success("Image uploaded successfully");
      } catch (error) {
        toast.error("Failed to upload image");
      } finally {
        setIsUploading(false);
      }
    }
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {(data?.data || []).map((cat: any, i: number) => (
          <div
            key={cat._id || i}
            className="bg-white rounded-xl p-5 border shadow-sm transition-all duration-300 cursor-pointer relative group hover:shadow-md"
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

            {/* Title & Image */}
            <div className="flex items-start gap-4 mb-3">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border">
                {cat.image ? (
                  <img src={cat.image} alt={cat.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Briefcase size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-gray-800 truncate" title={cat.title}>
                  {cat.title}
                </h3>
                <div className="flex items-center text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-md w-fit mt-1">
                  <Star size={12} className="mr-1 text-green-600" />{" "}
                  {(cat.rating || 0).toFixed(1)}
                </div>
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
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
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
                    data: { title: form.name, description: form.desc, image: form.image },
                  });
                } else {
                  createCategory({ title: form.name, description: form.desc, image: form.image });
                }
              }}
              className="space-y-4"
            >
              {/* Image Upload */}
              <div className="flex justify-center mb-4">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                    {form.image ? (
                      <img src={form.image} alt="Category" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-2">
                        <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                        <span className="text-[10px] text-gray-500">Upload Icon</span>
                      </div>
                    )}
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer text-white text-xs font-medium">
                    {isUploading ? "..." : "Change"}
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                  </label>
                </div>
              </div>

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
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
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
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultationCategories;
