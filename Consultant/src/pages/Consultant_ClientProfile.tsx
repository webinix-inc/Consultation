import React, { useMemo, useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    User,
    CalendarDays,
    FileText,
    DollarSign,
    Upload as UploadIcon,
    Eye,
    Download,
    Trash2,
    Search as LucideSearch,
    FileCog,
    Receipt,
    CreditCard,
    Hash,
    MapPin,
    Mail,
    Phone,
    Clock,
    CheckCircle2,
    IndianRupee,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import UserAPI from "@/api/user.api";
import DashboardAPI from "@/api/dashboard.api";
import AppointmentAPI from "@/api/appointment.api";
import TransactionAPI from "@/api/transaction.api";
import ClientAPI from "@/api/client.api";
import DocumentAPI from "@/api/document.api";
import UploadAPI from "@/api/upload.api";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/utils/currencyUtils";
import { UPCOMING_STATUSES, PAST_STATUSES } from "@/constants/appConstants";

/* --------------------------------------
   tiny helpers
-------------------------------------- */
function cn(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}
function normalize(s: string) {
    return (s || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u2010-\u2015]/g, "-")
        .replace(/[^a-z0-9]+/g, "");
}

function getInitials(name: string) {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* --------------------------------------
   Top heading + client header (persistent for all tabs)
-------------------------------------- */
function PageHeading({ profile }: { profile: any }) {
    if (!profile) return null;

    return (
        <div className="space-y-3">
            <div>
                <h1 className="text-lg font-semibold">Client Management</h1>
                <p className="text-xs text-muted-foreground">Home » Clients</p>
            </div>

            <div className="rounded-xl border bg-blue-50/80 p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <img
                        src={profile.avatar || "https://randomuser.me/api/portraits/men/32.jpg"}
                        alt="avatar"
                        className="h-18 w-18 rounded-full border"
                    />
                </div>
                <div className="flex items-center gap-3 grow">
                    <div>
                        <div className="text-lg font-semibold">{profile.fullName}</div>
                        <div className="mt-1 flex items-center">
                            <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 border-emerald-400 "
                            >
                                Active Member
                            </Badge>
                            {/* <Badge
                variant="outline"
                className="bg-gray-100 text-gray-700 border-gray-200"
              >
                32 Sessions
              </Badge> */}
                        </div>
                    </div>
                </div>
                <div className="text-right text-s text-muted-foreground">
                    <div>Member since</div>
                    <div className="font-medium text-foreground">{new Date(profile.createdAt).toLocaleDateString()}</div>
                </div>
            </div>
        </div>
    );
}

/* --------------------------------------
   Small sparkline for stats
-------------------------------------- */
function Spark({ color = "currentColor" }: { color?: string }) {
    return (
        <svg viewBox="0 0 120 32" className="w-full h-10" aria-hidden>
            <path
                d="M1 24 C 20 26, 24 18, 40 20 S 60 26, 80 22 S 100 26, 119 12"
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

function StatCards({ stats }: { stats: any }) {
    if (!stats) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" /> Total Appointments
                        </span>
                        {/* <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200"
            >
              +20%
            </Badge> */}
                    </div>
                    <div className="mt-1 text-2xl font-semibold">{stats.totalAppointments || 0}</div>
                    <div className="text-sky-600 mt-2">
                        <Spark />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" /> Completed Sessions
                        </span>
                        {/* <Badge
              variant="outline"
              className="bg-rose-50 text-rose-700 border-rose-200"
            >
              -15%
            </Badge> */}
                    </div>
                    <div className="mt-1 text-2xl font-semibold">{stats.completedAppointments || 0}</div>
                    <div className="text-orange-500 mt-2">
                        <Spark />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-2">
                            <Clock className="h-4 w-4" /> Upcoming Appointments
                        </span>
                        {/* <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200"
            >
              +18%
            </Badge> */}
                    </div>
                    <div className="mt-1 text-2xl font-semibold">{stats.upcomingAppointments || 0}</div>
                    <div className="text-violet-600 mt-2">
                        <Spark />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" /> Total Spent
                        </span>
                        {/* <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200"
            >
              +12%
            </Badge> */}
                    </div>
                    <div className="mt-1 text-2xl font-semibold">{formatCurrency(stats.totalSpent || 0)}</div>
                    <div className="text-pink-500 mt-2">
                        <Spark />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}


/* --------------------------------------
   Bookings Tab (upcoming + past + modal)
-------------------------------------- */
export type BookingItem = {
    id: string;
    price: number;
    doctor: string;
    tags: string[];
    dateLine: string;
    notes?: string;
    rawDate?: string;
    rawTimeStart?: string;
    rawTimeEnd?: string;
    title: string;
    category?: string;
    subcategory?: string;
    status?: string;
    serviceType?: string;
};


function Tag({ label }: { label: string }) {
    const map: Record<string, string> = {
        Health: "bg-blue-600/10 text-blue-700 border-blue-200",
        Finance: "bg-amber-500/10 text-amber-700 border-amber-200",
        Legal: "bg-violet-600/10 text-violet-700 border-violet-200",
        IT: "bg-emerald-600/10 text-emerald-700 border-emerald-200",
        Confirmed: "bg-sky-600/10 text-sky-700 border-sky-200",
        Pending: "bg-amber-600/10 text-amber-700 border-amber-200",
        Completed: "bg-emerald-600/10 text-emerald-700 border-emerald-200",
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

function PaymentDetailsModal({
    open,
    onClose,
    data,
}: {
    open: boolean;
    onClose: () => void;
    data: any;
}) {
    if (!open || !data) return null;

    return (
        <Modal open={open} onClose={onClose} title="Payment Details" subtitle="Complete transaction information">
            <div className="space-y-6">
                {/* Doctor & Status */}
                <div className="bg-muted/30 p-4 rounded-xl flex items-start justify-between">
                    <div>
                        <div className="font-semibold text-base">{data.doctor}</div>
                        <div className="text-sm text-muted-foreground">{data.subcategory || "General"}</div>
                    </div>
                    <Badge className={cn(
                        "text-white gap-1",
                        data.status === "Success" || data.status === "Completed" ? "bg-emerald-600 hover:bg-emerald-700" :
                            data.status === "Pending" ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"
                    )}>
                        <CheckCircle2 className="h-3 w-3" /> {data.status || "Completed"}
                    </Badge>
                </div>

                {/* Category & Service Type */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Category</div>
                        <div className="font-medium">{data.category || "Health"}</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Service Type</div>
                        <div className="font-medium">{data.serviceType || "Follow-up Consultation"}</div>
                    </div>
                </div>

                {/* Transaction Details Grid */}
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Transaction Date</div>
                        <div className="flex items-center gap-2 font-medium">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            {data.dateLine?.split(" (")[0]}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Amount</div>
                        <div className="text-xl font-semibold">₹{data.price}</div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Payment Method</div>
                        <div className="flex items-center gap-2 font-medium">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            {data.paymentMethod || "N/A"}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Invoice Number</div>
                        <div className="flex items-center gap-2 font-medium">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            {data.invoice || "N/A"}
                        </div>
                    </div>
                </div>

                {/* Transaction ID */}
                <div>
                    <div className="text-xs text-muted-foreground mb-1">Transaction ID</div>
                    <div className="flex items-center gap-2 font-medium">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {data.txn || data.transactionId || "N/A"}
                    </div>
                </div>

                <div className="border-t pt-4 flex items-center justify-between gap-3">
                    <div className="flex gap-3">
                        <Button variant="outline" className="gap-2">
                            <Download className="h-4 w-4" /> Download Invoice
                        </Button>
                        <Button variant="outline" className="gap-2">
                            <FileText className="h-4 w-4" /> Download Receipt
                        </Button>
                    </div>
                    <Button variant="destructive" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
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
                {/* Context Box */}
                <div className="bg-muted/30 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        {data.dateLine}
                    </div>
                    <div className="font-medium">{data.title?.split("•")[1] || "General Consultation"}</div>
                </div>

                {/* Notes Input */}
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
}: {
    b: BookingItem;
    past?: boolean;
    onOpen: (b: BookingItem) => void;
    onReschedule?: (b: BookingItem) => void;
    onCancel?: (b: BookingItem) => void;
    onViewNotes?: (b: BookingItem) => void;
}) {
    return (
        <div className="rounded-xl border bg-white p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
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
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
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
function formatDateLine(date: string, start: string, end: string, session: string) {
    if (!date) return "Date not set";
    const d = new Date(date);
    // "Fri, 24 Oct 2025"
    const dateStr = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    if (!start || !end) return `${dateStr}`;

    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);

    const startDate = new Date();
    startDate.setHours(sH, sM);
    const timeStr = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    const duration = (eH * 60 + eM) - (sH * 60 + sM);

    return `${dateStr} ${timeStr} (${duration} min) ${session}`;
}

function BookingsTab({ appointments, profile }: { appointments: any[], profile: any }) {
    const [open, setOpen] = useState<any | null>(null);
    const [cancelId, setCancelId] = useState<string | null>(null);
    const [rescheduleItem, setRescheduleItem] = useState<BookingItem | null>(null);
    const [notesItem, setNotesItem] = useState<BookingItem | null>(null);
    const queryClient = useQueryClient();

    // Reschedule Form State
    const [rDate, setRDate] = useState("");
    const [rStart, setRStart] = useState("");
    const [rEnd, setREnd] = useState("");

    useEffect(() => {
        if (rescheduleItem) {
            setRDate(rescheduleItem.rawDate || "");
            setRStart(rescheduleItem.rawTimeStart || "");
            setREnd(rescheduleItem.rawTimeEnd || "");
        }
    }, [rescheduleItem]);

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
        mutationFn: (payload: { id: string, date: string, timeStart: string, timeEnd: string }) =>
            AppointmentAPI.update(payload.id, { date: payload.date, timeStart: payload.timeStart, timeEnd: payload.timeEnd }),
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
        if (!rDate || !rStart || !rEnd) {
            toast.error("Please fill all fields");
            return;
        }
        rescheduleMutation.mutate({ id: rescheduleItem.id, date: rDate, timeStart: rStart, timeEnd: rEnd });
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

    const upcoming = appointments?.filter(a => UPCOMING_STATUSES.includes(a.status)) || [];
    const past = appointments?.filter(a => PAST_STATUSES.includes(a.status)) || [];
    return (
        <div className="space-y-4">
            <Card className="border-muted/50">
                <CardHeader className="pb-2">
                    <div className="text-sm font-semibold">Upcoming Appointments</div>
                    <div className="text-xs text-muted-foreground">
                        Your scheduled consultations
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {upcoming.length > 0 ? upcoming.map((b) => (
                        <BookingRow key={b._id} b={{
                            id: b._id,
                            price: b.payment?.amount,
                            doctor: b.consultantSnapshot?.name || "NA",
                            tags: [
                                (typeof b.consultantSnapshot?.category === 'object' ? b.consultantSnapshot.category.name : b.consultantSnapshot?.category) ||
                                (typeof b.category === 'object' ? b.category.name : b.category) || "General",
                                b.status || "Pending"
                            ],
                            title: `${b.consultantSnapshot?.subcategory || "General"} • ${b.reason || "Consultation"}`,
                            category: typeof b.category === 'object' ? b.category.name : b.category,
                            subcategory: b.consultantSnapshot?.subcategory,
                            status: b.status,
                            serviceType: b.session,
                            dateLine: formatDateLine(b.date, b.timeStart, b.timeEnd, b.session || "Video Call"),
                            notes: b.notes || "NA",
                            rawDate: b.date,
                            rawTimeStart: b.timeStart,
                            rawTimeEnd: b.timeEnd
                        }} onOpen={setOpen} onCancel={() => setCancelId(b._id)} onReschedule={(item) => setRescheduleItem(item)} />
                    )) : <div className="text-sm text-muted-foreground">No upcoming appointments.</div>}
                </CardContent>
            </Card>

            <Card className="border-muted/50">
                <CardHeader className="pb-2">
                    <div className="text-sm font-semibold">Past Appointments</div>
                    <div className="text-xs text-muted-foreground">
                        Your consultation history
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {past.length > 0 ? past.map((b) => (
                        <BookingRow key={b._id} b={{
                            id: b._id,
                            price: b.fee,
                            doctor: b.consultantSnapshot?.name || "NA",
                            tags: [b.category || "General", b.status || "NA"],

                            title: `${b.consultantSnapshot?.subcategory || "General"} • ${b.reason || "Consultation"}`,
                            category: b.category,
                            subcategory: b.consultantSnapshot?.subcategory,
                            status: b.status,
                            serviceType: b.session,
                            dateLine: formatDateLine(b.date, b.timeStart, b.timeEnd, b.session || "Video Call"),
                            notes: b.notes
                        }} past onOpen={setOpen} onViewNotes={setNotesItem} />
                    )) : <div className="text-sm text-muted-foreground">No past appointments.</div>}
                </CardContent>
            </Card>

            <Modal open={!!open} onClose={() => setOpen(null)} title="Appointment Details">
                {open && (
                    <div className="space-y-6 text-sm">
                        {/* Header Card */}
                        <div className="rounded-xl bg-muted/100 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-white border grid place-items-center text-sm font-medium text-muted-foreground">
                                    {profile?.fullName
                                        ?.split(" ")
                                        .map((n: string) => n[0])
                                        .slice(0, 2)
                                        .join("") || "ME"}
                                </div>
                                <div>
                                    <div className="font-semibold text-base">{profile?.fullName || "Client"}</div>
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

                        {/* Details Grid */}
                        <div className="space-y-6">
                            {/* Date & Time */}
                            <div className="space-y-1">
                                <div className="text-sm font-semibold text-gray-900">Date & Time</div>
                                <div className="text-muted-foreground text-sm">{formatCurrency(open.price || 0)} / session</div>
                                <div className="text-gray-700 text-sm mt-1">
                                    {open.dateLine}
                                </div>
                            </div>

                            {/* Consultation with */}
                            <div>
                                <div className="font-semibold mb-1">Consultation with</div>
                                <div className="text-muted-foreground">{open.doctor}</div>
                                <div className="text-muted-foreground text-sm">{open.tags[0]}</div>
                            </div>

                            {/* Reason */}
                            <div>
                                <div className="font-semibold mb-1">Reason</div>
                                <div className="text-muted-foreground">
                                    {open.title.split("•")[1]}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <div className="font-semibold text-sm mb-2">Notes</div>
                                <div className="rounded-lg bg-muted/100 p-4 text-sm text-muted-foreground">
                                    {open.notes || "No notes available."}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
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

            {/* Cancel Confirmation Modal */}
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

            {/* Reschedule Modal */}
            <Modal open={!!rescheduleItem} onClose={() => setRescheduleItem(null)} title="Reschedule Appointment">
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Date</label>
                        <Input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Start Time</label>
                            <Input type="time" value={rStart} onChange={(e) => setRStart(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">End Time</label>
                            <Input type="time" value={rEnd} onChange={(e) => setREnd(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setRescheduleItem(null)}>Cancel</Button>
                        <Button onClick={handleRescheduleSubmit} disabled={rescheduleMutation.isPending}>
                            {rescheduleMutation.isPending ? "Updating..." : "Confirm Reschedule"}
                        </Button>
                    </div>
                </div>
            </Modal>



            {/* Notes Modal */}
            <AppointmentNotesModal
                open={!!notesItem}
                onClose={() => setNotesItem(null)}
                data={notesItem}
                onSave={(notes) => notesItem && notesMutation.mutate({ id: notesItem.id, notes })}
            />

        </div>
    );
}

/* --------------------------------------
   Upload Documents Tab
-------------------------------------- */
export type DocItem = {
    id: string;
    title: string;
    type: "Medical Report" | "Consultation Notes" | "Prescription" | "Invoice";
    client: string;
    consultant: string;
    size: string;
    date: string;
};
const typeBadgeCls: Record<DocItem["type"], string> = {
    "Medical Report": "bg-blue-100 text-blue-700 border-blue-200",
    "Consultation Notes": "bg-yellow-100 text-yellow-700 border-yellow-200",
    Prescription: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Invoice: "bg-orange-100 text-orange-700 border-orange-200",
};
const DocRow = ({ d, onDelete, canDelete }: { d: any; onDelete: (id: string) => void; canDelete: boolean }) => {
    return (
        <div className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100">
                    <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                    <h4 className="text-sm font-medium text-gray-900">{d.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>• {d.size || "0 KB"}</span>
                        <span>• {d.date}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="h-10 w-10 border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg" onClick={() => window.open(d.fileUrl, "_blank")}>
                    <Eye className="w-5 h-5" />
                </Button>
                <Button variant="outline" size="icon" className="h-10 w-10 border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg" onClick={() => {
                    const link = document.createElement('a');
                    link.href = d.fileUrl;
                    link.download = d.title || 'document';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }}>
                    <Download className="w-5 h-5" />
                </Button>
                {canDelete && (
                    <Button variant="destructive" size="icon" className="h-10 w-10 bg-red-500 hover:bg-red-600 text-white rounded-lg hover:text-white" onClick={() => onDelete(d.id)}>
                        <Trash2 className="w-5 h-5" />
                    </Button>
                )}
            </div>
        </div>
    );
};
function filterDocs(docs: DocItem[], q: string, cat: string) {
    const nq = normalize(q);
    return docs.filter(
        (d) =>
            (cat === "All Categories" || d.type === cat) &&
            (!nq ||
                normalize(d.title).includes(nq) ||
                normalize(d.client).includes(nq))
    );
}
/* --------------------------------------
   Documents Tab (list + upload modal)
-------------------------------------- */
function DocumentsTab({ consultantId }: { consultantId: string }) { // consultantId to check delete permission
    const { clientId } = useParams<{ clientId: string }>();
    const queryClient = useQueryClient();
    const [q, setQ] = useState("");
    const [cat, setCat] = useState("All Categories");

    // Upload Modal State
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadTitle, setUploadTitle] = useState("");
    const [uploadType, setUploadType] = useState("Medical Report");
    const [uploadDesc, setUploadDesc] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data: documentsData, isLoading } = useQuery({
        queryKey: ["clientDocuments", clientId],
        queryFn: () => clientId ? DocumentAPI.getAll({ client: clientId }) : Promise.resolve({ documents: [] }),
        enabled: !!clientId
    });

    const items = useMemo(() => {
        if (!documentsData?.documents) return [];
        return documentsData.documents.map((d: any) => ({
            id: d._id,
            title: d.title,
            type: d.type,
            client: d.clientSnapshot?.fullName || d.client?.fullName || "Client",
            consultant: d.consultantSnapshot?.fullName || d.consultant?.fullName || "Consultant",
            size: d.formattedSize || "0 KB",
            date: new Date(d.createdAt).toLocaleDateString(),
            fileUrl: d.fileUrl,
            consultantId: d.consultant?._id || d.consultant, // Extract consultant ID or object
            uploadedBy: d.uploadedBy
        }));
    }, [documentsData]);

    const filtered = useMemo(() => filterDocs(items, q, cat), [items, q, cat]);

    const uploadMutation = useMutation({
        mutationFn: async () => {
            if (!uploadFile || !clientId) throw new Error("Missing file or client");

            // 1. Upload File
            const uploadRes = await UploadAPI.uploadDocument(uploadFile);
            const { url, key, fileName, size, mimeType } = uploadRes.data;

            // 2. Create Document
            const docPayload = {
                title: uploadTitle,
                type: uploadType,
                description: uploadDesc,
                client: clientId,
                // consultant: // Backend handles consultant assignment based on logged-in user if role is Consultant
                fileUrl: url,
                fileKey: key,
                fileName,
                originalFileName: uploadFile.name,
                fileSize: size,
                mimeType
            };

            return DocumentAPI.create(docPayload);
        },
        onSuccess: () => {
            toast.success("Document uploaded successfully");
            setIsUploadOpen(false);
            setUploadFile(null);
            setUploadTitle("");
            setUploadDesc("");
            queryClient.invalidateQueries({ queryKey: ["clientDocuments"] });
        },
        onError: (err: any) => {
            toast.error(err?.message || "Failed to upload document");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => DocumentAPI.delete(id),
        onSuccess: () => {
            toast.success("Document deleted");
            queryClient.invalidateQueries({ queryKey: ["clientDocuments"] });
            setDeleteId(null);
        },
        onError: (err: any) => {
            toast.error(err?.message || "Failed to delete document");
        }
    });

    const handleUpload = async () => {
        if (!uploadFile) {
            toast.error("Please select a file");
            return;
        }
        if (!uploadTitle) {
            toast.error("Please enter a title");
            return;
        }
        setIsUploading(true);
        try {
            await uploadMutation.mutateAsync();
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = (id: string) => {
        setDeleteId(id);
    };

    return (
        <div className="space-y-4">
            <Card className="border-muted/50">
                <CardHeader className="pb-2">
                    <h3 className="text-base font-semibold">Document Management</h3>
                    <div className="text-xs text-muted-foreground">
                        Manage and monitor all platform documents
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <Button className="gap-2 bg-blue-500 hover:bg-blue-600" onClick={() => setIsUploadOpen(true)}>
                            <UploadIcon className="h-4 w-4" /> Upload Document
                        </Button>
                    </div>

                    <div className="relative">
                        <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/4 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search by title..."
                            className="pl-9"
                        />
                    </div>

                    <div className="space-y-3">
                        {isLoading ? <div className="text-center p-4">Loading documents...</div> :
                            filtered.length > 0 ? filtered.map((doc: any) => (
                                <DocRow
                                    key={doc.id} // Changed from doc._id to doc.id based on items mapping
                                    d={doc}
                                    onDelete={handleDelete}
                                    canDelete={String(doc.uploadedBy) === String(consultantId)} // Only allow delete if uploaded by current consultant
                                />
                            )) : (
                                <div className="text-sm text-muted-foreground text-center py-4">
                                    No documents found.
                                </div>
                            )}
                    </div>
                </CardContent>
            </Card>

            {/* Upload Modal */}
            <Modal open={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload Document">
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Title</label>
                        <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="e.g. Lab Report - Oct 24" />
                    </div>



                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Description (Optional)</label>
                        <Input value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} placeholder="Short description..." />
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium">File</label>
                        <Input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpload} disabled={isUploading} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {isUploading ? "Uploading..." : "Upload"}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Document">
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete this document? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

/* --------------------------------------
   Payments Tab (list + modal)
-------------------------------------- */
export type PaymentItem = {
    id: string;
    initials: string;
    doctor: string;
    dept: "Health" | "Finance" | "Legal" | "IT";
    status: "Completed" | "Success" | "Pending" | "Failed" | "Refunded";
    title: string;
    date: string;
    method: string;
    txn: string;
    invoice: string;
    invoiceUrl?: string;
    price: number;
    session: string;
};

const deptPill: Record<PaymentItem["dept"], string> = {
    Health: "bg-blue-600/10 text-blue-700 border-blue-200",
    Finance: "bg-amber-500/10 text-amber-700 border-amber-200",
    Legal: "bg-violet-600/10 text-violet-700 border-violet-200",
    IT: "bg-emerald-600/10 text-emerald-700 border-emerald-200",
};
function PaymentRow({
    p,
    onOpen,
}: {
    p: PaymentItem;
    onOpen: (p: PaymentItem) => void;
}) {
    return (
        <div className="rounded-xl border bg-white p-4 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div className="flex gap-3">
                <div className="h-10 w-10 rounded-md bg-muted grid place-items-center text-xs font-medium text-muted-foreground">
                    {p.initials}
                </div>
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">{p.doctor}</div>
                        <Badge
                            variant="outline"
                            className={cn(
                                "px-2 py-0.5 text-xs rounded-full",
                                deptPill[p.dept]
                            )}
                        >
                            {p.dept}
                        </Badge>
                        <Badge
                            variant="outline"
                            className={cn(
                                "px-2 py-0.5 text-xs rounded-full border",
                                p.status === "Success" || p.status === "Completed"
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                    : p.status === "Pending"
                                        ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                        : "bg-red-100 text-red-700 border-red-200"
                            )}
                        >
                            {p.status}
                        </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{p.title}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm text-muted-foreground mt-1">
                        <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-4 w-4" />
                            {p.date}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <Hash className="h-4 w-4" /> Invoice: {p.invoice}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <CreditCard className="h-4 w-4" /> {p.method}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <FileCog className="h-4 w-4" /> {p.txn}
                        </span>
                    </div>
                </div>
            </div>

            <div className="min-w-[220px] flex flex-col items-end gap-2">
                <div className="font-semibold">{formatCurrency(p.price)}</div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={!p.invoiceUrl}
                        onClick={() => {
                            if (p.invoiceUrl) {
                                const link = document.createElement('a');
                                link.href = p.invoiceUrl;
                                link.setAttribute('download', 'Invoice.pdf');
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }
                        }}
                    >
                        <Download className="h-4 w-4" /> Invoice
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={!p.invoiceUrl}
                        onClick={() => {
                            if (p.invoiceUrl) window.open(`${p.invoiceUrl}&view=inline`, '_blank');
                        }}
                    >
                        <Receipt className="h-4 w-4" /> Receipt
                    </Button>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-muted-foreground"
                    onClick={() => onOpen(p)}
                >
                    <Eye className="h-4 w-4" /> View Details
                </Button>
            </div>
        </div>
    );
}
function filterPayments(items: PaymentItem[], q: string) {
    const nq = normalize(q);
    return items.filter(
        (p) =>
            !nq ||
            normalize(p.doctor).includes(nq) ||
            normalize(p.invoice).includes(nq) ||
            normalize(p.method).includes(nq) ||
            normalize(p.title).includes(nq) ||
            normalize(p.txn).includes(nq)
    );
}
function PaymentsTab({ transactions }: { transactions: any[] }) {
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState("All Payments");
    const [open, setOpen] = useState<any | null>(null);

    // Transform API data to component format if needed, or use directly
    // Assuming API returns data compatible or we map it here
    const mappedTransactions = transactions.map(t => ({
        id: t._id,
        initials: getInitials(t.consultantSnapshot?.name || t.consultant?.fullName || t.consultant?.name || "Unknown"),
        doctor: t.consultantSnapshot?.name || t.consultant?.fullName || t.consultant?.name || "Unknown",
        dept: (typeof (t.consultantSnapshot?.category || t.consultant?.category) === 'object'
            ? (t.consultantSnapshot?.category?.name || t.consultant?.category?.name)
            : (t.consultantSnapshot?.category || t.consultant?.category)) || "General",
        status: t.status,
        title: `${(typeof (t.consultantSnapshot?.subcategory || t.consultant?.subcategory) === 'object' ? (t.consultantSnapshot?.subcategory?.name || t.consultant?.subcategory?.name) : (t.consultantSnapshot?.subcategory || t.consultant?.subcategory)) || t.consultant?.title || "Consultation"} • ${t.appointment?.reason || "Session"}`,
        date: new Date(t.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        method: t.paymentMethod,
        txn: t.transactionId || "N/A",
        invoice: t.metadata?.invoiceId || "INV-" + t._id.substring(18),
        invoiceUrl: t.invoiceUrl,
        price: t.amount || 0,
        session: t.appointment?.session || "Video Call",
    }));

    const filtered = useMemo(() => filterPayments(mappedTransactions, q), [mappedTransactions, q]);

    return (
        <div className="space-y-4">
            <Card className="border-muted/50">
                <CardHeader className="pb-2">
                    <h3 className="text-base font-semibold">Payment History</h3>
                    <div className="text-xs text-muted-foreground">
                        Complete record of all your transactions
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="relative w-full">
                            <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/4 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Search by consultant, invoice number..."
                                className="pl-9"
                            />
                        </div>
                        <Select value={filter} onValueChange={setFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="All Payments" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All Payments">All Payments</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        {filtered.map((p) => (
                            <PaymentRow key={p.id} p={p} onOpen={setOpen} />
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Payment Details Modal */}
            <Modal
                open={!!open}
                onClose={() => setOpen(null)}
                title="Payment Details"
                subtitle="Complete transaction information"
            >
                {open && (
                    <div className="space-y-4 text-sm">
                        {/* Top card */}
                        <div className="rounded-lg border bg-muted/30 p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{open.doctor}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {open.dept === "Health" ? "Cardiology" : open.dept}
                                    </div>
                                </div>
                                <Badge
                                    variant="outline"
                                    className="bg-emerald-100 text-emerald-700 border-emerald-200"
                                >
                                    ● Completed
                                </Badge>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <div className="text-xs text-muted-foreground">Category</div>
                                    <div className="font-medium">{open.dept}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground">
                                        Service Type
                                    </div>
                                    <div className="font-medium">
                                        {open.session}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Details rows */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            <div>
                                <div className="text-xs text-muted-foreground">
                                    Transaction Date
                                </div>
                                <div className="flex items-center gap-2 font-medium">
                                    <CalendarDays className="h-4 w-4" /> {open.date}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 mb-1">Amount</div>
                                <div className="text-xl font-semibold">{formatCurrency(open.price)}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Payment Method</div>
                                <div className="flex items-center gap-2 font-medium">
                                    <CreditCard className="h-4 w-4" /> {open.method}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Invoice Number</div>
                                <div className="flex items-center gap-2 font-medium">
                                    <Hash className="h-4 w-4" /> {open.invoice}
                                </div>
                            </div>
                            <div className="col-span-2">
                                <div className="text-xs text-muted-foreground">
                                    Transaction ID
                                </div>
                                <div className="flex items-center gap-2 font-medium">
                                    <FileCog className="h-4 w-4" /> {open.txn}
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 border-t flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    className="gap-2"
                                    size="sm"
                                    disabled={!open.invoiceUrl}
                                    onClick={() => {
                                        if (open.invoiceUrl) {
                                            const link = document.createElement('a');
                                            link.href = open.invoiceUrl;
                                            link.setAttribute('download', 'Invoice.pdf');
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                        }
                                    }}
                                >
                                    <Download className="h-4 w-4" /> Download Invoice
                                </Button>
                                <Button
                                    variant="outline"
                                    className="gap-2"
                                    size="sm"
                                    disabled={!open.invoiceUrl}
                                    onClick={() => {
                                        if (open.invoiceUrl) window.open(`${open.invoiceUrl}&view=inline`, '_blank');
                                    }}
                                >
                                    <Receipt className="h-4 w-4" /> Download Receipt
                                </Button>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setOpen(null)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

/* --------------------------------------
   Main Page with persistent heading + header + tabs
-------------------------------------- */
export default function Consultant_ClientProfile() {
    const { clientId } = useParams<{ clientId: string }>();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = (searchParams.get("tab") as "bookings" | "documents" | "payments") || "bookings";

    const setTab = (t: "bookings" | "documents" | "payments") => {
        setSearchParams({ tab: t });
    };

    const { data: profile, isLoading: loadingProfile, refetch: refetchProfile } = useQuery({
        queryKey: ["clientProfile", clientId],
        queryFn: () => clientId ? ClientAPI.getProfileById(clientId) : Promise.resolve(null),
        enabled: !!clientId
    });

    const { data: statsData, isLoading: loadingStats } = useQuery({
        queryKey: ["clientStats", clientId],
        queryFn: () => clientId ? DashboardAPI.getClientStatsById(clientId) : Promise.resolve(null),
        enabled: !!clientId
    });

    const stats = useMemo(() => {
        if (!statsData?.stats) return {};
        return statsData.stats.reduce((acc: any, curr: any) => {
            if (curr.id === 'total') acc.totalAppointments = curr.value;
            if (curr.id === 'completed') acc.completedAppointments = curr.value;
            if (curr.id === 'upcoming') acc.upcomingAppointments = curr.value;
            if (curr.id === 'spent') acc.totalSpent = curr.value;
            return acc;
        }, {});
    }, [statsData]);

    const { data: transactionsData, isLoading: loadingTransactions } = useQuery({
        queryKey: ["clientTransactions"],
        queryFn: () => TransactionAPI.getTransactions(),
    });

    // Filter transactions for this client
    const transactions = useMemo(() => {
        const all = transactionsData?.data || [];
        if (!clientId) return [];
        return all.filter((t: any) => (t.user?._id === clientId || t.user === clientId));
    }, [transactionsData, clientId]);

    const { data: appointmentsData, isLoading: loadingAppointments } = useQuery({
        queryKey: ["clientAppointments", clientId],
        queryFn: () => clientId ? AppointmentAPI.getAll({ client: clientId }) : Promise.resolve({ data: [] }),
        enabled: !!clientId
    });

    const appointments = useMemo(() => appointmentsData?.data || [], [appointmentsData]);

    if (loadingProfile) {
        return <div className="p-8 text-center">Loading profile...</div>;
    }

    const tabs = [
        {
            key: "bookings",
            label: "Bookings",
            icon: <CalendarDays className="h-4 w-4" />,
        },
        {
            key: "documents",
            label: "Upload Document",
            icon: <FileText className="h-4 w-4" />,
        },
        {
            key: "payments",
            label: "Payments",
            icon: <IndianRupee className="h-4 w-4" />,
        },
    ];

    return (
        <div className="mx-auto w-full max-w-7xl space-y-4">
            <PageHeading profile={profile} />

            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-2 rounded-full">
                {tabs.map((t) => (
                    <Button
                        key={t.key}
                        variant={tab === t.key ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                            "flex items-center gap-2 rounded-full",
                            tab === t.key ? "bg-blue-500 hover:bg-blue-600 shadow-sm" : "text-muted-foreground"
                        )}
                        onClick={() => setTab(t.key as any)}
                    >
                        {t.icon}
                        {t.label}
                    </Button>
                ))}
            </div>


            {/* {tab === "profile" && <ProfileTab profile={profile} stats={stats} />} */}
            {tab === "bookings" && <BookingsTab appointments={appointments} profile={profile} />}
            {tab === "documents" && <DocumentsTab consultantId={user?._id || user?.id || ""} />}
            {tab === "payments" && <PaymentsTab transactions={transactions} />}
        </div>
    );
}
