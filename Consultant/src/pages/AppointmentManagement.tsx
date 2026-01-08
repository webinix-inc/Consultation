// src/components/AppointmentManagementConsultant.tsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  Search,
  Plus,
  Trash2,
  Edit,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Video,
  Calendar,
  Clock,
  CreditCard,
  CheckSquare,
  XCircle,
  CalendarClock,
  Phone,
} from "lucide-react";
import { checkIsNowFromDates } from "@/utils/dateTimeUtils";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import AppointmentAPI from "@/api/appointment.api";
import UserAPI from "@/api/user.api";
import CategoryAPI from "@/api/category.api";
import ConsultantAPI from "@/api/consultant.api";
import ClientConsultantAPI from "@/api/clientConsultant.api";
import { MiniCalendar, useMonthMatrix } from "@/components/appointments/MiniCalendar";
import { ScheduleModal } from "@/components/appointments/ScheduleModal";
import { ConfirmModal } from "@/components/appointments/ConfirmModal";
import { DetailsModal } from "@/components/appointments/DetailsModal";
import { EditModal } from "@/components/appointments/EditModal";
import { RescheduleModal } from "@/components/appointments/RescheduleModal";

/* ==================   Types ================== */
type Appointment = {
  id: string;
  client: string;
  consultant: string;
  category: string;
  session: string;
  date: string;
  time: string;
  status: "Upcoming" | "Completed" | "Cancelled";
  reason?: string;
  notes?: string;
  fee?: string;
  rawDate?: string;
  startAt?: Date;
  endAt?: Date;
  meetingLink?: string;
};
type Slot = string;
type RawAppointmentResponse = any;

type SchedulePayload = {
  client: string;
  consultant: string; // consultant id
  date: Date;
  time: Slot | null;
  session: "Video Call";
  reason: string;
  notes: string;
};

/* === Small utils ================== */
const fade = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.95 },
};

