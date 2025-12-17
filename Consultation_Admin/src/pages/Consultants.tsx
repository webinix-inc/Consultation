// src/pages/ConsultationManagement.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Search,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,

  Plus,
  Eye,
  Link2,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import UserAPI from "@/api/user.api";
import CategoryAPI from "@/api/category.api";
import SubcategoryAPI from "@/api/subcategory.api";
import ConsultantAPI from "@/api/consultant.api";
import ClientConsultantAPI from "@/api/clientConsultant.api";
import { toast } from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

/* ============================
   Types
   ============================ */
type ID = string;

interface Category {
  _id: ID;
  title: string;
}

interface Subcategory {
  _id: ID;
  title: string;
  categoryId?: ID;
  parentCategory?: ID | { _id: ID; title: string };
}

interface Client {
  _id?: ID;
  id?: ID;
  fullName?: string;
  email?: string;
}

interface User {
  _id?: ID;
  id?: ID;
  userId?: string;
  fullName?: string;
  email?: string;
  mobile?: string;
  role?: string;
  status?: "Active" | "Inactive" | string;
  verificationStatus?: "Active" | "Pending" | "Rejected" | "Blocked";
  category?: Category | ID | null;
  subcategory?: Subcategory | ID | null;
  yearsOfExperience?: number;
  city?: string;
  state?: string;
  clientsCount?: number;
  profileImage?: string;
}

interface ConsultantModel {
  _id?: ID;
  id?: ID;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  mobile?: string;
  yearsOfExperience?: number;
  clientInfo?: { totalClients?: number };
  city?: string;
  state?: string;
  clients?: number;
  clientsCount?: number;
  status?: string;
  image?: string;
  category?: string;
  subcategory?: string;
}

/* ============================
   Small utilities
   ============================ */
const initialConsultantForm = {
  fullName: "",
  email: "",
  mobile: "",
  password: "", // Optional - if not provided, will be auto-generated
  category: "",
  subcategory: "",
};

const generateUserId = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `user${timestamp}${random}`;
};

/* ============================
   Hook: useConsultants (local)
   centralizes queries/mutations
   ============================ */
