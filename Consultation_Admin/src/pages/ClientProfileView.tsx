import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Download,
    X,
    User,
    CalendarDays,
    Mail,
    Phone,
    MapPin,
    ArrowLeft,
    CreditCard,
    Receipt,
    Eye,
    FileText,
    Calendar
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import AppointmentAPI from "@/api/appointment.api";
import ClientAPI from "@/api/client.api";

/* --------------------------------------
   Helper Components
-------------------------------------- */
function PageHeading({ profile, onBack }: { profile: any; onBack: () => void }) {
    if (!profile) return null;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-lg font-semibold">Client Profile</h1>
                    <p className="text-xs text-muted-foreground">View client details and history</p>
                </div>
            </div>

            <div className="rounded-xl border bg-blue-50/80 p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 grow">
                    <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold border-2 border-white shadow-sm">
                        {(profile.fullName || profile.name || "C").charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="text-lg font-semibold">{profile.fullName || profile.name}</div>
                        <div className="text-xs text-muted-foreground">
                            {profile.email}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                            <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 border-emerald-400"
                            >
                                {profile.status || "Active"}
                            </Badge>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {profile.role || "Client"}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className="text-right text-xs text-muted-foreground hidden sm:block">
                    <div>Joined on</div>
                    <div className="font-medium text-foreground">
                        {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Labeled({
    label,
    icon: Icon,
    value,
}: {
    label: string;
    icon?: any;
    value: string;
}) {
    return (
        <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="relative">
                {Icon && (
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                    value={value}
                    readOnly
                    disabled
                    className={`bg-muted/40 border-muted/60 text-sm ${Icon ? "pl-9" : ""}`}
                />
            </div>
        </div>
    );
}

function ProfileTab({ profile }: { profile: any }) {
    if (!profile) return null;

    return (
        <Card className="border-muted/50">
            <CardHeader className="pb-2">
                <div className="text-sm font-semibold">Personal Information</div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Labeled label="Full Name" icon={User} value={profile.fullName || profile.name || ""} />
                    <Labeled label="Email Address" icon={Mail} value={profile.email || ""} />
                    <Labeled label="Phone Number" icon={Phone} value={profile.mobile || profile.phone || "N/A"} />
                    <Labeled
                        label="Date of Birth"
                        icon={CalendarDays}
                        value={profile.dob ? new Date(profile.dob).toLocaleDateString() : "N/A"}
                    />
                    <Labeled label="Address" icon={MapPin} value={profile.address || "N/A"} />
                    <Labeled label="City" icon={MapPin} value={profile.city || "N/A"} />
                    <Labeled
                        label="Emergency Contact"
                        icon={Phone}
                        value={profile.emergencyContact || "N/A"}
                    />
                </div>
            </CardContent>
        </Card>
    );
}

/* --------------------------------------
   Modals
-------------------------------------- */
function AppointmentDetailsModal({
    appointment,
    open,
    onClose,
}: {
    appointment: any;
    open: boolean;
    onClose: () => void;
}) {
    if (!appointment) return null;

    const dateObj = new Date(appointment.date || appointment.createdAt);
    const formattedDate = dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
    });
    const formattedTime = appointment.timeStart
        ? new Date(`2000-01-01T${appointment.timeStart}`).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "numeric",
            hour12: true,
        })
        : "";

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-[500px] p-0 overflow-hidden sm:rounded-xl fixed top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/4 w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200 p-6 overflow-visible">
                <div className="p-6 pb-0">
                    <div className="flex items-center justify-between mb-4">
                        <DialogTitle className="text-xl font-semibold">Appointment Details</DialogTitle>
                    </div>

                    <div className="space-y-6">
                        {/* Header Card */}
                        <div className="bg-gray-50 p-4 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-white border flex items-center justify-center text-lg font-semibold text-gray-700">
                                    {appointment.client?.name?.charAt(0).toUpperCase() || "C"}
                                </div>
                                <div>
                                    <div className="font-semibold text-lg">{appointment.client?.name || "Client"}</div>
                                    <div className="text-sm text-gray-500">Client</div>
                                </div>
                            </div>
                            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none px-3 py-1">
                                {appointment.status || "Confirmed"}
                            </Badge>
                        </div>

                        {/* Date & Time */}
                        <div className="space-y-1">
                            <div className="text-sm font-semibold text-gray-900">Date & Time</div>
                            <div className="text-sm text-gray-500">₹ {appointment.price || 0} / session</div>
                            <div className="text-sm text-gray-700">
                                {formattedDate} {formattedTime} ({appointment.duration || 60} min) {appointment.session || "Video Call"}
                            </div>
                        </div>

                        {/* Consultation With */}
                        <div className="space-y-1">
                            <div className="text-sm font-semibold text-gray-900">Consultation with</div>
                            <div className="text-sm text-gray-700">{appointment.consultant?.fullName || appointment.doctor || "Consultant"}</div>
                            <div className="text-sm text-gray-500">{appointment.category || "General"}</div>
                        </div>

                        {/* Reason */}
                        <div className="space-y-1">
                            <div className="text-sm font-semibold text-gray-900">Reason</div>
                            <div className="text-sm text-gray-700">{appointment.reason || "N/A"}</div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <div className="text-sm font-semibold text-gray-900">Notes</div>
                            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 min-h-[60px]">
                                {appointment.notes || "No notes provided."}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-6 pt-2"></div>
            </DialogContent>
        </Dialog>
    );
}

