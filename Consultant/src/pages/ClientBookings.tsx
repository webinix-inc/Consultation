import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    CalendarDays,
    FileText,
    Clock,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Video,
    Phone,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppointmentAPI from "@/api/appointment.api";
import DashboardAPI from "@/api/dashboard.api";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { UPCOMING_STATUSES, PAST_STATUSES } from "@/constants/appConstants";
import { normalizeTimeString, parseSlotToRange, formatToDisplay, formatHHMM, isoDateOnly, checkIsNow, formatDateLine, formatDateLineFromDates, checkIsNowFromDates } from "@/utils/dateTimeUtils";

/* --------------------------------------
   Utils & Types
-------------------------------------- */
// Date/time utility functions imported from @/utils/dateTimeUtils

function useMonthMatrix(base: Date) {
    return useMemo(() => {
        const year = base.getFullYear();
        const month = base.getMonth();
        const first = new Date(year, month, 1);
        const start = new Date(first);
        start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
        const weeks: Date[][] = [];
        for (let w = 0; w < 6; w++) {
            const row: Date[] = [];
            for (let d = 0; d < 7; d++) {
                const cur = new Date(start);
                cur.setDate(start.getDate() + w * 7 + d);
                row.push(cur);
            }
            weeks.push(row);
        }
        return weeks;
    }, [base]);
}