function useConsultants() {
  const qc = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: UserAPI.getAllUsers,
    select: (res: any) => res?.data ?? res ?? [],
  });

  const consultantsQuery = useQuery({
    queryKey: ["consultants"],
    queryFn: ConsultantAPI.getAllConsultants,
    select: (res: any) => res?.data ?? res ?? [],
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: CategoryAPI.getAll,
    select: (res: any) => res?.data ?? res ?? [],
  });

  const subcategoriesQuery = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => SubcategoryAPI.getAll(),
    select: (res: any) => res?.data ?? res ?? [],
  });

  const createConsultantMutation = useMutation({
    mutationFn: ConsultantAPI.create,
    onSuccess: () => {
      toast.success("Consultant created");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["consultants"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["subcategories"] });
    },
    onError: (err: any) => {
      // handled by caller as well
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: UserAPI.deleteUser,
    onSuccess: () => {
      toast.success("Consultant deleted");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["consultants"] });
    },
    onError: (err: any) => {
      // handled by caller as well
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      UserAPI.updateUser(id, data),
    onSuccess: () => {
      toast.success("Consultant status updated");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["consultants"] });
    },
    onError: (err: any) => {
      // handled by caller as well
    },
  });

  const approveConsultantMutation = useMutation({
    mutationFn: (id: string) => ConsultantAPI.approve(id),
    onSuccess: () => {
      toast.success("Consultant approved successfully");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["consultants"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => {
      // handled by caller as well
    },
  });

  const rejectConsultantMutation = useMutation({
    mutationFn: (id: string) => ConsultantAPI.reject(id),
    onSuccess: () => {
      toast.success("Consultant rejected");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["consultants"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => {
      // handled by caller as well
    },
  });

  return {
    usersQuery,
    consultantsQuery,
    categoriesQuery,
    subcategoriesQuery,
    createConsultantMutation,
    deleteUserMutation,
    updateUserMutation,
    approveConsultantMutation,
    rejectConsultantMutation,
    invalidate: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["consultants"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["subcategories"] });
    },
  };
}



/* ============================
   Component: ConsultantCard
   presentational, memoizable
   ============================ */
const ConsultantCard: React.FC<{
  user: User;
  onDelete: (id: ID) => void;
  onStatusUpdate: (id: ID, newStatus: string) => void;
  isUpdating?: boolean;
}> = ({ user, onDelete, onStatusUpdate, isUpdating = false }) => {
  const id = user._id || user.id || "";
  const displayName = user.fullName || "Consultant";
  const email = user.email || "—";
  const mobile = user.mobile || "—";
  const categoryLabel =
    typeof user.category === "string"
      ? user.category || "General"
      : (user.category as Category)?.title || "General";
  const subcategoryLabel =
    typeof user.subcategory === "string"
      ? user.subcategory || ""
      : (user.subcategory as Subcategory)?.title || "";
  const yearsOfExperience = user.yearsOfExperience ?? 0;
  const location =
    user.city && user.state
      ? `${user.city}, ${user.state}`
      : user.city || user.state || "—";
  const currentStatus = user.status || "Active";
  const verificationStatus = user.verificationStatus || "Pending";

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Fetch linked clients count for the stats row
  const { data: linkedClientsData } = useQuery({
    queryKey: ["consultant-clients", id],
    queryFn: () => ClientConsultantAPI.getConsultantClients(id),
    enabled: !!id,
  });
  const rawClients = linkedClientsData?.data || linkedClientsData;
  const clientCount = Array.isArray(rawClients)
    ? rawClients.length
    : rawClients?.data?.length || 0;

  const navigate = useNavigate();

  const statusConfig = {
    Active: { bg: "bg-blue-50", text: "text-blue-600", label: "Active" },
    Inactive: {
      bg: "bg-yellow-50",
      text: "text-yellow-600",
      label: "Inactive",
    },
  };

  const currentConfig =
    statusConfig[currentStatus as keyof typeof statusConfig] ||
    statusConfig.Active;

  const verificationConfig = {
    Active: { bg: "bg-green-50", text: "text-green-600", label: "Active" },
    Pending: { bg: "bg-yellow-50", text: "text-yellow-600", label: "Pending" },
    Rejected: { bg: "bg-red-50", text: "text-red-600", label: "Rejected" },
    Blocked: { bg: "bg-red-100", text: "text-red-700", label: "Blocked" },
  };

  const currentVerificationConfig =
    verificationConfig[verificationStatus as keyof typeof verificationConfig] ||
    verificationConfig.Pending;

  return (
    <motion.div
      key={id}
      className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 relative"
      layout
    >
      {/* Top Row: Category, Status & Actions */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-gray-800">
            {categoryLabel}{" "}
            {subcategoryLabel && (
              <span className="text-gray-500 font-normal">
                ({subcategoryLabel})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <div
            className={`px-2.5 py-1 rounded-md ${currentVerificationConfig.bg} ${currentVerificationConfig.text} text-xs font-medium flex items-center gap-1`}
          >
            {currentVerificationConfig.label}
          </div>


        </div>
      </div>

      {/* Profile Image & Name */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative mb-3">
          <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm">
            {/* Use user avatar or placeholder */}
            <img
              src={
                user.profileImage ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  displayName
                )}&background=random`
              }
              alt={displayName}
              className="w-full h-full object-cover"
            />
          </div>
          <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center">
          {displayName}
        </h3>
        <p className="text-sm text-gray-500 text-center">
          {subcategoryLabel || categoryLabel}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-100 py-4 mb-5">
        <div className="text-center border-r border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Experience
          </p>
          <p className="text-sm font-bold text-gray-800">
            {yearsOfExperience}+ Years
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Clients
          </p>
          <p className="text-sm font-bold text-gray-800">{clientCount}</p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2.5 mb-6">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Mail size={15} className="text-gray-400 shrink-0" />
          <span className="truncate">{email}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Phone size={15} className="text-gray-400 shrink-0" />
          <span>{mobile}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <MapPin size={15} className="text-gray-400 shrink-0" />
          <span className="truncate">{location}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={() => navigate(`/consultant-dashboard?id=${id}`)}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Eye size={16} /> View
        </button>

        {verificationStatus === "Pending" && !isUpdating && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusUpdate(id, "Active");
              }}
              className="py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Check size={16} /> Approve
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusUpdate(id, "Rejected");
              }}
              className="py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <X size={16} /> Reject
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/* ============================
   Main Component: ConsultationManagement
   (single-file complete page)
   ============================ */
const ConsultationManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subcategoryParam = searchParams.get("subcategory") ?? "";
  const subcategoryName = searchParams.get("subcategoryName") ?? "";
  const queryClient = useQueryClient();

  const [view, setView] = useState<"main" | "pending">("main");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState(initialConsultantForm);

  const {
    usersQuery,
    consultantsQuery,
    categoriesQuery,
    subcategoriesQuery,
    createConsultantMutation,
    deleteUserMutation,
    updateUserMutation,
    approveConsultantMutation,
    rejectConsultantMutation,
    invalidate,
  } = useConsultants();

  // convenience flags
  const isLoading = usersQuery.isLoading || consultantsQuery.isLoading;
  const isError = usersQuery.isError || consultantsQuery.isError;
  const error = (usersQuery.error || consultantsQuery.error) ?? null;

  const categories = (categoriesQuery.data || []) as Category[];
  const subcategories = (subcategoriesQuery.data || []) as Subcategory[];

  // Build consultantsByEmail map from consultantsQuery (Consultant model data)
  const consultantsByEmail = useMemo(() => {
    const list = (consultantsQuery.data || []) as ConsultantModel[];
    const map = new Map<string, ConsultantModel>();
    list.forEach((c) => {
      if (c.email) map.set(c.email.toLowerCase(), c);
    });
    return map;
  }, [consultantsQuery.data]);

  // Transform consultants from Consultant model to User shape for UI compatibility
  const allConsultants = useMemo(() => {
    const consultantsList = (consultantsQuery.data || []) as ConsultantModel[];

    return consultantsList
      .filter((c) => c.status !== "Pending")
      .map((c) => {
        // Transform Consultant model to User shape
        return {
          _id: c._id || c.id,
          id: c._id || c.id,
          fullName: c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Consultant",
          email: c.email || "",
          mobile: c.mobile || c.phone || "",
          role: "Consultant",
          status: c.status === "Active" ? "Active" : "Inactive",
          verificationStatus: c.status || "Pending",
          yearsOfExperience: c.yearsOfExperience || 0,
          clientsCount: c.clientsCount || c.clientInfo?.totalClients || c.clients || 0,
          city: c.city || "",
          state: c.state || "",
          category: c.category || null,
          subcategory: c.subcategory || null,
          profileImage: c.image || "",
        } as User;
      });
  }, [consultantsQuery.data]);

  const allPendingConsultants = useMemo(() => {
    const consultantsList = (consultantsQuery.data || []) as ConsultantModel[];

    return consultantsList
      .filter((c) => c.status === "Pending")
      .map((c) => {
        // Transform Consultant model to User shape
        return {
          _id: c._id || c.id,
          id: c._id || c.id,
          fullName: c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Consultant",
          email: c.email || "",
          mobile: c.mobile || c.phone || "",
          role: "Consultant",
          status: "Active",
          verificationStatus: "Pending",
          yearsOfExperience: c.yearsOfExperience || 0,
          clientsCount: c.clientsCount || c.clientInfo?.totalClients || c.clients || 0,
          city: c.city || "",
          state: c.state || "",
          category: c.category || null,
          subcategory: c.subcategory || null,
          profileImage: c.image || "",
        } as User;
      });
  }, [consultantsQuery.data]);

  // Apply search, category, subcategory filters for main list
  const consultants = useMemo(() => {
    let filtered = allConsultants.slice();
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((u) => {
        const name = (u.fullName || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const cat = (
          typeof u.category === "string"
            ? ""
            : (u.category as Category)?.title || ""
        ).toLowerCase();
        const sub = (
          typeof u.subcategory === "string"
            ? ""
            : (u.subcategory as Subcategory)?.title || ""
        ).toLowerCase();
        return (
          name.includes(q) ||
          email.includes(q) ||
          cat.includes(q) ||
          sub.includes(q)
        );
      });
    }
    if (categoryFilter !== "All") {
      filtered = filtered.filter((u) => {
        // For Consultant model, category is stored as string, so we need to match by name
        const catTitle = (u.category as Category)?.title || "";
        const catId = (u.category as Category)?._id || (u.category as unknown as ID);
        // Try to match by ID first, then by title
        const selectedCategory = categories.find(c => c._id === categoryFilter);
        if (selectedCategory) {
          return catId === categoryFilter || catTitle === selectedCategory.title;
        }
        return false;
      });
    }
    // Note: Subcategory filtering may not work for Consultant model as it doesn't store subcategory
    // This would need to be handled differently if subcategories are needed
    if (subcategoryParam) {
      // Subcategory filtering disabled for Consultant model
      // filtered = filtered.filter((u) => {
      //   const subId = (u.subcategory as Subcategory)?._id || (u.subcategory as unknown as ID);
      //   return subId === subcategoryParam;
      // });
    }
    return filtered;
  }, [allConsultants, searchQuery, categoryFilter, subcategoryParam]);

  const pendingConsultants = useMemo(() => {
    let filtered = allPendingConsultants.slice();
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((u) => {
        const name = (u.fullName || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const cat = (
          typeof u.category === "string"
            ? ""
            : (u.category as Category)?.title || ""
        ).toLowerCase();
        const sub = (
          typeof u.subcategory === "string"
            ? ""
            : (u.subcategory as Subcategory)?.title || ""
        ).toLowerCase();
        return (
          name.includes(q) ||
          email.includes(q) ||
          cat.includes(q) ||
          sub.includes(q)
        );
      });
    }
    if (categoryFilter !== "All") {
      filtered = filtered.filter((u) => {
        const catId =
          (u.category as Category)?._id || (u.category as unknown as ID);
        return catId === categoryFilter;
      });
    }
    return filtered;
  }, [allPendingConsultants, searchQuery, categoryFilter]);

  // Global error -> toast handling
  useEffect(() => {
    if (!isError || !error) return;
    const err = error as any;
    const status = err?.response?.status;
    const msg = err?.response?.data?.message || "Failed to load consultants";
    if (status === 401) toast.error("Unauthorized. Please login as Admin.");
    else if (status === 403) toast.error("Forbidden. Admin access required.");
    else toast.error(msg);
  }, [isError, error]);

  // Create consultant mutation wrapper
  const creating = createConsultantMutation.isPending;
  const createConsultant = useCallback(
    (payload: any) => {
      // Transform payload to match Consultant model structure
      const consultantPayload: any = {
        name: payload.fullName,
        email: payload.email,
        phone: payload.mobile,
        mobile: payload.mobile,
        category: payload.category || 'General',
        subcategory: payload.subcategory || '',
      };

      // Add password if provided
      if (payload.passwordHash) {
        consultantPayload.passwordHash = payload.passwordHash;
      }

      // Get category name if category is an ObjectId
      if (payload.category && typeof payload.category === 'string') {
        const categoryObj = categories.find(c => c._id === payload.category);
        if (categoryObj) {
          consultantPayload.category = categoryObj.title;
        }
      }

      // Get subcategory name if subcategory is an ObjectId
      if (payload.subcategory && typeof payload.subcategory === 'string') {
        const subcategoryObj = subcategories.find(s => s._id === payload.subcategory);
        if (subcategoryObj) {
          consultantPayload.subcategory = subcategoryObj.title;
        }
      }

      createConsultantMutation.mutate(consultantPayload, {
        onSuccess: (data: any) => {
          // Show success message with generated password if available
          if (data?.data?.generatedPassword) {
            toast.success(
              `Consultant created! Password: ${data.data.generatedPassword}`,
              { duration: 10000 }
            );
          } else {
            toast.success("Consultant created successfully!");
          }
          setOpenAdd(false);
          setForm(initialConsultantForm);
        },
        onError: (err: any) => {
          const status = err?.response?.status;
          if (status === 401)
            toast.error("Authentication failed. Please login again.");
          else if (status === 403)
            toast.error("Access denied. Admin privileges required.");
          else if (status === 409)
            toast.error(
              err?.response?.data?.message ||
              "Consultant already exists with this email or mobile."
            );
          else
            toast.error(
              err?.response?.data?.message || "Failed to create consultant"
            );
        },
      });
    },
    [createConsultantMutation, categories, subcategories]
  );

  // Delete wrapper
  const isDeleting = deleteUserMutation.isPending;
  const deleteUser = useCallback(
    (id: ID) => {
      deleteUserMutation.mutate(id, {
        onError: (err: any) => {
          const status = err?.response?.status;
          if (status === 401)
            toast.error("Authentication failed. Please login again.");
          else if (status === 403)
            toast.error("Access denied. Admin privileges required.");
          else if (status === 404)
            toast.error("Consultant not found or already deleted.");
          else
            toast.error(
              err?.response?.data?.message || "Failed to delete consultant"
            );
        },
      });
    },
    [deleteUserMutation]
  );

  // Status update wrapper
  const isUpdatingStatus = approveConsultantMutation.isPending || rejectConsultantMutation.isPending;
  const handleStatusUpdate = useCallback(
    (id: ID, newStatus: string) => {
      if (newStatus === "Active") {
        approveConsultantMutation.mutate(id, {
          onError: (err: any) => {
            const status = err?.response?.status;
            if (status === 401)
              toast.error("Authentication failed. Please login again.");
            else if (status === 403)
              toast.error("Access denied. Admin privileges required.");
            else if (status === 404) toast.error("Consultant not found.");
            else
              toast.error(
                err?.response?.data?.message ||
                "Failed to approve consultant"
              );
          },
        });
      } else if (newStatus === "Rejected") {
        rejectConsultantMutation.mutate(id, {
          onError: (err: any) => {
            const status = err?.response?.status;
            if (status === 401)
              toast.error("Authentication failed. Please login again.");
            else if (status === 403)
              toast.error("Access denied. Admin privileges required.");
            else if (status === 404) toast.error("Consultant not found.");
            else
              toast.error(
                err?.response?.data?.message ||
                "Failed to reject consultant"
              );
          },
        });
      }
    },
    [approveConsultantMutation, rejectConsultantMutation]
  );

  // UI animations variants
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
      {isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="text-sm text-blue-800">Loading consultants...</span>
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <span className="text-sm text-red-800">
            {(error as any)?.response?.data?.message ||
              "Error loading consultants"}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            {view === "pending"
              ? "Pending Consultants"
              : "Consultation Management"}
          </h2>
          <p className="text-sm text-gray-500">
            Home &gt;{" "}
            {view === "pending"
              ? "Pending Consultants"
              : subcategoryName
                ? `Consultants > ${decodeURIComponent(subcategoryName)}`
                : "Consultants"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {subcategoryParam && (
            <button
              onClick={() => navigate("/consultants")}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100 text-gray-600"
            >
              Clear Filter
            </button>
          )}

          <button
            onClick={() => {
              setView((prev) => (prev === "main" ? "pending" : "main"));
              setSearchQuery("");
              setCategoryFilter("All");
            }}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md font-medium transition ${view === "pending"
              ? "bg-gray-100 text-gray-700"
              : "bg-yellow-50 text-yellow-700 border-yellow-200"
              }`}
          >
            <User size={14} />{" "}
            {view === "pending" ? "Back to Consultants" : "Pending Consultants"}
          </button>

          <button
            onClick={() => setOpenAdd(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            <Plus size={16} /> Add Consultant
          </button>
        </div>
      </div>

      {/* Search and Filter only in main view */}
      {view === "main" && (
        <div className="flex flex-col sm:flex-row justify-between gap-3 items-center">
          <div className="relative w-full sm:w-1/2">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/4 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search by name, email, or category"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex items-center justify-between w-full sm:w-auto border rounded-md px-3 py-2 text-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* AnimatePresence for view switching */}
      <AnimatePresence mode="wait">
        {view === "main" ? (
          <motion.div
            key="main"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            {consultants.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 text-sm">
                  {searchQuery || categoryFilter !== "All"
                    ? "No consultants found matching your search criteria."
                    : "No active consultants found."}
                </p>
              </div>
            ) : (
              consultants.map((user) => (
                <motion.div key={user._id || user.id} variants={fadeUp}>
                  <ConsultantCard
                    user={user}
                    onDelete={(id) => {
                      if (
                        window.confirm(
                          `Are you sure you want to delete ${user.fullName || "this consultant"
                          }? This action cannot be undone.`
                        )
                      ) {
                        deleteUser(id);
                      }
                    }}
                    onStatusUpdate={handleStatusUpdate}
                    isUpdating={isUpdatingStatus}
                  />
                </motion.div>
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key="pending"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            {pendingConsultants.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 text-sm">
                  {searchQuery || categoryFilter !== "All"
                    ? "No pending consultants found matching your search criteria."
                    : "No pending consultants found."}
                </p>
              </div>
            ) : (
              pendingConsultants.map((user) => (
                <motion.div key={user._id || user.id} variants={fadeUp}>
                  <ConsultantCard
                    user={user}
                    onDelete={(id) => {
                      if (
                        window.confirm(
                          `Are you sure you want to delete ${user.fullName || "this consultant"
                          }? This action cannot be undone.`
                        )
                      ) {
                        deleteUser(id);
                      }
                    }}
                    onStatusUpdate={handleStatusUpdate}
                    isUpdating={isUpdatingStatus}
                  />
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Consultant Modal (local modal to avoid extra files) */}
      {openAdd && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setOpenAdd(false);
            setForm(initialConsultantForm);
          }}
        >
          <form
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const fullName = form.fullName.trim();
              const email = form.email.trim();
              const mobile = form.mobile.trim();

              if (!fullName || !email || !mobile) {
                toast.error("Full name, email, and mobile number are required");
                return;
              }
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(email)) {
                toast.error("Please enter a valid email address");
                return;
              }
              const phoneRegex = /^\+?[\d\s-()]+$/;
              if (!phoneRegex.test(mobile)) {
                toast.error("Please enter a valid phone number");
                return;
              }

              const userPayload: any = {
                userId: generateUserId(),
                fullName,
                email,
                mobile,
                role: "Consultant",
                status: "Active",
              };

              if (form.category) userPayload.category = form.category;
              if (form.subcategory) userPayload.subcategory = form.subcategory;

              // Add password if provided (otherwise will be auto-generated on backend)
              if (form.password && form.password.trim()) {
                userPayload.passwordHash = form.password.trim();
              }

              createConsultant(userPayload);
            }}
          >
            <div>
              <input
                className="w-full border rounded-md p-2 text-sm bg-gray-50"
                placeholder="Full Name*"
                value={form.fullName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="w-full border rounded-md p-2 text-sm bg-gray-50"
                placeholder="Email*"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                required
              />
              <input
                className="w-full border rounded-md p-2 text-sm bg-gray-50"
                placeholder="Mobile Number*"
                value={form.mobile}
                onChange={(e) =>
                  setForm((f) => ({ ...f, mobile: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <input
                className="w-full border rounded-md p-2 text-sm bg-gray-50"
                placeholder="Password (optional - will be auto-generated if not provided)"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to auto-generate a password
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                className="w-full border rounded-md p-2 text-sm bg-gray-50"
                value={form.category || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    category: e.target.value,
                    subcategory: "",
                  }))
                }
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.title}
                  </option>
                ))}
              </select>

              <select
                className="w-full border rounded-md p-2 text-sm bg-gray-50"
                value={form.subcategory || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subcategory: e.target.value }))
                }
                disabled={!form.category}
              >
                <option value="">
                  {form.category
                    ? "Select Subcategory"
                    : "Select category first"}
                </option>
                {subcategories
                  .filter((s) => {
                    if (!form.category) return false;
                    // Handle both parentCategory (from backend) and categoryId (legacy)
                    let parentId: string | undefined;
                    if (s.parentCategory) {
                      if (
                        typeof s.parentCategory === "object" &&
                        s.parentCategory !== null
                      ) {
                        // Populated object: use _id
                        parentId = String(
                          s.parentCategory._id || s.parentCategory
                        );
                      } else {
                        // Direct ID string
                        parentId = String(s.parentCategory);
                      }
                    } else if (s.categoryId) {
                      // Fallback to categoryId if parentCategory doesn't exist
                      parentId = String(s.categoryId);
                    }
                    return parentId === String(form.category);
                  })
                  .map((subcat) => (
                    <option key={subcat._id} value={subcat._id}>
                      {subcat.title}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setOpenAdd(false);
                  setForm(initialConsultantForm);
                }}
                className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create Consultant"}
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  );
};

export default ConsultationManagement;