function PaymentDetailsModal({
    appointment,
    open,
    onClose,
}: {
    appointment: any;
    open: boolean;
    onClose: () => void;
}) {
    if (!appointment) return null;

    const dateObj = new Date(appointment.date || appointment.createdAt);
    const formattedDate = dateObj.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-[600px] p-0 overflow-hidden sm:rounded-xl fixed top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/4 w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200 p-6 overflow-visible">
                <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-lg font-semibold">Payment Details</DialogTitle>
                            <DialogDescription className="text-xs text-gray-500 mt-1">
                                Complete transaction information
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Consultant Card */}
                    <div className="border rounded-xl p-4 flex items-start justify-between">
                        <div className="space-y-4 w-full">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-semibold text-base">{appointment.consultant?.fullName || appointment.doctor || "Consultant"}</div>
                                    <div className="text-xs text-gray-500">{appointment.category || "Finance"}</div>
                                </div>
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2.5 py-0.5 text-xs font-medium rounded-full flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    Completed
                                </Badge>
                            </div>

                            <div className="flex justify-between items-center w-full pt-1">
                                <div>
                                    <div className="text-xs text-gray-500 mb-0.5">Category</div>
                                    <div className="font-medium text-sm text-gray-900">{appointment.category || "Finance"}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-gray-500 mb-0.5">Service Type</div>
                                    <div className="font-medium text-sm text-gray-900">{appointment.session || "Video Call"}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Details Grid */}
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Transaction Date</div>
                            <div className="flex items-center gap-2 font-medium text-sm text-gray-900">
                                <CalendarDays className="h-4 w-4 text-gray-500" />
                                {formattedDate}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Amount</div>
                            <div className="font-bold text-lg text-gray-900">₹{appointment.fee || appointment.price || 0}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Payment Method</div>
                            <div className="flex items-center gap-2 font-medium text-sm text-gray-900">
                                <CreditCard className="h-4 w-4 text-gray-500" />
                                {appointment.paymentMethod || "Credit Card"}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-1">Invoice Number</div>
                            <div className="flex items-center gap-2 font-medium text-sm text-gray-900">
                                <span className="text-gray-500">#</span>
                                {appointment.invoiceNumber || "N/A"}
                            </div>
                        </div>
                        <div className="col-span-2">
                            <div className="text-xs text-gray-500 mb-1">Transaction ID</div>
                            <div className="flex items-center gap-2 font-medium text-sm text-gray-900">
                                <FileText className="h-4 w-4 text-gray-500" />
                                TXN-{appointment._id?.slice(-10).toUpperCase() || "N/A"}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-gray-50/50 flex sm:justify-between items-center border-t gap-3">
                    <Button variant="destructive" className="h-9 px-6 bg-red-500 hover:bg-red-600 border-none w-full sm:w-auto" onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function BookingsTab({ clientId }: { clientId: string }) {
    const [selectedAppt, setSelectedAppt] = useState<any | null>(null);
    // Fetch appointments for this client
    const { data, isLoading } = useQuery({
        queryKey: ["client-appointments", clientId],
        queryFn: async () => {
            try {
                // Pass client ID and high limit to backend to fetch all records for this client
                const res = await AppointmentAPI.getAll({ client: clientId, limit: 1000 });

                let appointments = [];
                // Handle different response structures (paginated vs non-paginated)
                if (res?.data?.data && Array.isArray(res.data.data)) {
                    appointments = res.data.data;
                } else if (res?.data && Array.isArray(res.data)) {
                    appointments = res.data;
                } else if (Array.isArray(res)) {
                    appointments = res;
                }

                return appointments;
            } catch (error) {
                console.error("Error fetching appointments:", error);
                return [];
            }
        },
        enabled: !!clientId
    });

    const appointments = data || [];

    if (isLoading) return <div className="text-sm text-gray-500">Loading appointments...</div>;

    return (
        <Card className="border-muted/50">
            <CardHeader className="pb-2">
                <div className="text-sm font-semibold">Appointment History</div>
            </CardHeader>
            <CardContent>
                {appointments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">No appointments found.</div>
                ) : (
                    <div className="space-y-4">
                        {appointments.map((appt: any) => {
                            const dateObj = new Date(appt.date || appt.createdAt);
                            // Format date: Fri, 19 Dec 2025
                            const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                            // Format time: 9:00 AM
                            const formattedTime = appt.timeStart ? new Date(`2000-01-01T${appt.timeStart}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) : "";

                            return (
                                <div key={appt._id} className="border rounded-xl p-4 bg-white shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:shadow-md transition-shadow">
                                    <div className="flex gap-4 items-start w-full">
                                        {/* Avatar / Initials */}
                                        <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-sm shrink-0">
                                            {appt.consultant?.fullName ? appt.consultant.fullName.substring(0, 2).toUpperCase() : "CO"}
                                        </div>

                                        {/* Main Info */}
                                        <div className="space-y-1.5 grow">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-semibold text-gray-900 text-base">
                                                    {appt.consultant?.fullName || appt.doctor || "Consultant"}
                                                </h3>
                                                <Badge variant="secondary" className="bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200 font-normal text-[10px] px-2">
                                                    {appt.category || "General"}
                                                </Badge>
                                                <Badge variant="secondary" className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 font-normal text-[10px] px-2">
                                                    {appt.status || "Upcoming"}
                                                </Badge>
                                            </div>

                                            <p className="text-sm text-gray-500">
                                                {appt.category || "Consultation"} • {appt.reason || "General Consultation"}
                                            </p>

                                            <div className="space-y-1 mt-3">
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                    <span>{formattedDate} {formattedTime} ({appt.duration || 60} min) {appt.session || "Video Call"}</span>
                                                </div>
                                                {appt.notes && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                                                        <span>{appt.notes}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side */}
                                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto gap-2 sm:pl-4 sm:border-l border-gray-100 min-w-[120px]">
                                        <div className="text-xl font-bold text-gray-900">₹{appt.fee || appt.price || 500}</div>

                                        <div className="mt-2 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-gray-500 h-auto p-0 hover:bg-transparent hover:text-blue-600 text-xs font-medium flex items-center gap-1 justify-end w-full"
                                                onClick={() => setSelectedAppt(appt)}
                                            >
                                                View Details
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>

            <AppointmentDetailsModal
                open={!!selectedAppt}
                appointment={selectedAppt}
                onClose={() => setSelectedAppt(null)}
            />
        </Card>
    );
}

function PaymentsTab({ clientId }: { clientId: string }) {
    const [selectedPayment, setSelectedPayment] = useState<any | null>(null);

    // Re-using appointment data to show payments
    const { data, isLoading } = useQuery({
        queryKey: ["client-appointments", clientId], // Using same key to share cache
        queryFn: async () => {
            try {
                // Pass client ID and high limit to backend to fetch all records for this client
                const res = await AppointmentAPI.getAll({ client: clientId, limit: 1000 });

                let appointments = [];
                // Handle different response structures (paginated vs non-paginated)
                if (res?.data?.data && Array.isArray(res.data.data)) {
                    appointments = res.data.data;
                } else if (res?.data && Array.isArray(res.data)) {
                    appointments = res.data;
                } else if (Array.isArray(res)) {
                    appointments = res;
                }

                return appointments;
            } catch (error) {
                console.error("Error fetching appointments:", error);
                return [];
            }
        },
        enabled: !!clientId
    });

    const payments = data || [];

    if (isLoading) return <div className="text-sm text-gray-500">Loading payments...</div>;

    return (
        <Card className="border-muted/50">
            <CardHeader className="pb-2">
                <div className="text-sm font-semibold">Payment History</div>
            </CardHeader>
            <CardContent>
                {payments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">No payment history found.</div>
                ) : (
                    <div className="space-y-4">
                        {payments.map((appt: any) => {
                            const dateObj = new Date(appt.date || appt.createdAt);
                            const month = dateObj.toLocaleString('default', { month: 'short' });
                            const day = dateObj.getDate();
                            const year = dateObj.getFullYear();
                            const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

                            return (
                                <div key={appt._id} className="border rounded-xl p-4 bg-white shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:shadow-md transition-shadow">
                                    <div className="flex gap-4 items-start w-full">
                                        {/* Date Badge */}
                                        <div className="bg-gray-100 rounded-lg p-2 text-center min-w-[60px] h-fit">
                                            <div className="text-xs text-gray-500 font-medium">{month}</div>
                                            <div className="text-lg font-bold text-gray-700">{day}</div>
                                        </div>

                                        {/* Main Info */}
                                        <div className="space-y-1.5 grow">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-semibold text-gray-900 text-base">
                                                    {appt.consultant?.fullName || appt.doctor || "Consultant"}
                                                </h3>
                                                <Badge variant="secondary" className="bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200 font-normal text-[10px] px-2">
                                                    {appt.category || "Consultation"}
                                                </Badge>
                                                <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200 font-normal text-[10px] px-2">
                                                    Success
                                                </Badge>
                                            </div>

                                            <p className="text-sm text-gray-500">
                                                {appt.category || "General"} • {appt.title || "Consultation Session"}
                                            </p>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-x-6 gap-y-2 mt-3 text-xs text-gray-500">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                    {formattedDate}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-gray-400">#</span>
                                                    Invoice: N/A
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                                                    Google Pay
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                                                    TXN-{appt._id?.slice(-10).toUpperCase() || "N/A"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side */}
                                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto gap-2 sm:pl-4 sm:border-l border-gray-100 min-w-[100px]">
                                        <div className="text-xl font-bold text-gray-900">₹{appt.fee || appt.price || 500}</div>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-gray-500 h-auto p-0 hover:bg-transparent hover:text-blue-600 text-xs font-medium flex items-center gap-1"
                                            onClick={() => setSelectedPayment(appt)}
                                        >
                                            <Eye className="w-3.5 h-3.5" /> View Details
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>

            <PaymentDetailsModal
                open={!!selectedPayment}
                appointment={selectedPayment}
                onClose={() => setSelectedPayment(null)}
            />
        </Card>
    );
}

/* --------------------------------------
   Main Component
-------------------------------------- */
export default function ClientProfileView({ client, onBack }: { client: any; onBack: () => void }) {
    const [activeTab, setActiveTab] = useState<"profile" | "bookings" | "payments">("profile");

    // Fetch full client profile details
    const { data: fullProfile, isLoading } = useQuery({
        queryKey: ["client-profile", client._id || client.id],
        queryFn: async () => {
            try {
                // Determine ID to use (could be _id or id)
                const id = client._id || client.id;
                if (!id) return client;
                const res = await ClientAPI.getProfile(id);
                return res.data || res;
            } catch (err) {
                console.error("Error fetching client profile:", err);
                return client; // Fallback to passed prop on error
            }
        },
        initialData: client, // Use passed prop as initial data
        enabled: !!(client._id || client.id)
    });


    const displayProfile = fullProfile || client;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <PageHeading profile={displayProfile} onBack={onBack} />

            {/* Tabs */}
            <div className="flex border-b">
                <button
                    onClick={() => setActiveTab("profile")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "profile"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Profile Details
                </button>
                <button
                    onClick={() => setActiveTab("bookings")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "bookings"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Appointments
                </button>
                <button
                    onClick={() => setActiveTab("payments")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "payments"
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Payments
                </button>
            </div>

            <div className="min-h-[300px]">
                {activeTab === "profile" && <ProfileTab profile={displayProfile} />}
                {activeTab === "bookings" && <BookingsTab clientId={client._id || client.id} />}
                {activeTab === "payments" && <PaymentsTab clientId={client._id || client.id} />}
            </div>
        </div>
    );
}