function normalizeTimeString(t: string) {
  if (!t) return "";
  if (t.includes("AM") || t.includes("PM")) {
    const [timePart, ampm] = t.split(" ");
    let [h, m] = timePart.split(":").map(Number);
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  // assume already "HH:mm"
  return t;
}

function parseSlotToRange(date: Date, slot: string, durationMin = 60) {
  const base = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  let startH = 0, startM = 0;
  let endH = 0, endM = 0;
  let hasExplicitEnd = false;

  if (slot.includes(" - ")) {
    const [startStr, endStr] = slot.split(" - ");
    const [sh, sm] = startStr.split(":").map(Number);
    const [eh, em] = endStr.split(":").map(Number);
    startH = sh;
    startM = isNaN(sm) ? 0 : sm;
    endH = eh;
    endM = isNaN(em) ? 0 : em;
    hasExplicitEnd = true;
  } else if (slot.includes("AM") || slot.includes("PM")) {
    const [timePart, ampm] = slot.split(" ");
    const [h, m] = timePart.split(":").map(Number);
    startH = h;
    startM = isNaN(m) ? 0 : m;
    if (ampm === "PM" && startH < 12) startH += 12;
    if (ampm === "AM" && startH === 12) startH = 0;
  } else {
    const [h, m] = slot.split(":").map(Number);
    startH = h;
    startM = isNaN(m) ? 0 : m;
  }

  const start = new Date(base);
  start.setHours(startH, startM, 0, 0);

  let end;
  if (hasExplicitEnd) {
    end = new Date(base);
    end.setHours(endH, endM, 0, 0);
  } else {
    end = new Date(start.getTime() + durationMin * 60 * 1000);
  }

  return { start, end };
}

function formatToDisplay(d: Date) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatHHMM(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isoDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}



/* ========== Mini Calendar ================== */
/* ========== Mini Calendar ================== */
// useMonthMatrix and MiniCalendar are now imported from @/components/appointments/MiniCalendar

/* ================== Main Component ================== */

const AppointmentManagementConsultant: React.FC = () => {
  const location = useLocation();
  const [openModal, setOpenModal] = useState<"none" | "schedule" | "confirm" | "edit" | "details" | "delete" | "status" | "reschedule">("none");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("Card");

  const queryClient = useQueryClient();

  // Check if consultantId was passed via navigation state
  const consultantIdFromState = (location.state as any)?.consultantId;

  // search / filters / pagination (same as admin)
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "today" | "incoming">("all");
  const [statusFilter, setStatusFilter] = useState<"" | "Upcoming" | "Completed" | "Cancelled">("");;
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // debounce search (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // --- Get current user from localStorage ---
  const getCurrentFromStorage = () => {
    try {
      const raw = typeof window !== "undefined" && (localStorage.getItem("currentUser") || localStorage.getItem("user"));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  // Get current user and role - use state to ensure reactivity
  const [currentUser, setCurrentUser] = useState<any | null>(() => getCurrentFromStorage());
  const userRole = currentUser?.role || "Consultant"; // Default to Consultant for backward compatibility
  const isClient = userRole === "Client";
  const isConsultant = userRole === "Consultant";

  // Debug: Log user role detection
  useEffect(() => {
    console.log("Current User:", currentUser);
    console.log("User Role:", userRole);
    console.log("Is Client:", isClient);
  }, [currentUser, userRole, isClient]);

  // Update currentUser when localStorage changes (simple mount check)
  useEffect(() => {
    const user = getCurrentFromStorage();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const userId = currentUser?._id || currentUser?.id || null;


  // --- Fetch categories ---
  const { data: categoriesData } = useQuery<RawAppointmentResponse>({
    queryKey: ["categories"],
    queryFn: () => CategoryAPI.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const categories = categoriesData?.data || [];

  // --- Fetch active consultants (for Client role) ---
  const { data: consultantsData, isLoading: isLoadingUsers, error: usersError } = useQuery({
    queryKey: ["active-consultants"],
    queryFn: async () => {
      const response = await UserAPI.getActiveConsultants();
      return response;
    },
    enabled: isClient,
    staleTime: 5 * 60 * 1000,
  });

  // Normalize active consultants
  const activeConsultants = useMemo(() => {
    if (!isClient) return [];
    let raw: any[] = [];
    if (!consultantsData) return [];
    if (Array.isArray(consultantsData)) raw = consultantsData as any[];
    else if (consultantsData.data && Array.isArray(consultantsData.data)) raw = consultantsData.data;
    else if ((consultantsData as any).success && Array.isArray((consultantsData as any).data)) raw = (consultantsData as any).data;

    const mapped = raw.map((u: any) => ({
      ...u,
      fullName: u.fullName || u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Unknown",
      _id: u._id || u.id,
      id: u._id || u.id,
    }));

    return mapped;
  }, [consultantsData, isClient]);

  // --- Initialize current consultant/user ---
  const [currentConsultant, setCurrentConsultant] = useState<any | null>(() => {
    const user = getCurrentFromStorage();
    if (isConsultant) return user;
    return null;
  });

  useEffect(() => {
    if (isConsultant && currentUser) {
      setCurrentConsultant(currentUser);
    }
  }, [isConsultant, currentUser]);

  const currentConsultantId = useMemo(() => {
    if (!currentConsultant) return "";
    return currentConsultant._id || currentConsultant.id || "";
  }, [currentConsultant]);

  // --- Fetch appointments ---
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["appointments", debouncedSearch, statusFilter, page, userId],
    queryFn: async () => {
      try {
        return await AppointmentAPI.getAll();
      } catch (err) {
        console.error("Error fetching appointments:", err);
        return await AppointmentAPI.getAll();
      }
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });



  // --- Fetch linked clients for the logged-in consultant (only for Consultant role) ---
  const {
    data: linkedClientsRaw,
    isLoading: isLoadingLinkedClients,
  } = useQuery({
    queryKey: ["consultant-clients", currentConsultantId],
    queryFn: async () => {
      if (!currentConsultantId) return [];
      const result = await ClientConsultantAPI.getConsultantClients(currentConsultantId);
      return result?.data || result || [];
    },
    enabled: isConsultant && !!currentConsultantId,
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  const clients = useMemo(() => {
    if (!isConsultant) return [];
    if (Array.isArray(linkedClientsRaw)) return linkedClientsRaw;
    if (linkedClientsRaw?.data && Array.isArray(linkedClientsRaw.data)) return linkedClientsRaw.data;
    return [];
  }, [linkedClientsRaw, isConsultant]);

  /* Schedule state */
  const [sched, setSched] = useState<SchedulePayload>({
    client: "",
    consultant: "",
    date: new Date(),
    time: null,
    session: "Video Call",
    reason: "",
    notes: "",
  });

  const [selectedCategory, setSelectedCategory] = useState("");

  const filteredConsultants = useMemo(() => {
    if (!selectedCategory) return [];
    return activeConsultants.filter((c: any) => {
      const catId = c.category?._id || c.category?.id || c.category;
      return String(catId) === String(selectedCategory);
    });
  }, [activeConsultants, selectedCategory]);

  const appointmentsRaw: any[] = useMemo(() => {
    if (!data) return [];
    // cases:
    // 1) API returns an array directly -> return that
    if (Array.isArray(data)) return data;
    // 2) API returns { data: [ ... ] }
    if (Array.isArray((data as any).data)) return (data as any).data;
    // 3) API returns { data: { data: [ ... ] } }
    if (Array.isArray((data as any).data?.data)) return (data as any).data.data;
    // fallback: try to find any array value on the object
    const values = Object.values(data).find((v) => Array.isArray(v));
    return Array.isArray(values) ? (values as any[]) : [];
  }, [data]);
  // Auto-set client if user is Client role
  useEffect(() => {
    if (isClient && currentUser) {
      setSched((s) => ({ ...s, client: currentUser._id || currentUser.id || "" }));
    }
  }, [isClient, currentUser]);

  // Auto-set consultant if user is Consultant role
  useEffect(() => {
    if (isConsultant && currentConsultant) {
      setSched((s) => ({ ...s, consultant: currentConsultant._id || currentConsultant.id || "" }));
    }
  }, [isConsultant, currentConsultant]);

  // Auto-set consultant from navigation state (for Client role booking from consultants page)
  useEffect(() => {
    if (isClient && consultantIdFromState && activeConsultants.length > 0) {
      const consultant = activeConsultants.find((c: any) => {
        const cId = c._id || c.id;
        return String(cId) === String(consultantIdFromState);
      });
      if (consultant) {
        setSched((s) => ({ ...s, consultant: consultant._id || consultant.id || "" }));
        // Auto-open schedule modal if consultant is pre-selected
        setOpenModal("schedule");
      }
    }
  }, [isClient, consultantIdFromState, activeConsultants]);

  /* Mapped appointments (role-based) */
  const mappedAppointments: Appointment[] = useMemo(() => {
    // const raw = Array.isArray(data?.data?.data) ? data.data.data : Array.isArray(data?.data) ? data.data : [];
    const raw = appointmentsRaw;
    console.log("📋 [FRONTEND] Appointments Data Received:", raw.length, "items");
    console.log("  Current User ID:", userId);
    console.log("  User Role:", isClient ? "Client" : isConsultant ? "Consultant" : "Unknown");

    const userEmail = (currentUser?.email || "").toString().trim().toLowerCase();

    const filtered = (raw as any[]).filter((it: any) => {
      if (!userId) return true;
      if (!it) return false;

      // Log first item for debugging structure
      if (it === raw[0]) {
        console.log("  Sample Appointment Item:", {
          id: it._id || it.id,
          client: it.client,
          consultant: it.consultant,
          status: it.status
        });
      }

      if (isClient) {
        let apptClientId = "";
        if (it.client && typeof it.client === "object") apptClientId = it.client._id || it.client.id || "";
        else apptClientId = it.client || it.clientId || "";
        return String(apptClientId) === String(userId);
      } else if (isConsultant) {
        let apptConsId = "";
        let apptConsEmail = "";
        if (it.consultant && typeof it.consultant === "object") {
          apptConsId = it.consultant._id || it.consultant.id || "";
          apptConsEmail = (it.consultant.email || "").toString().trim().toLowerCase();
        } else {
          apptConsId = it.consultant || it.consultantId || "";
        }

        if (String(apptConsId) === String(userId)) return true;
        if (userEmail && apptConsEmail && userEmail === apptConsEmail) return true;
        return false;
      }

      return false;
    });

    return filtered.map((it: any) => {
      const start = it.startAt ? new Date(it.startAt) : null;
      const end = it.endAt ? new Date(it.endAt) : (start ? new Date(start.getTime() + 60 * 60 * 1000) : null);

      const dateStr = start ? start.toLocaleDateString() : it.date ? new Date(it.date).toLocaleDateString() : "";
      const timeStr = start && end ? `${formatToDisplay(start)} to ${formatToDisplay(end)}` : "";

      let resolvedCategory = it.category;
      if (!resolvedCategory || resolvedCategory === "N/A" || resolvedCategory === "General") {
        const snapCat = it.consultantSnapshot?.category;
        if (snapCat) {
          resolvedCategory = typeof snapCat === 'object' ? (snapCat.name || snapCat.title || "General") : snapCat;
        } else {
          const liveCat = it.consultant?.category;
          if (liveCat) {
            resolvedCategory = typeof liveCat === 'object' ? (liveCat.name || liveCat.title || "General") : liveCat;
          }
        }
      }
      resolvedCategory = resolvedCategory || "General";

      return {
        id: it._id || it.id,
        client: it.clientName || (typeof it.client === "string" ? it.client : it.client?.fullName || it.client?.name) || "Client",
        consultant: it.consultantName || (typeof it.consultant === "string" ? it.consultant : it.consultant?.fullName || it.consultant?.name) || "NA",
        category: resolvedCategory,
        session: it.session || "Video Call",
        date: dateStr,
        time: timeStr,
        status: (it.status as any) || "Upcoming",
        reason: it.reason,
        notes: it.notes,
        fee: it.fee !== undefined && it.fee !== null ? `₹${Number(it.fee).toLocaleString("en-IN")}` : undefined,
        rawDate: it.date,
        startAt: start,
        endAt: end,
        meetingLink: it.meetingLink || it.agora?.channelName || `appointment-${it._id || it.id}`,
      } as Appointment;
    });
  }, [data, currentUser, isClient, isConsultant, userId]);

  /* Client-side filtering */
  const filteredAppointments = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return mappedAppointments.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;

      if (activeFilter === "today") {
        if (!a.date) return false;
        const ad = new Date(a.date);
        ad.setHours(0, 0, 0, 0);
        if (ad.getTime() !== today.getTime()) return false;
      } else if (activeFilter === "incoming") {
        if (!a.date) return false;
        const ad = new Date(a.date);
        ad.setHours(0, 0, 0, 0);
        if (ad.getTime() < today.getTime()) return false;
        if (a.status !== "Upcoming") return false;
      }

      if (!q) return true;
      const fields = [a.client || "", a.consultant || "", a.category || "", a.reason || "", a.notes || ""].join(" ").toLowerCase();
      return fields.includes(q);
    }).sort((a, b) => {
      const isUpcomingA = a.status === "Upcoming";
      const isUpcomingB = b.status === "Upcoming";

      // 1. Group Priority: Upcoming/Confirmed comes before others
      if (isUpcomingA && !isUpcomingB) return -1;
      if (!isUpcomingA && isUpcomingB) return 1;

      // 2. Compare Timestamps
      const timeA = a.startAt ? a.startAt.getTime() : 0;
      const timeB = b.startAt ? b.startAt.getTime() : 0;

      // 3. Sort within groups
      if (isUpcomingA) {
        // Upcoming: Ascending (Earliest first)
        return timeA - timeB;
      } else {
        // Others (Past/Cancelled): Descending (Latest first)
        return timeB - timeA;
      }
    });
  }, [mappedAppointments, debouncedSearch, activeFilter, statusFilter]);

  /* Pagination */
  const totalResults = filteredAppointments.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAppointments.slice(start, start + pageSize);
  }, [filteredAppointments, page]);

  /* Colors */
  const categoryColors: Record<string, string> = {
    Health: "bg-pink-100 text-pink-700",
    Finance: "bg-blue-100 text-blue-700",
    Legal: "bg-yellow-100 text-yellow-700",
    IT: "bg-indigo-100 text-indigo-700",
    Construction: "bg-green-100 text-green-700",
  };

  const statusColors: Record<string, string> = {
    Upcoming: "bg-purple-100 text-purple-700",
    Completed: "bg-green-100 text-green-700",
    Cancelled: "bg-gray-100 text-gray-700",
  };

  /* Mutations */
  const createMutation = useMutation({
    mutationFn: (payload: any) => AppointmentAPI.create(payload),
    onSuccess: () => {
      toast.success("Appointment scheduled");
      setOpenModal("none");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      setSched((s) => ({ ...s, client: "", time: null, session: "Video Call", reason: "", notes: "" }));
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || err?.error || "Failed to create appointment";
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => AppointmentAPI.update(id, data),
    onSuccess: () => {
      toast.success("Appointment updated");
      setOpenModal("none");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Failed to update";
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => AppointmentAPI.remove(id),
    onSuccess: () => {
      toast.success("Appointment deleted");
      setOpenModal("none");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Failed to delete";
      toast.error(msg);
    },
  });

  const closeModal = () => {
    setSelected(null);
    setOpenModal("none");
  };

  const generateTimeSlots = (startHour = 9, endHour = 17, stepMin = 60): string[] => {
    const slots: string[] = [];
    for (let h = startHour; h <= endHour; h++) {
      const hh = String(h).padStart(2, "0");
      slots.push(`${hh}:00`);
    }
    return slots;
  };
  const TIME_SLOTS = generateTimeSlots(9, 17, 60);

  // Check availability (local)
  const isTimeSlotAvailable = useCallback(
    (date: Date, timeSlot: string, slotDurationMin = 60) => {
      // const appointments = Array.isArray(data?.data) ? data.data : [];
      const appointments = appointmentsRaw;
      if (!appointments.length) return true;

      const { start: slotStart, end: slotEnd } = parseSlotToRange(date, timeSlot, slotDurationMin);
      const uid = currentUser?._id || currentUser?.id || "";

      return !appointments.some((appt: any) => {
        if (appt.status === "Cancelled") return false;
        if (isConsultant) {
          const apptConsId = appt.consultant?._id || appt.consultant?.id || appt.consultant;
          if (String(apptConsId) !== String(uid)) return false;
        } else if (isClient) {
          const apptClientId = appt.client?._id || appt.client?.id || appt.client;
          if (String(apptClientId) !== String(uid)) return false;
        } else {
          return false;
        }

        if (appt.startAt && appt.endAt) {
          const aStart = new Date(appt.startAt);
          const aEnd = new Date(appt.endAt);
          return slotStart < aEnd && slotEnd > aStart;
        }



        return false;
      });
    },
    [data, currentUser, isConsultant, isClient]
  );

  const getAvailableTimeSlotsLocal = useCallback((date: Date) => {
    const slots = TIME_SLOTS.filter((s) => isTimeSlotAvailable(date, s));

    // Filter out past time slots if the selected date is today
    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (isToday) {
      const currentHour = today.getHours();
      const currentMinute = today.getMinutes();

      return slots.filter((slot) => {
        // Parse slot time (format: "HH:mm" or "HH:mm - HH:mm")
        const slotTime = slot.includes(" - ") ? slot.split(" - ")[0] : slot;
        const [slotHour, slotMinute] = slotTime.split(":").map(Number);

        // Check if slot time is in the future
        return slotHour > currentHour || (slotHour === currentHour && slotMinute > currentMinute);
      });
    }

    return slots;
  }, [TIME_SLOTS, isTimeSlotAvailable]);

  /* Server-based available slots query */
  const selectedDateISO = useMemo(() => isoDateOnly(sched.date), [sched.date]);
  const consultantIdForSlots = isClient ? sched.consultant : (currentConsultant?._id || currentConsultant?.id || "");

  const availableSlotsQuery = useQuery({
    queryKey: ["available-slots", "consultant", consultantIdForSlots, selectedDateISO],
    queryFn: async () => {
      if (!consultantIdForSlots || !selectedDateISO) return [];
      try {
        console.log("Fetching slots for consultant:", consultantIdForSlots, "date:", selectedDateISO);
        const slots = await AppointmentAPI.getAvailableSlots(consultantIdForSlots, selectedDateISO, 60);
        console.log("Received slots from server:", slots);
        return Array.isArray(slots) ? slots : [];
      } catch (err) {
        console.warn("available slots fetch failed:", err);
        return [];
      }
    },
    enabled: !!consultantIdForSlots && !!selectedDateISO,
    staleTime: 30 * 1000,
  });

  const availableSlotsFromServer = availableSlotsQuery.data || [];

  // Debug: Log when slots data changes
  useEffect(() => {
    if (availableSlotsFromServer.length > 0) {
      console.log("Available slots from server:", availableSlotsFromServer);
    }
  }, [availableSlotsFromServer]);

  /* CLIENT-SIDE SLOT LOGIC */
  const clientBusySlots = useMemo(() => {
    const clientId = sched.client;
    // const allAppointments = Array.isArray(data?.data) ? data.data : [];
    const allAppointments = appointmentsRaw;
    if (!clientId || !allAppointments.length) return [];

    const selectedDateStr = isoDateOnly(sched.date);

    return allAppointments
      .map((appt: any) => {
        if (appt.status === "Cancelled") return null;
        const apptClientId = appt.client?._id || appt.client?.id || appt.client;
        if (String(apptClientId) !== String(clientId)) return null;

        let start: Date | null = null;
        let end: Date | null = null;

        if (appt.startAt) {
          start = new Date(appt.startAt);
          end = appt.endAt ? new Date(appt.endAt) : new Date(start.getTime() + 60 * 60 * 1000);
        } else {
          return null;
        }

        if (isoDateOnly(start) !== selectedDateStr) return null;
        return { start, end };
      })
      .filter(Boolean) as { start: Date; end: Date }[];
  }, [sched.client, sched.date, data]);

  const getSlotsToRender = (date: Date) => {
    // For clients: only need consultant selected
    if (isClient) {
      if (!sched.consultant) return [];
    }
    // For consultants: need client selected
    if (isConsultant) {
      if (!sched.client) return [];
    }

    let consultantSlots = (availableSlotsFromServer && availableSlotsFromServer.length > 0)
      ? availableSlotsFromServer
      : [];

    // Filter out past time slots if the selected date is today
    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (isToday) {
      const currentHour = today.getHours();
      const currentMinute = today.getMinutes();

      consultantSlots = consultantSlots.filter((slot: string) => {
        // Parse slot time (format: "HH:mm - HH:mm")
        const slotTime = slot.includes(" - ") ? slot.split(" - ")[0] : slot;
        const [slotHour, slotMinute] = slotTime.split(":").map(Number);

        // Check if slot time is in the future
        return slotHour > currentHour || (slotHour === currentHour && slotMinute > currentMinute);
      });
    }

    // If consultant booking for a client, filter out client's busy slots
    const clientBusy = clientBusySlots;
    if (clientBusy.length === 0) return consultantSlots;

    return consultantSlots.filter((slotStr: string) => {
      const { start: slotStart, end: slotEnd } = parseSlotToRange(date, slotStr, 60);
      const isOverlapping = clientBusy.some((busyRange) => {
        return slotStart < busyRange.end && slotEnd > busyRange.start;
      });
      return !isOverlapping;
    });
  };

  /* Confirm booking handler (Pre-check) */
  const handlePreBooking = async () => {
    if (!sched.client || !sched.consultant || !sched.time || !sched.date || !sched.session) {
      toast.error("Please fill all required fields");
      return;
    }

    const consultantIdForCheck = isClient ? sched.consultant : (currentConsultant?._id || currentConsultant?.id || "");
    try {
      const dateISO = isoDateOnly(sched.date);
      if (consultantIdForCheck) {
        const slots = await AppointmentAPI.getAvailableSlots(consultantIdForCheck, dateISO, 60);
        if (Array.isArray(slots) && slots.length > 0) {
          // Check if selected slot exists in available slots
          if (!slots.includes(sched.time as string)) {
            // Fallback check if it's just "HH:mm"
            const normalizedSelected = normalizeTimeString(sched.time as string);
            const normalizedSlots = slots.map(s => s.split(" - ")[0]);
            if (!slots.includes(sched.time as string) && !normalizedSlots.includes(normalizedSelected)) {
              toast.error("Selected time slot is no longer available. Please choose another time.");
              queryClient.invalidateQueries({ queryKey: ["appointments"] });
              queryClient.invalidateQueries({ queryKey: ["available-slots", "consultant", consultantIdForCheck, dateISO] });
              return;
            }
          }
        }
      }
    } catch (err) {
      console.warn("Pre-check for slots failed, proceeding to confirm. Error:", err);
    }

    setOpenModal("confirm");
  };

  const finalConfirmBooking = () => {
    let clientId = sched.client;
    if (isConsultant) {
      const clientUser = clients.find((c: any) => (c._id || c.id) === sched.client);
      clientId = clientUser ? (clientUser._id || clientUser.id) : sched.client;
    } else if (isClient) {
      clientId = currentUser?._id || currentUser?.id || sched.client;
    }

    const consultantId = isClient ? sched.consultant : (currentConsultant?._id || currentConsultant?.id || "");

    const { start: slotStart, end: slotEnd } = parseSlotToRange(sched.date, sched.time as string, 60);
    const startHHMM = formatHHMM(slotStart);
    const endHHMM = formatHHMM(slotEnd);

    let category = "General";
    let fee = 0;

    if (isClient && sched.consultant) {
      const selectedConsultant = activeConsultants.find((c: any) => (c._id || c.id) === sched.consultant);
      category = selectedConsultant?.category?.title || selectedConsultant?.subcategory?.title || categories?.[0]?.title || "General";
      fee = selectedConsultant?.fees || 0;
    } else if (isConsultant && currentConsultant) {
      category = currentConsultant?.category?.title || currentConsultant?.subcategory?.title || categories?.[0]?.title || "General";
      fee = currentConsultant?.fees || 0;
    }

    const payload = {
      client: clientId,
      consultant: consultantId,
      category,
      session: sched.session,
      startAt: slotStart.toISOString(),
      endAt: slotEnd.toISOString(),
      status: "Upcoming",
      reason: sched.reason || "",
      notes: sched.notes || "",
      fee: fee,
      payment: {
        amount: totalFee,
        status: "Success", // As requested by user ("completed")
        method: paymentMethod,
      },
    };

    createMutation.mutate(payload);
  };

  /* Delete confirm */
  const confirmDelete = () => {
    if (!selected) return;
    deleteMutation.mutate(selected.id);
  };

  /* Edit save (simple patch) */
  const handleSaveEdit = (formData: { date?: string; time?: string; notes?: string; status?: string }) => {
    if (!selected) return;
    const payload: any = {};
    if (formData.date) payload.date = formData.date;
    if (formData.time) {
      const t = formData.time;
      if (t.includes("T")) {
        const parsed = new Date(t);
        payload.timeStart = formatHHMM(parsed);
        payload.timeEnd = formatHHMM(new Date(parsed.getTime() + 60 * 60 * 1000));
      } else {
        payload.timeStart = t;
        const [hh, mm] = t.split(":").map(Number);
        const startD = new Date();
        startD.setHours(hh, mm || 0, 0, 0);
        payload.timeEnd = formatHHMM(new Date(startD.getTime() + 60 * 60 * 1000));
      }
    }
    if (formData.notes !== undefined) payload.notes = formData.notes;
    if (formData.status) payload.status = formData.status;
    updateMutation.mutate({ id: selected.id, data: payload });
  };

  const isLoadingData = isLoading || (isConsultant && isLoadingLinkedClients) || (isConsultant && !currentConsultantId);

  // Helper to get selected consultant details for confirmation
  const getSelectedConsultantDetails = () => {
    if (isClient && sched.consultant) {
      return activeConsultants.find((c: any) => (c._id || c.id) === sched.consultant);
    }
    return currentConsultant;
  };

  const selectedConsultantDetails = getSelectedConsultantDetails();
  const consultationFee = selectedConsultantDetails?.fees || 0;
  const platformFeePercent = selectedConsultantDetails?.commission?.platformPercent || 0;
  const platformFee = (consultationFee * platformFeePercent) / 100;
  const totalFee = consultationFee + platformFee;

  /* Reschedule Handler */
  const handleReschedule = (appt: Appointment) => {
    // Find raw appointment data
    const rawAppt = appointmentsRaw.find((a: any) => (a._id || a.id) === appt.id);
    if (!rawAppt) {
      toast.error("Appointment data not found");
      return;
    }

    const consultantId = rawAppt.consultant?._id || rawAppt.consultant?.id || rawAppt.consultant;
    const clientId = rawAppt.client?._id || rawAppt.client?.id || rawAppt.client;

    setSched({
      client: clientId,
      consultant: consultantId,
      date: new Date(), // Reset to today for picking new date
      time: null,
      session: rawAppt.session || "Video Call",
      reason: rawAppt.reason || "",
      notes: rawAppt.notes || "",
    });
    setSelected(appt);
    setOpenModal("reschedule");
  };

  const confirmReschedule = () => {
    if (!selected || !sched.date || !sched.time) {
      toast.error("Please select a new date and time");
      return;
    }

    const { start: slotStart, end: slotEnd } = parseSlotToRange(sched.date, sched.time as string, 60);
    const startHHMM = formatHHMM(slotStart);
    const endHHMM = formatHHMM(slotEnd);

    const payload = {
      startAt: slotStart.toISOString(),
      endAt: slotEnd.toISOString(),
      status: "Upcoming", // Reset status to Upcoming
    };

    updateMutation.mutate({ id: selected.id, data: payload });
  };

  return (
    <div className="min-h-screen bg-white p-6">
      {isLoadingData && (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mr-3" />
          <span className="text-gray-600 text-sm">Loading appointments and clients…</span>
        </div>
      )}

      {isError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between">
          <span>Failed to load appointments. Please try again.</span>
          <button onClick={() => refetch()} className="px-3 py-1 rounded-md bg-red-600 text-white text-xs hover:bg-red-700">
            Retry
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Appointment Management</h2>
          <p className="text-sm text-gray-500">Home &gt; Appointments</p>
        </div>
      </div>

      <div className="bg-white p-3 rounded-lg border mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          <button onClick={() => { setActiveFilter("all"); setPage(1); }} className={`px-3 py-1.5 text-sm rounded-md ${activeFilter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}>All Appointments</button>
          <button onClick={() => { setActiveFilter("today"); setPage(1); }} className={`px-3 py-1.5 text-sm rounded-md ${activeFilter === "today" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}>Today</button>
          <button onClick={() => { setActiveFilter("incoming"); setPage(1); }} className={`px-3 py-1.5 text-sm rounded-md ${activeFilter === "incoming" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}>Incoming</button>
        </div>

        <div className="flex-1 flex justify-end gap-3 items-center">
          <div className="relative w-60">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/4 text-gray-400" />
            <input value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} placeholder="Search appointments..." className="w-full pl-9 pr-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
          </div>

          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }} className="border rounded-md px-3 py-2 text-sm bg-gray-50">
            <option value="">All Status</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <button onClick={() => { setSearchQuery(""); setActiveFilter("all"); setStatusFilter(""); setPage(1); }} className="border rounded-md px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100">Reset</button>
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-700">
          <thead className="bg-gray-100 text-gray-600 font-medium">
            <tr>
              <th className="px-4 py-2">Client Name</th>
              <th className="px-4 py-2">Consultant</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Session Type</th>
              <th className="px-4 py-2">Appointment Date</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && !isLoading && !isError && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={8}>No appointments found.</td>
              </tr>
            )}
            {paginated.map((a) => (
              <tr key={a.id} className="border-t hover:bg-gray-50 transition">
                <td className="px-4 py-2">{a.client}</td>
                <td className="px-4 py-2">{a.consultant}</td>
                <td className="px-4 py-2"><span className={`px-2 py-1 rounded-md text-xs font-medium ${categoryColors[a.category] || "bg-gray-100 text-gray-700"}`}>{a.category}</span></td>
                <td className="px-4 py-2">{a.session}</td>
                <td className="px-4 py-2">{a.date}{a.time ? `, ${a.time}` : ""}</td>
                <td className="px-4 py-2"><span className={`px-2 py-1 rounded-md text-xs font-medium ${statusColors[a.status] || "bg-gray-100 text-gray-700"}`}>{a.status}</span></td>
                <td className="px-4 py-2 flex gap-2">
                  <button onClick={() => { setSelected(a); setOpenModal("details"); }} className="p-1.5 hover:bg-gray-100 rounded-md" aria-label="View details"><Eye size={16} /></button>
                  {a.status === "Upcoming" && (
                    <>
                      {/* Consultant: Start Call button - only active at scheduled time */}
                      {isConsultant && (
                        <button
                          className={cn(
                            "p-1.5 rounded-full shadow-sm transition-all relative flex items-center justify-center",
                            checkIsNowFromDates(a.startAt!, a.endAt!)
                              ? "bg-green-100 text-green-700 hover:bg-green-200 border border-green-200 cursor-pointer"
                              : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                          )}
                          onClick={() => {
                            if (checkIsNowFromDates(a.startAt!, a.endAt!)) {
                              // Navigate to video call using appointment ID and channel name
                              const channelName = a.meetingLink || `appointment-${a.id}`;
                              window.open(`/video-call/${a.id}?channel=${encodeURIComponent(channelName)}`, "_blank");
                            }
                          }}
                          disabled={!checkIsNowFromDates(a.startAt!, a.endAt!)}
                          title={checkIsNowFromDates(a.startAt!, a.endAt!) ? "Start Call" : "Call starts at scheduled time"}
                        >
                          <Phone size={16} />
                          {checkIsNowFromDates(a.startAt!, a.endAt!) && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border-2 border-white"></span>
                            </span>
                          )}
                        </button>
                      )}
                      {/* Client: Join Call button - only active at scheduled time */}
                      {isClient && (
                        <button
                          className={cn(
                            "p-1.5 rounded-full shadow-sm transition-all relative flex items-center justify-center",
                            checkIsNowFromDates(a.startAt!, a.endAt!)
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 cursor-pointer"
                              : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                          )}
                          onClick={() => {
                            if (checkIsNowFromDates(a.startAt!, a.endAt!)) {
                              // Navigate to video call using appointment ID and channel name
                              const channelName = a.meetingLink || `appointment-${a.id}`;
                              window.open(`/video-call/${a.id}?channel=${encodeURIComponent(channelName)}`, "_blank");
                            }
                          }}
                          disabled={!checkIsNowFromDates(a.startAt!, a.endAt!)}
                          title={checkIsNowFromDates(a.startAt!, a.endAt!) ? "Join Call" : "Call starts at scheduled time"}
                        >
                          <Phone size={16} />
                          {checkIsNowFromDates(a.startAt!, a.endAt!) && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500 border-2 border-white"></span>
                            </span>
                          )}
                        </button>
                      )}
                    </>
                  )}

                  {/* Edit and Delete removed for Client and Consultant as per request */}
                  {isClient && a.status !== "Cancelled" && a.status !== "Completed" && (
                    <button onClick={() => handleReschedule(a)} className="p-1.5 hover:bg-gray-100 rounded-md text-orange-600" aria-label="Reschedule" title="Reschedule">
                      <CalendarClock size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-3 text-sm text-gray-500">
        <p>Showing {filteredAppointments.length} Results • Page {page} of {totalPages}</p>
        <div className="flex gap-2 items-center">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2 py-1 border rounded-md bg-gray-100" disabled={page === 1}>Prev</button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((pNum) => {
              if (totalPages <= 5) return true;
              if (page <= 3) return pNum <= 5;
              if (page >= totalPages - 2) return pNum > totalPages - 5;
              return Math.abs(pNum - page) <= 2;
            })
            .map((pNum) => (
              <button key={pNum} onClick={() => setPage(pNum)} className={`px-3 py-1 border rounded-md ${pNum === page ? "bg-blue-600 text-white" : "bg-gray-100"}`}>{pNum}</button>
            ))}

          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-2 py-1 border rounded-md bg-gray-100" disabled={page === totalPages}>Next</button>
        </div>
      </div>

      <ScheduleModal
        open={openModal === "schedule"}
        onClose={closeModal}
        sched={sched}
        setSched={setSched}
        clients={clients}
        categories={categories}
        consultants={filteredConsultants}
        isLoadingUsers={isLoadingUsers}
        handlePreBooking={handlePreBooking}
        isPending={createMutation.isPending}
        isConsultant={isConsultant}
        isClient={isClient}
        getSlotsToRender={getSlotsToRender}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

      <ConfirmModal
        open={openModal === "confirm"}
        onClose={closeModal}
        consultantDetails={selectedConsultantDetails}
        sched={sched}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        consultationFee={consultationFee}
        platformFee={platformFee}
        totalFee={totalFee}
        onConfirm={finalConfirmBooking}
        isPending={createMutation.isPending}
      />



      <DetailsModal
        open={openModal === "details"}
        onClose={closeModal}
        appointment={selected}
      />

      <EditModal
        open={openModal === "edit"}
        onClose={closeModal}
        appointment={selected}
        setAppointment={setSelected}
        onSave={(payload) => handleSaveEdit(payload)}
        isPending={updateMutation.isPending}
      />

      <RescheduleModal
        open={openModal === "reschedule"}
        onClose={closeModal}
        sched={sched}
        setSched={setSched}
        getSlotsToRender={getSlotsToRender}
        onConfirm={confirmReschedule}
        isPending={updateMutation.isPending}
      />


    </div >
  );
};

export default AppointmentManagementConsultant;
