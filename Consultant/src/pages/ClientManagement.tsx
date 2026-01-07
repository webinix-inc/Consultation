// src/pages/ClientManagement.tsx
import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  Eye,
  Trash2,
  Filter,
  Plus,
  Search,
  Pencil,
  EyeOff,
  RefreshCcw,
  Copy,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import UserAPI from "@/api/user.api";
import CategoryAPI from "@/api/category.api";
import SubcategoryAPI from "@/api/subcategory.api";
import ConsultantAPI from "@/api/consultant.api";
import ClientConsultantAPI from "@/api/clientConsultant.api";
import { useAuth } from "@/hooks/useAuth";

// ------------------------------
// Types
// ------------------------------
export type Client = {
  id?: string;
  _id?: string;
  name: string;
  fullName?: string;

  category?: any;
  subcategory?: any;
  phone: string;
  mobile?: string;
  email: string;
  status: "Active" | "Inactive";
  sessions?: number;
  lastSessionDate?: string;
  lastSessionTime?: string;
  lastSessionAt?: string;
  avatar?: string;
};

// ------------------------------
// Helpers
// ------------------------------
const StatusBadge = ({ value }: { value: Client["status"] }) => (
  <Badge
    variant={value === "Active" ? "secondary" : "outline"}
    className={cn(
      "rounded-full px-2 py-0.5 text-xs",
      value === "Active" && "bg-emerald-100 text-emerald-700 border-emerald-200",
      value === "Inactive" && "text-muted-foreground"
    )}
  >
    {value}
  </Badge>
);

function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (p: number) => void;
}) {
  const visible = (() => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, pages];
    if (page >= pages - 3) return [1, pages - 4, pages - 3, pages - 2, pages - 1, pages];
    return [1, page - 1, page, page + 1, pages];
  })();

  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" disabled={page === 1} onClick={() => onChange(page - 1)}>
        Prev
      </Button>
      {visible.map((p) => (
        <Button
          key={p}
          variant={page === p ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(p)}
          className={cn(page === p ? "bg-blue-600 hover:bg-blue-700 text-white" : "")}
        >
          {p}
        </Button>
      ))}
      <Button variant="outline" size="sm" disabled={page === pages} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </div>
  );
}

// Generate userId
const generateUserId = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `user${timestamp}${random}`;
};



// ------------------------------
// Add Client Dialog
// (only important parts shown; full behavior preserved)
// ------------------------------


