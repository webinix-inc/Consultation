import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Search,
  Calendar,
  Clock,
  MoreVertical,
  Eye,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import { useSearchParams } from "react-router-dom";
import AppointmentAPI from "@/api/appointment.api";

// This is the data shape for the UI table
interface Appointment {
  id: string;
  _id?: string;
  client: string; // Name
  clientId?: string; // ID
  consultant: string; // Name
  consultantId?: string; // ID
  category: string;
  subcategory?: string;
  session: "Video Call" | "In-Person" | "Phone";
  date: string | Date;
  time: string; // Display time (e.g., "9:00 AM")
  status: "Upcoming" | "Confirmed" | "Completed" | "Cancelled";
  reason?: string;
  notes?: string;
  fee?: number | string;
  [key: string]: any;
};



const AppointmentManagement: React.FC = () => {
  const [openModal, setOpenModal] = useState<"none" | "details">("none");
  const [selected, setSelected] = useState<Appointment | null>(null);



  // --- Data Fetches (Single source of truth) ---
  const { data: appointmentsResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ["appointments"],
    queryFn: () => AppointmentAPI.getAll(),
  });
  // The raw appointments array from the API
  const appointments = useMemo(() => {
    const payload = appointmentsResponse?.data;
    // Handle { data: [...] } or { data: { data: [...] } } or [...]
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return [];
  }, [appointmentsResponse]);






  // --- Form Logic (FIXED & Merged) ---
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "today" | "incoming">("all");
  const [statusFilter, setStatusFilter] = useState<"" | "Upcoming" | "Confirmed" | "Completed">("");
  const [page, setPage] = useState(1);
  const pageSize = 8;







  const closeModal = () => {
    setSelected(null);
    setOpenModal("none");
  };

  // (FIXED) Map API appointments to UI shape
  const mappedAppointments: Appointment[] = useMemo(() => {
    return appointments.map((it: any) => {
      const consultantId = String(it.consultant?._id || it.consultant?.id || it.consultant);
      const clientId = String(it.client?._id || it.client?.id || it.client);

      const clientName = it.client?.fullName || it.client?.name || "Unknown Client";
      const consultantName = it.consultant?.fullName || it.consultant?.name || "Unknown Consultant";

      // Helper to normalize time string
      const normalizeTimeString = (t: string) => {
        if (!t) return "";
        if (t.includes("AM") || t.includes("PM")) {
          const [timePart, ampm] = t.split(" ");
          let [h, m] = timePart.split(":").map(Number);
          if (ampm === "PM" && h < 12) h += 12;
          if (ampm === "AM" && h === 12) h = 0;
          return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        }
        return t;
      };

      // Handle startAt/endAt or date/timeStart
      let start: Date | null = null;
      let end: Date | null = null;

      if (it.startAt) {
        start = new Date(it.startAt);
        end = it.endAt ? new Date(it.endAt) : new Date(start.getTime() + 60 * 60 * 1000);
      } else if (it.date && it.timeStart) {
        const sTime = normalizeTimeString(it.timeStart);
        start = new Date(`${it.date.split('T')[0]}T${sTime}:00`);
        if (it.timeEnd) {
          const eTime = normalizeTimeString(it.timeEnd);
          end = new Date(`${it.date.split('T')[0]}T${eTime}:00`);
        } else {
          end = new Date(start.getTime() + 60 * 60 * 1000);
        }
      }

      const dateStr = start ? start.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : (it.date ? new Date(it.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : "");

      // Format time for display (e.g. "1:00 PM")
      let timeDisplay = "";

      // Helper
      const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

      if (start) {
        timeDisplay = `${formatTime(start)}`;
        if (end) {
          timeDisplay += ` to ${formatTime(end)}`;
        }
      } else if (it.timeStart) {
        // Fallback for very old legacy data only
        timeDisplay = it.timeStart; // Simple fallback
      }

      return {
        id: it._id || it.id,
        _id: it._id || it.id,
        client: clientName,
        clientId: clientId,
        consultant: consultantName,
        consultantId: consultantId,
        category: (it.category && it.category !== "General") ? it.category : (it.consultant?.category || "General"),
        subcategory: it.subcategory || it.categorySnapshot?.subcategory || "",
        session: it.session || "Video Call",
        date: dateStr,
        time: timeDisplay,
        status: it.status || "Upcoming",
        reason: it.reason || "",
        notes: it.notes || "",
        fee: it.fee || 0,
      } as Appointment;
    });
  }, [appointments]);

  // Filtering (search + filter buttons + status filter)
  const [searchParams] = useSearchParams();
  const subcategoryParam = searchParams.get("subcategoryName");

  const filteredAppointments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return mappedAppointments.filter((a) => {
      // Filter by Subcategory if param exists
      if (subcategoryParam && a.subcategory !== subcategoryParam && a.subcategory !== decodeURIComponent(subcategoryParam)) {
        return false;
      }

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
        if (!["Upcoming", "Confirmed"].includes(a.status)) return false;
      }

      if (!q) return true;
      const fields = [
        a.client || "",
        a.consultant || "",
        a.category || "",
        a.subcategory || "",
        a.reason || "",
        a.notes || "",
      ].join(" ").toLowerCase();
      return fields.includes(q);
    });
  }, [mappedAppointments, searchQuery, activeFilter, statusFilter, subcategoryParam]);

  // Pagination
  const totalResults = filteredAppointments.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAppointments.slice(start, start + pageSize);
  }, [filteredAppointments, page]);

  // Category & status colors
  const categoryColors: Record<string, string> = {
    Health: "bg-pink-100 text-pink-700",
    Finance: "bg-blue-100 text-blue-700",
    Legal: "bg-yellow-100 text-yellow-700",
    IT: "bg-indigo-100 text-indigo-700",
    Construction: "bg-green-100 text-green-700",
  };

  const statusColors: Record<string, string> = {
    Upcoming: "bg-purple-100 text-purple-700",
    Confirmed: "bg-blue-100 text-blue-700",
    Completed: "bg-green-100 text-green-700",
    Cancelled: "bg-gray-100 text-gray-700",
  };

  const fade = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.95 },
  };



  // Format fee/date/time for display
  const formatFee = (fee: number | string | undefined): string => {
    if (fee === undefined) return '0';
    if (typeof fee === 'number') return fee.toString();
    if (typeof fee === 'string') return fee.replace(/[^0-9.]/g, '');
    return '0';
  };
  const formatDate = (date: string | Date): React.ReactNode => {
    if (!date) return '';
    try {
      const d = date instanceof Date ? date : new Date(date);
      return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mr-3" />
          <span className="text-gray-600 text-sm">Loading appointments…</span>
        </div>
      )}
      {isError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between">
          <span>Failed to load appointments. Please try again.</span>
          <button onClick={() => refetch()} className="px-3 py-1 rounded-md bg-red-600 text-white text-xs hover:bg-red-700">Retry</button>
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
          <button
            onClick={() => { setActiveFilter("all"); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-md ${activeFilter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
          >
            All Appointments
          </button>
          <button
            onClick={() => { setActiveFilter("today"); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-md ${activeFilter === "today" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
          >
            Today
          </button>
          <button
            onClick={() => { setActiveFilter("incoming"); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-md ${activeFilter === "incoming" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
          >
            Incoming
          </button>
        </div>

        <div className="flex-1 flex justify-end gap-3 items-center">
          <div className="relative w-60">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search appointments..."
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
            className="border rounded-md px-3 py-2 text-sm bg-gray-50"
          >
            <option value="">All Status</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <button
            onClick={() => { setSearchQuery(""); setActiveFilter("all"); setStatusFilter(""); setPage(1); }}
            className="border rounded-md px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100"
          >
            Reset
          </button>
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
                <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                  No appointments found.
                </td>
              </tr>
            )}
            {paginated.map((a) => (
              <tr key={a.id} className="border-t hover:bg-gray-50 transition">
                <td className="px-4 py-2">{a.client}</td>
                <td className="px-4 py-2">{a.consultant}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-medium ${categoryColors[a.category] || "bg-gray-100 text-gray-700"
                      }`}
                  >
                    {a.category || "N/A"}
                  </span>
                </td>
                <td className="px-4 py-2">{a.session}</td>
                <td className="px-4 py-2">{formatDate(a.date)}{a.time ? `, ${a.time}` : ""}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded-md text-xs font-medium ${statusColors[a.status] || "bg-gray-100 text-gray-700"
                      }`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-2 flex gap-2">
                  <button
                    onClick={() => {
                      setSelected(a);
                      setOpenModal("details");
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-md"
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-3 text-sm text-gray-500">
        <p>Showing {filteredAppointments.length} Results • Page {page} of {totalPages}</p>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2 py-1 border rounded-md bg-gray-100"
            disabled={page === 1}
          >
            Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((pNum) => {
              if (totalPages <= 5) return true;
              if (page <= 3) return pNum <= 5;
              if (page >= totalPages - 2) return pNum > totalPages - 5;
              return Math.abs(pNum - page) <= 2;
            })
            .map((pNum) => (
              <button
                key={pNum}
                onClick={() => setPage(pNum)}
                className={`px-3 py-1 border rounded-md ${pNum === page ? "bg-blue-600 text-white" : "bg-gray-100"}`}
              >
                {pNum}
              </button>
            ))}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-2 py-1 border rounded-md bg-gray-100"
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {/* ====== MODALS (FIXED) ====== */}
      <AnimatePresence>
        {/* Appointment Details */}
        {openModal === "details" && selected && (
          <motion.div variants={fade} initial="hidden" animate="show" exit="exit" className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
              <button onClick={closeModal} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Appointment Details</h3>
              <div className="border rounded-lg p-3 mt-3 space-y-2">
                <div className="flex justify-between">
                  <p className="font-medium text-gray-700">{selected.client}</p>
                  <span className={`text-xs px-2 py-1 rounded-md ${statusColors[selected.status] || 'bg-gray-100'}`}>{selected.status}</span>
                </div>
                <p className="text-sm text-gray-500">With {selected.consultant} ({selected.category || "N/A"})</p>
                <p className="text-sm text-gray-600 mt-2"><b>Date & Time:</b> {formatDate(selected.date)}{selected.time ? `, ${selected.time}` : ''}</p>
                <p className="text-sm text-gray-600"><b>Fee:</b> ₹{formatFee(selected.fee)}</p>
                <p className="text-sm text-gray-600"><b>Reason:</b> {selected.reason || "N/A"}</p>
                <p className="text-sm text-gray-600"><b>Notes:</b> {selected.notes || "N/A"}</p>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={closeModal} className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100">Close</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AppointmentManagement;