function isSameDay(a: Date, b: Date) {
    return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

// formatDateLine now imported from @/utils/dateTimeUtils

export type BookingItem = {
    id: string;
    price: number;
    doctor: string;
    tags: string[];
    dateLine: string;
    notes?: string;
    rawDate?: string;
    startAt?: Date;
    endAt?: Date;
    title: string;
    category?: string;
    subcategory?: string;
    status?: string;
    serviceType?: string;
    consultantId: string;
    meetingLink?: string;
};

/* --------------------------------------
   Sub-components
-------------------------------------- */

function Tag({ label }: { label: string }) {
    const map: Record<string, string> = {
        Health: "bg-blue-600/10 text-blue-700 border-blue-200",
        Finance: "bg-amber-500/10 text-amber-700 border-amber-200",
        Legal: "bg-violet-600/10 text-violet-700 border-violet-200",
        IT: "bg-emerald-600/10 text-emerald-700 border-emerald-200",
        Upcoming: "bg-sky-600/10 text-sky-700 border-sky-200",
        Pending: "bg-amber-600/10 text-amber-700 border-amber-200",
        Completed: "bg-emerald-600/10 text-emerald-700 border-emerald-200",
        Cancelled: "bg-rose-600/10 text-rose-700 border-rose-200",
    };
    return (
        <Badge
            variant="outline"
            className={cn("px-2 py-0.5 text-xs rounded-full", map[label])}
        >
            {label}
        </Badge>
    );
}

function MiniCalendar({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
    const [view, setView] = useState<Date>(new Date(value));
    const matrix = useMonthMatrix(view);
    const title = `${view.toLocaleString("default", { month: "long" })} ${view.getFullYear()}`;
    return (
        <div className="rounded-md border p-3">
            <div className="flex items-center justify-between mb-2">
                <button
                    className="h-7 w-7 rounded-md grid place-items-center hover:bg-gray-100"
                    onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
                    title="Previous"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-sm font-medium">{title}</div>
                <button
                    className="h-7 w-7 rounded-md grid place-items-center hover:bg-gray-100"
                    onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
                    title="Next"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            <div className="grid grid-cols-7 text-[11px] text-gray-500 mb-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div key={d} className="text-center py-1">
                        {d}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {matrix.flat().map((d, i) => {
                    const outMonth = d.getMonth() !== view.getMonth();
                    const selected = isSameDay(d, value);
                    const today = isSameDay(d, new Date());
                    const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));
                    return (
                        <button
                            key={i}
                            onClick={() => !isPast && onChange(new Date(d))}
                            disabled={isPast}
                            className={cn(
                                "h-8 rounded-md text-sm grid place-items-center",
                                outMonth ? "text-gray-400" : "",
                                isPast ? "text-gray-300 cursor-not-allowed" : "",
                                selected ? "bg-blue-600 text-white" : !isPast ? "hover:bg-gray-100" : "",
                                !selected && today ? "ring-1 ring-blue-400" : "",
                            )}
                        >
                            {d.getDate()}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function Modal({
    open,
    onClose,
    children,
    title,
    subtitle,
}: {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
    subtitle?: string;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-blue/60 backdrop-blur-[1px]" onClick={onClose} />
            <div className="absolute inset-0 grid place-items-center p-4">
                <div className="relative w-[640px] max-w-[95vw] rounded-xl bg-white shadow-xl border">
                    <div className="flex items-start justify-between p-4 border-b">
                        <div>
                            <div className="text-base font-semibold">{title}</div>
                            {subtitle && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                    {subtitle}
                                </div>
                            )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            ✕
                        </Button>
                    </div>
                    <div className="p-4">{children}</div>
                </div>
            </div>
        </div>
    );
}

function AppointmentNotesModal({
    open,
    onClose,
    data,
    onSave,
}: {
    open: boolean;
    onClose: () => void;
    data: any;
    onSave: (notes: string) => void;
}) {
    const [notes, setNotes] = useState(data?.notes || "");

    useEffect(() => {
        setNotes(data?.notes || "");
    }, [data]);

    if (!open || !data) return null;

    return (
        <Modal open={open} onClose={onClose} title="Appointment Notes" subtitle={`Notes for your appointment with ${data.doctor}`}>
            <div className="space-y-6">
                <div className="bg-muted/30 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        {data.dateLine}
                    </div>
                    <div className="font-medium">{data.title?.split("•")[1] || "General Consultation"}</div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <textarea
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Add notes about this appointment..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={() => onSave(notes)}>
                        <FileText className="h-4 w-4" /> Save Notes
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

function BookingRow({
    b,
    past,
    onOpen,
    onReschedule,
    onCancel,
    onViewNotes,
    isConsultant,
}: {
    b: BookingItem;
    past?: boolean;
    onOpen: (b: BookingItem) => void;
    onReschedule?: (b: BookingItem) => void;
    onCancel?: (b: BookingItem) => void;
    onViewNotes?: (b: BookingItem) => void;
    isConsultant?: boolean;
}) {
    const isNow = useMemo(() => {
        if (b.startAt) {
            return checkIsNowFromDates(b.startAt, b.endAt || new Date(b.startAt.getTime() + 60 * 60 * 1000));
        }
        return false;
    }, [b.startAt, b.endAt]);

    return (
        <div className="rounded-xl border bg-white p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3 relative overflow-hidden">

            <div className="flex gap-3">
                <div className="h-10 w-10 rounded-md bg-muted grid place-items-center text-xs font-medium text-muted-foreground">
                    {b.doctor
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                </div>
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">{b.doctor}</div>
                        {b.tags.map((t) => (
                            <Tag key={t} label={t} />
                        ))}
                    </div>
                    <div className="text-sm text-muted-foreground">{b.title}</div>
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-6 mt-1">
                        <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-4 w-4" />
                            {b.dateLine}
                        </span>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <FileText className="h-4 w-4" />
                        {b.notes}
                    </div>
                </div>
            </div>

            <div className="min-w-[220px] flex flex-col items-end gap-2">
                <div className="font-semibold pr-2">₹{b.price}</div>
                {!past ? (
                    <>
                        {!isConsultant && (
                            <div className="flex items-center gap-2">
                                {b.status === "Upcoming" && (
                                    <Button
                                        size="icon"
                                        className={cn(
                                            "h-9 w-9 rounded-full shadow-sm transition-all relative",
                                            isNow
                                                ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 cursor-pointer"
                                                : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                                        )}
                                        onClick={() => {
                                            if (isNow) {
                                                // Navigate to video call using appointment ID and channel name
                                                const channelName = b.meetingLink || `appointment-${b.id}`;
                                                window.open(`/video-call/${b.id}?channel=${encodeURIComponent(channelName)}`, "_blank");
                                            }
                                        }}
                                        disabled={!isNow}
                                        title={isNow ? "Join Call" : "Call starts at scheduled time"}
                                    >
                                        <Phone className="h-4 w-4" />
                                        {isNow && (
                                            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border-2 border-white"></span>
                                            </span>
                                        )}
                                    </Button>
                                )}
                                <Button size="sm" variant="outline" onClick={() => onReschedule?.(b)}>
                                    Reschedule
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => onCancel?.(b)}>
                                    Cancel
                                </Button>
                            </div>
                        )}
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-white hover:text-blue-600 bg-blue-500 hover:bg-white"
                            onClick={() => onOpen(b)}
                        >
                            View Details
                        </Button>
                    </>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => onViewNotes?.(b)}>
                            <FileText className="h-4 w-4" /> Notes
                        </Button>
                        <Button size="sm" variant="outline">
                            View Report
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* --------------------------------------
   Main Page Component
-------------------------------------- */

export default function ClientBookings() {
    const [open, setOpen] = useState<any | null>(null);
    const [cancelId, setCancelId] = useState<string | null>(null);
    const [rescheduleItem, setRescheduleItem] = useState<BookingItem | null>(null);
    const [notesItem, setNotesItem] = useState<BookingItem | null>(null);
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const isConsultant = user?.role === "Consultant";
    const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

    const [rDate, setRDate] = useState<Date>(new Date());
    const [rTimeSlot, setRTimeSlot] = useState<string | null>(null);

    const { data: profile } = useQuery({
        queryKey: ["clientProfile"],
        queryFn: async () => { }, // Assuming profile data is already cached or not critical for main list
        enabled: false,
    });

    const { data: appointmentsData, isLoading: loadingAppointments } = useQuery({
        queryKey: ["clientAppointments"],
        queryFn: () => AppointmentAPI.getAll(),
    });

    const appointments = appointmentsData?.data || [];
    const upcoming = appointments?.filter((a: any) => a.status === "Upcoming") || [];
    const past = appointments?.filter((a: any) => a.status === "Completed" || a.status === "Cancelled") || [];

    useEffect(() => {
        if (rescheduleItem && rescheduleItem.rawDate) {
            setRDate(new Date(rescheduleItem.rawDate));
            setRTimeSlot(null);
        } else {
            setRDate(new Date());
            setRTimeSlot(null);
        }
    }, [rescheduleItem]);

    const selectedDateISO = useMemo(() => isoDateOnly(rDate), [rDate]);

    const availableSlotsQuery = useQuery({
        queryKey: ["available-slots", rescheduleItem?.consultantId, selectedDateISO],
        queryFn: async () => {
            if (!rescheduleItem?.consultantId || !selectedDateISO) return [];
            try {
                const slots = await AppointmentAPI.getAvailableSlots(rescheduleItem.consultantId, selectedDateISO, 60);
                return Array.isArray(slots) ? slots : [];
            } catch (err) {
                console.warn("available slots fetch failed:", err);
                return [];
            }
        },
        enabled: !!rescheduleItem?.consultantId && !!selectedDateISO,
        staleTime: 30 * 1000,
    });

    const availableSlots = availableSlotsQuery.data || [];

    const cancelMutation = useMutation({
        mutationFn: (id: string) => AppointmentAPI.update(id, { status: "Cancelled" }),
        onSuccess: () => {
            toast.success("Appointment cancelled successfully");
            queryClient.invalidateQueries({ queryKey: ["clientAppointments"] });
            queryClient.invalidateQueries({ queryKey: ["clientStats"] });
            setCancelId(null);
        },
        onError: (err: any) => {
            toast.error(err?.message || "Failed to cancel appointment");
        }
    });

    const rescheduleMutation = useMutation({
        mutationFn: (payload: { id: string, startAt: string, endAt: string }) =>
            AppointmentAPI.update(payload.id, { startAt: payload.startAt, endAt: payload.endAt }),
        onSuccess: () => {
            toast.success("Appointment rescheduled successfully");
            queryClient.invalidateQueries({ queryKey: ["clientAppointments"] });
            setRescheduleItem(null);
        },
        onError: (err: any) => {
            toast.error(err?.message || "Failed to reschedule appointment");
        }
    });

    const handleRescheduleSubmit = () => {
        if (!rescheduleItem) return;
        if (!rDate || !rTimeSlot) {
            toast.error("Please select a new date and time");
            return;
        }

        const { start: slotStart, end: slotEnd } = parseSlotToRange(rDate, rTimeSlot, 60);

        rescheduleMutation.mutate({ id: rescheduleItem.id, startAt: slotStart.toISOString(), endAt: slotEnd.toISOString() });
    };

    const notesMutation = useMutation({
        mutationFn: (payload: { id: string, notes: string }) =>
            AppointmentAPI.update(payload.id, { notes: payload.notes }),
        onSuccess: () => {
            toast.success("Notes updated successfully");
            queryClient.invalidateQueries({ queryKey: ["clientAppointments"] });
            setNotesItem(null);
        },
        onError: (err: any) => {
            toast.error(err?.message || "Failed to update notes");
        }
    });

    if (loadingAppointments) {
        return <div className="p-8 text-center text-muted-foreground">Loading appointments...</div>;
    }

    return (
        <div className="mx-auto w-full max-w-7xl space-y-4">
            <div className="space-y-2">
                <h1 className="text-xl font-semibold">My Bookings</h1>
                <p className="text-xs text-muted-foreground">Home » Appointments</p>
            </div>

            <div className="space-y-4">
                {/* Toggle Tabs */}
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => setActiveTab("upcoming")}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all",
                            activeTab === "upcoming"
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                        )}
                    >
                        Upcoming
                        {upcoming.length > 0 && (
                            <span className={cn(
                                "ml-2 px-2 py-0.5 text-xs rounded-full",
                                activeTab === "upcoming" ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-600"
                            )}>
                                {upcoming.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("past")}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all",
                            activeTab === "past"
                                ? "bg-white text-blue-600 shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                        )}
                    >
                        Past
                        {past.length > 0 && (
                            <span className={cn(
                                "ml-2 px-2 py-0.5 text-xs rounded-full",
                                activeTab === "past" ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-600"
                            )}>
                                {past.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Appointments List */}
                <Card className="border-muted/50">
                    <CardHeader className="pb-2">
                        <div className="text-sm font-semibold">
                            {activeTab === "upcoming" ? "Upcoming Appointments" : "Past Appointments"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {activeTab === "upcoming" ? "Your scheduled consultations" : "Your consultation history"}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {activeTab === "upcoming" ? (
                            upcoming.length > 0 ? upcoming.map((b: any) => (
                                <BookingRow key={b._id} b={{
                                    id: b._id,
                                    price: b.payment?.amount || b.fee || 0,
                                    doctor: b.consultantSnapshot?.name || b.consultant?.fullName || b.consultant?.name || "NA",
                                    tags: [(b.category && b.category !== "General") ? b.category : (b.consultantSnapshot?.category || b.consultant?.category || "General"), b.status || "Pending"],
                                    title: `${b.consultantSnapshot?.subcategory || b.consultant?.subcategory || "General"} • ${b.reason || "Consultation"}`,
                                    category: b.category,
                                    subcategory: b.consultantSnapshot?.subcategory || b.consultant?.subcategory,
                                    status: b.status,
                                    serviceType: b.session,
                                    dateLine: b.startAt ? formatDateLineFromDates(new Date(b.startAt), b.endAt ? new Date(b.endAt) : new Date(new Date(b.startAt).getTime() + 60 * 60 * 1000), b.session || "Video Call") : formatDateLine(b.date, b.timeStart, b.timeEnd, b.session || "Video Call", true),
                                    notes: b.notes || "NA",
                                    rawDate: b.date,
                                    startAt: b.startAt ? new Date(b.startAt) : undefined,
                                    endAt: b.endAt ? new Date(b.endAt) : undefined,
                                    consultantId: b.consultant?._id || b.consultant?.id || b.consultant,
                                    meetingLink: b.meetingLink || b.agora?.channelName || `appointment-${b._id}`,
                                }} onOpen={setOpen} onCancel={() => setCancelId(b._id)} onReschedule={(item) => setRescheduleItem(item)} isConsultant={isConsultant} />
                            )) : <div className="text-sm text-muted-foreground py-8 text-center">No upcoming appointments.</div>
                        ) : (
                            past.length > 0 ? past.map((b: any) => (
                                <BookingRow key={b._id} b={{
                                    id: b._id,
                                    price: b.payment?.amount || b.fee || 0,
                                    doctor: b.consultantSnapshot?.name || b.consultant?.fullName || b.consultant?.name || "NA",
                                    tags: [(b.category && b.category !== "General") ? b.category : (b.consultantSnapshot?.category || b.consultant?.category || "General"), b.status || "NA"],
                                    title: `${b.consultantSnapshot?.subcategory || b.consultant?.subcategory || "General"} • ${b.reason || "Consultation"}`,
                                    category: b.category,
                                    subcategory: b.consultantSnapshot?.subcategory || b.consultant?.subcategory,
                                    status: b.status,
                                    serviceType: b.session,
                                    dateLine: b.startAt ? formatDateLineFromDates(new Date(b.startAt), b.endAt ? new Date(b.endAt) : new Date(new Date(b.startAt).getTime() + 60 * 60 * 1000), b.session || "Video Call") : formatDateLine(b.date, b.timeStart, b.timeEnd, b.session || "Video Call", true),
                                    notes: b.notes,
                                    consultantId: b.consultant?._id || b.consultant?.id || b.consultant,
                                }} past onOpen={setOpen} onViewNotes={setNotesItem} />
                            )) : <div className="text-sm text-muted-foreground py-8 text-center">No past appointments.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Modal open={!!open} onClose={() => setOpen(null)} title="Appointment Details">
                {open && (
                    <div className="space-y-6 text-sm">
                        <div className="rounded-xl bg-muted/100 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-white border grid place-items-center text-sm font-medium text-muted-foreground">
                                    {/* Fallback avatar logic */}
                                    ME
                                </div>
                                <div>
                                    <div className="font-semibold text-base">Client</div>
                                    <div className="text-xs text-muted-foreground">Client</div>
                                </div>
                            </div>
                            <Badge
                                variant="secondary"
                                className="bg-violet-100 text-violet-700 hover:bg-violet-100 border-none"
                            >
                                {open.tags[1]}
                            </Badge>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <div className="font-semibold mb-1">Date & Time</div>
                                <div className="text-muted-foreground text-sm">₹ {open.price || 0} / session</div>
                                <div className="text-muted-foreground text-sm mt-1">
                                    {open.dateLine}
                                </div>
                            </div>

                            <div>
                                <div className="font-semibold mb-1">Consultation with</div>
                                <div className="text-muted-foreground">{open.doctor}</div>
                                <div className="text-muted-foreground text-sm">{open.tags[0]}</div>
                            </div>

                            <div>
                                <div className="font-semibold mb-1">Reason</div>
                                <div className="text-muted-foreground">
                                    {open.title.split("•")[1]}
                                </div>
                            </div>

                            <div>
                                <div className="font-semibold text-sm mb-2">Notes</div>
                                <div className="rounded-lg bg-muted/100 p-4 text-sm text-muted-foreground">
                                    {open.notes || "No notes available."}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex items-center justify-end gap-3">
                            <Button variant="outline" onClick={() => setOpen(null)}>
                                Close
                            </Button>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                Start Consultation
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal open={!!cancelId} onClose={() => setCancelId(null)} title="Cancel Appointment">
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to cancel this appointment? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setCancelId(null)}>No, Keep it</Button>
                        <Button variant="destructive" onClick={() => cancelId && cancelMutation.mutate(cancelId)} disabled={cancelMutation.isPending}>
                            {cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel"}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal open={!!rescheduleItem} onClose={() => setRescheduleItem(null)} title="Reschedule Appointment" subtitle="Choose a new date and time">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5 h-full flex flex-col">
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">New Date <span className="text-red-500">*</span></label>
                            <MiniCalendar value={rDate} onChange={(d) => { setRDate(d); setRTimeSlot(null); }} />
                        </div>

                        <div className="space-y-1.5 flex-1 flex flex-col">
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Available Time Slots <span className="text-red-500">*</span></label>
                            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 flex-1 min-h-[200px]">
                                <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                                    {availableSlotsQuery.isLoading ? (
                                        <div className="w-full h-full flex items-center justify-center p-4">
                                            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                                        </div>
                                    ) : availableSlots.length > 0 ? (
                                        availableSlots.map((slot: string) => (
                                            <button
                                                key={slot}
                                                onClick={() => setRTimeSlot(slot)}
                                                className={cn(
                                                    "px-4 py-2 text-xs font-medium rounded-md border transition-all",
                                                    rTimeSlot === slot
                                                        ? "bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-200"
                                                        : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                                                )}
                                            >
                                                {slot}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center py-4 text-gray-400">
                                            <Clock className="h-8 w-8 mb-2 opacity-20" />
                                            <span className="text-xs italic">No slots available for this date</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={() => setRescheduleItem(null)}>Cancel</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleRescheduleSubmit} disabled={rescheduleMutation.isPending}>
                            {rescheduleMutation.isPending ? "Updating..." : "Confirm Reschedule"}
                        </Button>
                    </div>
                </div>
            </Modal>

            <AppointmentNotesModal
                open={!!notesItem}
                onClose={() => setNotesItem(null)}
                data={notesItem}
                onSave={(notes) => notesItem && notesMutation.mutate({ id: notesItem.id, notes })}
            />
        </div>
    );
}