// ------------------------------
// Edit Client Dialog
// ------------------------------
function EditClientDialog({ client, onUpdate }: { client: Client | null; onUpdate: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Client>>({});
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: CategoryAPI.getAll,
  });

  // Fetch subcategories when category is selected
  const { data: subcategoriesData } = useQuery({
    queryKey: ["subcategories", form.category],
    queryFn: () => form.category ? SubcategoryAPI.getAll(form.category) : Promise.resolve({ data: [] }),
    enabled: !!form.category,
  });

  const categories = categoriesData?.data || [];
  const subcategories = subcategoriesData?.data || [];

  // Initialize form when dialog opens/closes or client changes
  useEffect(() => {
    if (open && client) {
      setForm({
        fullName: client.fullName || client.name,
        email: client.email,
        mobile: client.mobile || client.phone,
        category: client.category?._id || client.category,
        subcategory: client.subcategory?._id || client.subcategory
      });
    }
  }, [open, client]);

  // Update client mutation
  const { mutate: updateClient, isPending: isUpdating } = useMutation({
    mutationFn: (payload: any) => {
      if (!client?.id && !client?._id) {
        return Promise.reject(new Error("No client ID available"));
      }
      const clientId = client?.id || client?._id;
      return UserAPI.updateUser(clientId!, payload);
    },
    onSuccess: () => {
      toast.success("Client updated successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      onUpdate();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || "Failed to update client";
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email) {
      toast.error("Full name and email are required");
      return;
    }

    const updateData: any = {
      fullName: form.fullName,
      email: form.email, // Email is included but should not be editable
      mobile: form.mobile
    };

    if (form.category) updateData.category = form.category;
    if (form.subcategory) updateData.subcategory = form.subcategory;

    updateClient(updateData);
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] fixed top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/4 w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200 p-6 overflow-visible">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
          <DialogDescription>Update client details below</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Full Name*</Label>
              <Input
                value={form.fullName || ""}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Enter full name"
                required
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Email*</Label>
              <Input
                type="email"
                value={form.email || ""}
                disabled
                placeholder="Email cannot be changed"
                className="bg-gray-100"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Phone</Label>
              <Input
                value={form.mobile || ""}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Category</Label>
              <Select
                value={form.category as string}
                onValueChange={(value) => setForm({ ...form, category: value, subcategory: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat._id} value={cat._id}>
                      {cat.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.category && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Subcategory</Label>
                <Select
                  value={form.subcategory as string}
                  onValueChange={(value) => setForm({ ...form, subcategory: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((subcat: any) => (
                      <SelectItem key={subcat._id} value={subcat._id}>
                        {subcat.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" type="submit" disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------
// Utility helpers for category/subcategory titles
// ------------------------------
function findCategoryTitle(category: any, categoriesList: any[]) {
  if (!category) return "—";
  if (typeof category === "object") return category.title || category.name || "—";
  const found = categoriesList?.find((c: any) => String(c._id) === String(category) || String(c.id) === String(category));
  return found?.title || "—";
}
function findSubcategoryTitle(subcat: any, subcategoriesList: any[]) {
  if (!subcat) return "—";
  if (typeof subcat === "object") return subcat.title || "—";
  const found = subcategoriesList?.find((s: any) => String(s._id) === String(subcat) || String(s.id) === String(subcat));
  return found?.title || "—";
}

// ------------------------------
// Linked Consultants Cell Component
// ------------------------------
function LinkedConsultantsCell({ client }: { client: Client }) {
  const clientId = client._id || client.id;
  useAutoLinkConsultant(clientId);

  const { data: linkedConsultantsData } = useQuery({
    queryKey: ["client-consultants", clientId],
    queryFn: () => {
      if (!clientId) return Promise.resolve({ data: [] });
      return ClientConsultantAPI.getClientConsultants(clientId);
    },
    enabled: !!clientId,
  });

  // Normalize: API may return { data: [...], total } or array [...]
  const linkedConsultants = useMemo(() => {
    const payload = linkedConsultantsData?.data ?? linkedConsultantsData ?? [];

    const arr = Array.isArray(payload) ? payload : payload?.data ?? payload;
    return (arr || []).filter((c: any) => c !== null && c !== undefined);
  }, [linkedConsultantsData]);


  if (linkedConsultants.length === 0) return <span className="text-sm text-muted-foreground">—</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {linkedConsultants.slice(0, 2).map((consultant: any) => {
        if (!consultant) return null;
        const consultantId = consultant._id || consultant.id;
        const consultantName =
          consultant.displayName ||
          consultant.name ||
          consultant.fullName ||
          (consultant.firstName && consultant.lastName ? `${consultant.firstName} ${consultant.lastName}`.trim() : null) ||
          consultant.firstName ||
          consultant.lastName ||
          "Consultant";
        return (
          <Badge key={consultantId} variant="secondary" className="text-xs">
            {consultantName}
          </Badge>
        );
      })}
      {linkedConsultants.length > 2 && <Badge variant="outline" className="text-xs">+{linkedConsultants.length - 2}</Badge>}
    </div>
  );
}

// ------------------------------
// Auto-link logged-in consultant to client
// ------------------------------
const autoLinkAttempted = new Set<string>();

function useAutoLinkConsultant(clientId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [hasAttempted, setHasAttempted] = useState(false);

  const { data: consultantsData } = useQuery({
    queryKey: ["consultants"],
    queryFn: () => ConsultantAPI.getAll(),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: () => UserAPI.getAllUsers(),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const currentConsultant = useMemo(() => {
    if (!user?.email) return null;

    if (consultantsData?.data) {
      const consultant = consultantsData.data.find((c: any) => c.email?.toLowerCase() === user.email?.toLowerCase());
      if (consultant) return consultant;
    }

    if (usersData?.data) {
      const consultantUser = (usersData.data as any[]).find((u: any) => u.email?.toLowerCase() === user.email?.toLowerCase() && u.role === "Consultant");
      if (consultantUser) {
        return { _id: consultantUser._id || consultantUser.id, id: consultantUser._id || consultantUser.id, email: consultantUser.email, name: consultantUser.fullName, displayName: consultantUser.fullName };
      }
    }

    return null;
  }, [user?.email, consultantsData?.data, usersData?.data]);

  const consultantId = currentConsultant?._id || currentConsultant?.id;
  const shouldCheckRelationship = !!clientId && !!consultantId;

  const { data: relationshipsData } = useQuery({
    queryKey: ["relationships", clientId, consultantId],
    queryFn: () => {
      if (!clientId || !consultantId) return Promise.resolve({ data: [] });
      return ClientConsultantAPI.getAll({ clientId, consultantId });
    },
    enabled: shouldCheckRelationship,
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  const isLinked = useMemo(() => {
    const payload = relationshipsData?.data ?? relationshipsData ?? [];
    const arr = Array.isArray(payload) ? payload : payload?.data ?? payload;
    return (arr || []).some((rel: any) => rel.status === "Active" || !rel.status);
  }, [relationshipsData]);

  const { mutate: autoLink } = useMutation({
    mutationFn: ({ clientId, consultantId }: { clientId: string; consultantId: string }) => ClientConsultantAPI.link({ clientId, consultantId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-consultants", clientId] });
      queryClient.invalidateQueries({ queryKey: ["consultant-clients", consultantId] });
      queryClient.invalidateQueries({ queryKey: ["relationships", clientId, consultantId] });
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      autoLinkAttempted.add(clientId as string);
      setHasAttempted(true);
    },
    onError: (err: any) => {
      autoLinkAttempted.add(clientId as string);
      setHasAttempted(true);
      const errorMsg = err?.response?.data?.message || "";
      if (!(errorMsg.includes("duplicate") || errorMsg.includes("already exists") || err?.response?.status === 409)) {
        console.error("Auto-link failed:", err);
      }
    },
  });

  useEffect(() => {
    if (!clientId || !consultantId) return;
    if (hasAttempted || autoLinkAttempted.has(clientId) || isLinked) return;

    autoLinkAttempted.add(clientId);
    setHasAttempted(true);

    const timeoutId = setTimeout(() => {
      autoLink({ clientId: clientId as string, consultantId: consultantId as string });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [clientId, consultantId, isLinked, hasAttempted, autoLink]);
}

// ------------------------------
// Main Page
// ------------------------------
export default function ClientManagement() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("All Status");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [delId, setDelId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get current consultant
  const { data: consultantsData } = useQuery({
    queryKey: ["consultants"],
    queryFn: () => ConsultantAPI.getAll(),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  const { data: usersDataForConsultantCheck } = useQuery({
    queryKey: ["users", "for-consultant-check"],
    queryFn: () => UserAPI.getAllUsers(),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  // fetch categories/subcategories for title lookups
  const { data: categoriesData } = useQuery({ queryKey: ["categories"], queryFn: CategoryAPI.getAll });
  const { data: subcategoriesData } = useQuery({
    queryKey: ["subcategories"],
    queryFn: () => SubcategoryAPI.getAll(),
  });

  const categories = categoriesData?.data || [];
  const subcategories = subcategoriesData?.data || [];

  const currentConsultant = useMemo(() => {
    if (!user?.email) return null;
    if (consultantsData?.data) {
      const consultant = consultantsData.data.find((c: any) => c.email?.toLowerCase() === user.email?.toLowerCase());
      if (consultant) return consultant;
    }
    if (usersDataForConsultantCheck?.data) {
      const consultantUser = (usersDataForConsultantCheck.data as any[]).find((u: any) => u.email?.toLowerCase() === user.email?.toLowerCase() && u.role === "Consultant");
      if (consultantUser) {
        return { _id: consultantUser._id || consultantUser.id, id: consultantUser._id || consultantUser.id, email: consultantUser.email, name: consultantUser.fullName, displayName: consultantUser.fullName };
      }
    }
    return null;
  }, [user?.email, consultantsData?.data, usersDataForConsultantCheck?.data]);

  const consultantId = currentConsultant?._id || currentConsultant?.id;

  // Fetch linked clients for the logged-in consultant (controller now returns { data: [...], total })
  const { data: linkedClientsDataRaw, isLoading: isLoadingLinkedClients } = useQuery({
    queryKey: ["consultant-clients", consultantId],
    queryFn: async () => {
      if (!consultantId) return { data: [] };
      try {
        const res = await ClientConsultantAPI.getConsultantClients(consultantId);

        console.log("res", res)
        return res;
      } catch (err) {
        console.error("Error fetching consultant clients:", err);
        return { data: [] };
      }
    },
    enabled: !!consultantId,
    staleTime: 2 * 60 * 1000,
  });


  // Normalize linked clients array: support both { data: [...] } and [...]
  const linkedClientsArray = useMemo(() => {
    if (!linkedClientsDataRaw) return [];
    if (Array.isArray(linkedClientsDataRaw)) return linkedClientsDataRaw;
    if (Array.isArray(linkedClientsDataRaw.data.data)) return linkedClientsDataRaw.data.data;
    return [];
  }, [linkedClientsDataRaw]);

  // Create a Set of linked client IDs for quick lookup
  const linkedClientIds = useMemo(() => {
    const ids = linkedClientsArray
      .map((client: any) => {
        const clientObj = client.client || client;
        return clientObj?._id || clientObj?.id;
      })
      .filter(Boolean);
    return new Set(ids);
  }, [linkedClientsArray]);

  // Fetch all users
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["users"],
    queryFn: () => UserAPI.getAllUsers(),
    retry: (failureCount, err: any) => {
      if (err?.response?.status === 401 || err?.response?.status === 403) return false;
      return failureCount < 2;
    },
  });

  // Filter users with Client role and only show linked clients
  const allClients = useMemo(() => {
    // If linkedClientsArray contains populated client objects, prefer that
    if (linkedClientsArray.length > 0) {
      return linkedClientsArray.map((client: any) => {
        const clientData = client.client || client;
        const categoryTitle = findCategoryTitle(clientData.category, categories);
        const subcategoryTitle = findSubcategoryTitle(clientData.subcategory, subcategories);

        return {
          id: clientData._id || clientData.id,
          _id: clientData._id || clientData.id,
          name: clientData.fullName || clientData.name || "Client",
          fullName: clientData.fullName,
          category: clientData.category,
          subcategory: clientData.subcategory,
          phone: clientData.mobile || clientData.phone || "—",
          mobile: clientData.mobile,
          email: clientData.email || "—",
          status: clientData.status || "Active",
          createdAt: clientData.createdAt || clientData.created_at || "",
          sessions: clientData.sessions || 0,
          lastSessionDate: clientData.lastSessionDate || null,
          lastSessionTime: clientData.lastSessionTime || null,
          lastSessionAt: clientData.lastSessionAt || null,
          avatar: clientData.avatar || clientData.profileImage || clientData.image || "",
        } as Client & { createdAt: string };
      });
    }

    // fallback to filtering all users by role + linkedClientIds
    const users = (data?.data || []) as any[];
    const filtered = users.filter((user: any) => {
      const userId = user._id || user.id;
      const isClient = user.role === "Client";
      const isLinked = linkedClientIds.has(userId);
      return isClient && isLinked;
    });

    return filtered.map((user: any) => ({
      id: user._id || user.id,
      _id: user._id || user.id,
      name: user.fullName || "Client",
      fullName: user.fullName,
      category: user.category,
      subcategory: user.subcategory,
      phone: user.mobile || "—",
      mobile: user.mobile,
      email: user.email || "—",
      status: user.status || "Active",
      createdAt: user.createdAt || user.created_at || "",
      sessions: 0,
      lastSession: "-",
      avatar: user.avatar || user.profileImage || user.image || "",
    } as Client & { createdAt: string }));
  }, [data, linkedClientIds, linkedClientsArray, categories, subcategories]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return allClients.filter((r) => {
      const okStatus = status === "All Status" ? true : r.status === status;
      const okQ = !query || (r.name || "").toLowerCase().includes(query) || (r.email || "").toLowerCase().includes(query);
      return okStatus && okQ;
    });
  }, [allClients, q, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);




  // Status toggle mutation
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => {
      const client = allClients.find((c) => (c._id || c.id) === id);
      if (!client) return Promise.reject(new Error("Client not found"));
      return UserAPI.updateUser(id, {
        fullName: client.fullName,
        email: client.email,
        mobile: client.mobile,
        role: "Client",
        status,
        category: client.category?._id || client.category,
        subcategory: client.subcategory?._id || client.subcategory,
      });
    },
    onSuccess: () => {
      toast.success("Client status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["consultant-clients", consultantId] });
    },
    onError: (err: any) => {
      const statusCode = err?.response?.status;
      if (statusCode === 401) {
        toast.error("Authentication failed. Please login again.");
      } else if (statusCode === 403) {
        toast.error("Access denied. Admin privileges required.");
      } else {
        toast.error(err?.response?.data?.message || "Failed to update status");
      }
    },
  });

  const handleStatusToggle = (client: Client) => {
    const newStatus = client.status === "Active" ? "Inactive" : "Active";
    const clientIdLocal = client._id || client.id;
    if (clientIdLocal) updateStatus({ id: clientIdLocal, status: newStatus });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return "—";
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return "—";
    }
  };

  const formatRawDateTime = (dateStr: string, timeStr: string, dateTimeStr?: string) => {
    if (!dateStr || !timeStr) {
      if (dateTimeStr) return formatDateTime(dateTimeStr);
      return "—";
    }
    // dateStr is YYYY-MM-DD usually if from legacy 'date' field
    // timeStr is "HH:mm AM"
    try {
      const [y, m, d] = dateStr.split('-');
      // Display as DD/MM/YYYY, HH:MM AM/PM
      if (y && m && d) {
        return `${d}/${m}/${y}, ${timeStr}`;
      }
      // fallback
      return `${dateStr}, ${timeStr}`;
    } catch {
      return `${dateStr}, ${timeStr}`;
    }
  };

  useEffect(() => {
    if (isError && error) {
      const err = error as any;
      const status = err?.response?.status;
      const message = err?.response?.data?.message || "Failed to load clients";
      if (status === 401) toast.error("Unauthorized. Please login.");
      else if (status === 403) toast.error("Forbidden. Access required.");
      else toast.error(message);
    }
  }, [isError, error]);

  const isLoadingData = isLoading || isLoadingLinkedClients || !consultantId;

  return (
    <div className="p-4 sm:p-6 space-y-4">


      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <span className="text-sm text-red-800">{(error as any)?.response?.data?.message || "Error loading clients"}</span>
        </div>
      )}

      <Card className="border-muted/50">
        <CardContent className="p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-[520px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/4 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search clients by name or email..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <div className="flex items-center gap-2">
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Status">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-muted/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium py-3 pl-6">Name</th>

                  <th className="text-left font-medium py-3">Created At</th>
                  <th className="text-left font-medium py-3">Sessions</th>
                  <th className="text-left font-medium py-3">Last Sessions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={r.avatar} />
                          <AvatarFallback>{(r.name || "").split(" ").map((s) => s[0]).join("")}</AvatarFallback>
                        </Avatar>
                        <div onClick={() => navigate(`/client-profile/${r.id}`)} className="cursor-pointer">
                          <div className="font-medium">{r.name}</div>

                        </div>
                      </div>
                    </td>

                    <td className="py-4"><span className="text-sm text-muted-foreground">{formatDate((r as any).createdAt)}</span></td>
                    <td className="py-4">{r.sessions || 0}</td>
                    <td className="py-4">{formatRawDateTime(r.lastSessionDate, r.lastSessionTime, r.lastSessionAt)}</td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted-foreground">No results</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Showing</span>
              <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-[72px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>Results</span>
            </div>
            <Pagination page={page} pages={pages} onChange={setPage} />
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
