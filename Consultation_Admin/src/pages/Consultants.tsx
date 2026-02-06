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
  Upload,
  Ban,
  LockOpen,
  Check,
  X,
  Filter,
} from "lucide-react";
import { PhoneDisplay } from "@/components/ui/PhoneDisplay";
import { formatCurrency, getCurrencyCode } from "@/utils/currencyUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import UserAPI from "@/api/user.api";
import CategoryAPI from "@/api/category.api";
import SubcategoryAPI from "@/api/subcategory.api";
import ConsultantAPI from "@/api/consultant.api";
import ClientConsultantAPI from "@/api/clientConsultant.api";
import UploadAPI from "@/api/upload.api";
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
  country?: string;
  clientsCount?: number;
  profileImage?: string;
  fees?: number;
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
  fees?: number;
  country?: string;
}

/* ============================
   Small utilities
   ============================ */
interface ConsultantFormState {
  fullName: string;
  email: string;
  mobile: string;
  category: string;
  subcategory: string;
  clientsCount: number;
  image: string;
  fees: string | number;
  country: string;
}

const initialConsultantForm: ConsultantFormState = {
  fullName: "",
  email: "",
  mobile: "",

  category: "",
  subcategory: "",
  clientsCount: 0,
  image: "",
  fees: "",
  country: "",
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
    queryFn: () => UserAPI.getAllUsers(),
    select: (res: any) => res?.data ?? res ?? [],
  });

  const consultantsQuery = useQuery({
    queryKey: ["consultants"],
    queryFn: () => ConsultantAPI.getAllConsultants(),
    select: (res: any) => res?.data ?? res ?? [],
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => CategoryAPI.getAll(),
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

  const blockConsultantMutation = useMutation({
    mutationFn: (id: string) => ConsultantAPI.block(id),
    onSuccess: () => {
      toast.success("Consultant blocked");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["consultants"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const unblockConsultantMutation = useMutation({
    mutationFn: (id: string) => ConsultantAPI.unblock(id),
    onSuccess: () => {
      toast.success("Consultant unblocked");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["consultants"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const consultantIds = useMemo((): string[] => {
    const raw = (consultantsQuery.data?.data ?? consultantsQuery.data ?? []) as any[];
    const ids = raw.map((c) => c._id || c.id).filter(Boolean) as string[];
    return [...new Set(ids)];
  }, [consultantsQuery.data]);

  const batchClientCountsQuery = useQuery({
    queryKey: ["batch-client-counts", consultantIds],
    queryFn: async () => {
      const res = await ClientConsultantAPI.getBatchClientCounts(consultantIds);
      return (res?.data ?? res) || {};
    },
    enabled: consultantIds.length > 0,
  });

  const clientCountsMap = (batchClientCountsQuery.data as Record<string, number>) ?? {};

  return {
    usersQuery,
    consultantsQuery,
    categoriesQuery,
    subcategoriesQuery,
    clientCountsMap,
    createConsultantMutation,
    deleteUserMutation,
    updateUserMutation,
    approveConsultantMutation,
    rejectConsultantMutation,
    blockConsultantMutation,
    unblockConsultantMutation,
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
  fromView?: "main" | "pending";
  clientCount?: number;
}> = ({ user, onDelete, onStatusUpdate, isUpdating = false, fromView = "main", clientCount: clientCountProp }) => {
  const id = user._id || user.id || "";
  const displayName = user.fullName || "Consultant";
  const email = user.email || "—";
  const mobile = user.mobile || "—";
  const getLabel = (val: any) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object") {
      const label = val.name || val.title || "";
      return typeof label === "string" ? label : "";
    }
    return "";
  };
  const categoryLabel = getLabel(user.category) || "General";
  const subcategoryLabel = getLabel(user.subcategory);
  const yearsOfExperience = user.yearsOfExperience ?? 0;
  const location =
    user.city && user.state
      ? `${user.city}, ${user.state}`
      : user.city || user.state || "—";
  const fees = (user as any).fees ?? 0;
  const currentStatus = user.status || "Active";
  const verificationStatus = user.verificationStatus || "Pending";

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const { data: linkedClientsData } = useQuery({
    queryKey: ["consultant-clients", id],
    queryFn: () => ClientConsultantAPI.getConsultantClients(id),
    enabled: !!id && clientCountProp === undefined,
  });
  const rawClients = linkedClientsData?.data || linkedClientsData;
  const clientCount =
    clientCountProp ??
    (Array.isArray(rawClients) ? rawClients.length : rawClients?.data?.length || 0);

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
      className="group bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
      layout
    >
      {/* Decorative top gradient line */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${currentConfig.bg.replace("bg-", "bg-Gradient-to-r from-transparent via-")?.replace("50", "400") || "bg-blue-500"} opacity-50`} />
      {/* Top Row: Category, Status & Actions */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-gray-800">
            {String(categoryLabel)}{" "}
            {subcategoryLabel && (
              <span className="text-gray-500 font-normal">
                ({String(subcategoryLabel)})
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
          {String(subcategoryLabel || categoryLabel)}
        </p>
      </div>

      {/* Stats Row */}
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-blue-50/30 group-hover:border-blue-100/50 transition-colors">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Experience
          </p>
          <div className="text-sm font-bold text-slate-700 mt-0.5">
            {yearsOfExperience}+ Yrs
          </div>
        </div>
        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-blue-50/30 group-hover:border-blue-100/50 transition-colors">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Clients
          </p>
          <div className="text-sm font-bold text-slate-700 mt-0.5">{clientCount}</div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-3 mb-6 px-1">
        <div className="flex items-center gap-3 text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
          <div className="h-8 w-8 rounded-full bg-slate-50 grid place-items-center shrink-0">
            <Mail size={14} className="text-slate-400" />
          </div>
          <span className="truncate font-medium text-xs">{email}</span>
        </div>
        <div className="flex items-center gap-2">
          <PhoneDisplay phone={mobile} label="" variant="card" />
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
          <div className="h-8 w-8 rounded-full bg-slate-50 grid place-items-center shrink-0">
            <MapPin size={14} className="text-slate-400" />
          </div>
          <span className="truncate font-medium text-xs">{location}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={() => navigate(`/consultant-dashboard?id=${id}`, { state: { fromView } })}
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
        {verificationStatus === "Active" && !isUpdating && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusUpdate(id, "Blocked");
            }}
            className="w-full py-2.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Ban size={16} /> Block
          </button>
        )}

        {verificationStatus === "Blocked" && !isUpdating && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusUpdate(id, "Active"); // Unblock -> Active
            }}
            className="w-full py-2.5 bg-green-100 hover:bg-green-200 text-green-700 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <LockOpen size={16} /> Unblock
          </button>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const subcategoryParam = searchParams.get("subcategory") ?? "";
  const subcategoryName = searchParams.get("subcategoryName") ?? "";
  const queryClient = useQueryClient();

  // Initialize view from URL param or default to "main"
  const initialView = (searchParams.get("view") as "main" | "pending") || "main";
  const [view, setViewState] = useState<"main" | "pending">(initialView);

  // Sync view state with URL when it changes locally is redundant if we drive from URL,
  // but let's keep local state and sync TO URL for now to minimize refactor.
  const setView = (newView: "main" | "pending" | ((prev: "main" | "pending") => "main" | "pending")) => {
    setViewState((prev) => {
      const next = typeof newView === "function" ? newView(prev) : newView;
      // Update URL params
      setSearchParams((prevParams) => {
        const newParams = new URLSearchParams(prevParams);
        newParams.set("view", next);
        return newParams;
      });
      return next;
    });
  };

  // Sync from URL changes (e.g. back button)
  useEffect(() => {
    const viewParam = searchParams.get("view") as "main" | "pending";
    if (viewParam && (viewParam === "main" || viewParam === "pending")) {
      setViewState(viewParam);
    }
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState(initialConsultantForm);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
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

  const {
    usersQuery,
    consultantsQuery,
    categoriesQuery,
    subcategoriesQuery,
    clientCountsMap,
    createConsultantMutation,
    deleteUserMutation,
    updateUserMutation,
    approveConsultantMutation,
    rejectConsultantMutation,
    blockConsultantMutation,
    unblockConsultantMutation,
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
          fees: c.fees || 0,
          country: c.country || "IN",
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
          fees: c.fees || 0,
          country: c.country || "IN",
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
    if (subcategoryName) {
      filtered = filtered.filter((u) => {
        const uSubObj = u.subcategory as any;
        const uSub = typeof uSubObj === "string" ? uSubObj : (uSubObj?.name || uSubObj?.title || "");
        return uSub === decodeURIComponent(subcategoryName);
      });
    } else if (subcategoryParam) {
      // Find subcategory title by ID
      const targetSub = subcategories.find(s => s._id === subcategoryParam);
      if (targetSub) {
        filtered = filtered.filter((u) => {
          const uSubObj = u.subcategory as any;
          const uSub = typeof uSubObj === "string" ? uSubObj : (uSubObj?.name || uSubObj?.title || "");
          return uSub === targetSub.title;
        });
      }
    }
    return filtered;
  }, [allConsultants, searchQuery, categoryFilter, subcategoryParam, subcategoryName, subcategories]);

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
        image: payload.image || '',
        fees: Number(payload.fees) || 0,
      };



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
          toast.success("Consultant created successfully!");
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
  const isUpdatingStatus = approveConsultantMutation.isPending ||
    rejectConsultantMutation.isPending ||
    blockConsultantMutation.isPending ||
    unblockConsultantMutation.isPending;
  const handleStatusUpdate = useCallback(
    (id: ID, newStatus: string) => {
      if (newStatus === "Active") {
        // Check if we are unblocking or approving. Status logic can be inferred or explicit.
        // If current status is Blocked, we call unblock. If Pending, approve.
        // But here we rely on the Button's intent.
        // If current status was Blocked, the button calls this with "Active".
        // Let's check status from mutation context if possible, or just default to approve/unblock flow?
        // Actually, `ConsultantCard` logic sends "Active" for both Approve and Unblock. 
        // We should differentiate. 
        // Strategy: Let's simply handle based on the action we want.
        // The Buttons sending "Active" is ambiguous.
        // Let's check if the consultant is currently Blocked?
        const target = allConsultants.find(c => (c._id === id || c.id === id)) || allPendingConsultants.find(c => (c._id === id || c.id === id));
        const isBlocked = target?.verificationStatus === "Blocked";

        if (isBlocked) {
          unblockConsultantMutation.mutate(id);
        } else {
          approveConsultantMutation.mutate(id); // Default to approve
        }
      } else if (newStatus === "Rejected") {
        rejectConsultantMutation.mutate(id);
      } else if (newStatus === "Blocked") {
        blockConsultantMutation.mutate(id);
      }
    },
    [approveConsultantMutation, rejectConsultantMutation, blockConsultantMutation, unblockConsultantMutation, allConsultants, allPendingConsultants]
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
            className={`relative flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md font-medium transition ${view === "pending"
              ? "bg-gray-100 text-gray-700"
              : "bg-yellow-50 text-yellow-700 border-yellow-200"
              }`}
          >
            <User size={14} />{" "}
            {view === "pending" ? "Back to Consultants" : "Pending Consultants"}
            {view !== "pending" && allPendingConsultants.length > 0 && (
              <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow-sm ring-1 ring-white">
                {allPendingConsultants.length > 99 ? "99+" : allPendingConsultants.length}
              </span>
            )}
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
                    clientCount={clientCountsMap[user._id || user.id || ""]}
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
                    fromView={view}
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
                    clientCount={clientCountsMap[user._id || user.id || ""]}
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
                    fromView={view}
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
                image: form.image,
              };

              if (form.category) userPayload.category = form.category;
              if (form.subcategory) userPayload.subcategory = form.subcategory;
              if (form.fees) userPayload.fees = form.fees;
              if (form.country) userPayload.country = form.country;

              createConsultant(userPayload);
            }}
          >
            {/* Profile Image Upload */}
            <div className="flex justify-center mb-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                  {form.image ? (
                    <img
                      src={form.image}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-2">
                      <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                      <span className="text-[10px] text-gray-500">
                        Upload Photo
                      </span>
                    </div>
                  )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer text-white text-xs font-medium">
                  {isUploading ? "..." : "Change"}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>

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

            <div className="w-full">
              <input
                className="w-full border rounded-md p-2 text-sm bg-gray-50"
                placeholder={`Consultation Fee (${formatCurrency(0, getCurrencyCode(form.country || 'IN')).replace(/[0-9.,\s]/g, '')})`}
                value={form.fees}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setForm((f) => ({ ...f, fees: val }));
                }}
              />
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
