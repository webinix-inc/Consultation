import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import AppointmentAPI from "@/api/appointment.api";
import PaymentAPI from "@/api/payment.api";
// agoraService removed (unused)

interface BookingSchedule {
    client: string;
    consultant: string;
    date: Date;
    time: string | null;
    session: "Video Call";
    reason: string;
    notes: string;
}

interface UseBookingProps {
    user: any;
    isAuthenticated: boolean;
    activeConsultants: any[];
    categories: any[];
}

export function useBooking({ user, isAuthenticated, activeConsultants, categories }: UseBookingProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [sched, setSched] = useState<BookingSchedule>({
        client: "",
        consultant: "",
        date: new Date(), // Local browser time, represents "Today"
        time: null,
        session: "Video Call",
        reason: "",
        notes: "",
    });

    const [showBookingModal, setShowBookingModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [selectedConsultant, setSelectedConsultant] = useState<any>(null);
    const [selectedCategoryForBooking, setSelectedCategoryForBooking] = useState("");

    // New State for Hold
    const [holdId, setHoldId] = useState<string | null>(null);
    const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);

    // Helper: Format Date to YYYY-MM-DD (Local)
    // We want the literal date selected in the calendar
    const formatDateToISO = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const handlePreBooking = async (fee: number) => {
        if (!isAuthenticated || user?.role !== "Client") {
            toast.error("Please login as a client");
            return;
        }
        if (!sched.consultant) {
            toast.error("Please select a consultant");
            return;
        }
        if (!sched.date) {
            toast.error("Please select a date");
            return;
        }
        // Past date check (Local day start)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(sched.date);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            toast.error("Cannot book in the past");
            return;
        }

        if (!sched.time) {
            toast.error("Please select a time slot");
            return;
        }

        // --- LOCK SLOT HERE ---
        setIsProcessingPayment(true); // Show loading state on "Confirm" button in ScheduleModal
        try {
            const dateISO = formatDateToISO(sched.date);
            const slotTime = sched.time || "";
            const [startHH, startMM] = slotTime.split(" - ")[0].split(":");
            const endTimeStr = slotTime.split(" - ")[1];
            let endHH = "00", endMM = "00";

            if (endTimeStr) {
                [endHH, endMM] = endTimeStr.split(":");
            } else {
                const h = parseInt(startHH);
                endHH = String(h + 1).padStart(2, '0');
                endMM = startMM;
            }

            // Construct timestamps with explicit IST offset (+05:30)
            // This ensures the backend receives the exact intended time regardless of client timezone,
            // while maintaining the Standard ISO String format used elsewhere in the system.
            const startAt = `${dateISO}T${startHH}:${startMM}:00+05:30`;
            const endAt = `${dateISO}T${endHH}:${endMM}:00+05:30`;

            const holdRes = await AppointmentAPI.holdSlot({
                consultant: sched.consultant,
                client: sched.client || user?.id || user?._id,
                startAt,
                endAt,
                date: dateISO,
                timeStart: `${startHH}:${startMM}`,
                timeEnd: `${endHH}:${endMM}`,
                amount: fee
            });

            const newHoldId = holdRes.data?.holdId || holdRes.holdId;
            const newExpiresAt = holdRes.data?.expiresAt || holdRes.expiresAt;

            setHoldId(newHoldId);
            setHoldExpiresAt(newExpiresAt);

            // Open Confirm Modal only after successful hold
            setShowConfirmModal(true);
        } catch (err: any) {
            console.error("Hold failed", err);
            toast.error(err?.response?.data?.message || "Slot unavailable. Please pick another.");
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const handleExpire = useCallback(() => {
        toast.error("Slot hold expired. Please try again.");
        setShowConfirmModal(false);
        setHoldId(null);
        setHoldExpiresAt(null);
    }, []);

    const runPostPaymentSuccess = async (appt: any) => {
        toast.success("Booking confirmed!");
        let downloadUrl = appt?.payment?.invoiceUrl;
        if (downloadUrl) {
            try {
                const response = await fetch(downloadUrl);
                if (!response.ok) throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
                const blob = await response.blob();
                const disposition = response.headers.get('Content-Disposition');
                let filename = `Invoice-${appt._id}.pdf`;
                if (disposition && disposition.includes('filename=')) {
                    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                    if (matches != null && matches[1]) filename = matches[1].replace(/['"]/g, '');
                }
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                toast.success("Invoice downloaded successfully!");
            } catch (e: any) {
                console.error("Auto-download failed:", e);
                toast.error(`Download failed: ${e.message}`);
                window.open(downloadUrl, "_blank");
            }
        } else {
            toast.error("Invoice URL missing! Please contact support.", { duration: 5000 });
        }
        setHoldId(null);
        setHoldExpiresAt(null);
        setShowBookingModal(false);
        setShowConfirmModal(false);
        setSelectedConsultant(null);
        setSched(prev => ({ ...prev, consultant: "", time: null, reason: "", notes: "" }));
        queryClient.invalidateQueries({ queryKey: ["appointments"] });
        queryClient.invalidateQueries({ queryKey: ["available-slots"] });
        queryClient.invalidateQueries({ queryKey: ["clientTransactions"] });
    };

    const confirmBooking = async (consultationFee: number, paymentMethod: string = "Razorpay") => {
        if (paymentMethod === "PayPal") {
            toast.error("Use the PayPal button below to pay.");
            return;
        }
        if (!window.Razorpay) {
            toast.error("Payment gateway loading...");
            return;
        }
        if (isProcessingPayment) return;
        if (!holdId) {
            toast.error("Session expired. Please re-book.");
            setShowConfirmModal(false);
            return;
        }

        setIsProcessingPayment(true);

        try {
            const orderRes = await PaymentAPI.createOrder({
                amount: consultationFee,
                holdId: holdId,
                consultantId: sched.consultant,
                clientId: sched.client || user?.id || user?._id,
                paymentMethod: "Razorpay"
            });

            const orderData = orderRes.data || orderRes;

            // Open Razorpay
            const options = {
                key: orderData.key,
                amount: orderData.amount,
                currency: "INR",
                name: "Consultation",
                description: "Appointment Booking",
                order_id: orderData.orderId,
                handler: async function (response: any) {
                    try {
                        // Re-calculate timestamps to satisfy backend validator (Joi requires startAt/endAt)
                        const dateISO = formatDateToISO(sched.date);
                        const slotTime = sched.time || "";
                        const [startHH, startMM] = slotTime.split(" - ")[0].split(":");
                        const endTimeStr = slotTime.split(" - ")[1];
                        let endHH = "00", endMM = "00";

                        if (endTimeStr) {
                            [endHH, endMM] = endTimeStr.split(":");
                        } else {
                            const h = parseInt(startHH);
                            endHH = String(h + 1).padStart(2, '0');
                            endMM = startMM;
                        }

                        const startAt = `${dateISO}T${startHH}:${startMM}:00+05:30`;
                        const endAt = `${dateISO}T${endHH}:${endMM}:00+05:30`;

                        // 4. Confirm Appointment
                        const confirmPayload = {
                            client: sched.client || user?.id || user?._id,
                            consultant: sched.consultant,
                            status: "Upcoming",
                            startAt,
                            endAt,
                            reason: sched.reason,
                            notes: sched.notes,
                            fee: consultationFee,
                            holdId: holdId,
                            payment: {
                                razorpayResponse: response
                            }
                        };

                        const res = await AppointmentAPI.create(confirmPayload);
                        const appt = res.data || res;
                        await runPostPaymentSuccess(appt);
                    } catch (confirmErr: any) {
                        console.error("Confirm failed", confirmErr);
                        toast.error("Payment success but booking failed. Contact support.");
                        setShowConfirmModal(false); // Close on API failure
                    } finally {
                        setIsProcessingPayment(false);
                    }
                },
                modal: {
                    ondismiss: function () {
                        toast.error("Payment cancelled");
                        setIsProcessingPayment(false);
                        setShowConfirmModal(false); // Close on dismiss
                    }
                },
                prefill: {
                    name: user?.name,
                    email: user?.email,
                    contact: user?.mobile
                },
                theme: {
                    color: "#0d6efd"
                },
                // Enforce 4.5 minute (270s) timeout to prevent hanging payments
                // This ensures the session closes before the 5-min server hold expires
                timeout: 270,
                retry: {
                    enabled: false
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", function (response: any) {
                toast.error("Payment Failed");
                setIsProcessingPayment(false);
                setShowConfirmModal(false); // Close on failure
            });
            rzp.open();

        } catch (err: any) {
            console.error("Flow failed", err);
            toast.error(err?.message || "Booking failed");
            setIsProcessingPayment(false);
        }
    };

    const payPalCreateOrder = async (amount: number): Promise<string> => {
        const orderRes = await PaymentAPI.createOrder({
            amount,
            holdId: holdId!,
            consultantId: sched.consultant,
            clientId: sched.client || user?.id || user?._id,
            paymentMethod: "PayPal"
        });
        const data = orderRes.data || orderRes;
        return data.orderId;
    };

    const payPalOnApprove = async (data: { orderID: string; payerID?: string }) => {
        if (!holdId) {
            toast.error("Session expired. Please re-book.");
            return;
        }
        setIsProcessingPayment(true);
        try {
            const dateISO = formatDateToISO(sched.date);
            const slotTime = sched.time || "";
            const [startHH, startMM] = slotTime.split(" - ")[0].split(":");
            const endTimeStr = slotTime.split(" - ")[1];
            let endHH = "00", endMM = "00";
            if (endTimeStr) [endHH, endMM] = endTimeStr.split(":");
            else { const h = parseInt(startHH); endHH = String(h + 1).padStart(2, "0"); endMM = startMM; }
            const startAt = `${dateISO}T${startHH}:${startMM}:00+05:30`;
            const endAt = `${dateISO}T${endHH}:${endMM}:00+05:30`;

            const confirmPayload = {
                client: sched.client || user?.id || user?._id,
                consultant: sched.consultant,
                status: "Upcoming",
                startAt,
                endAt,
                reason: sched.reason,
                notes: sched.notes,
                fee: selectedConsultant?.fees || 0,
                holdId,
                payment: { paypalResponse: { orderID: data.orderID, payerID: data.payerID } }
            };

            const res = await AppointmentAPI.create(confirmPayload);
            const appt = res.data || res;
            await runPostPaymentSuccess(appt);
        } catch (err: any) {
            console.error("PayPal confirm failed", err);
            toast.error(err?.response?.data?.message || "Payment success but booking failed. Contact support.");
            setShowConfirmModal(false);
        } finally {
            setIsProcessingPayment(false);
        }
    };

    return {
        sched,
        setSched,
        showBookingModal,
        setShowBookingModal,
        showConfirmModal,
        setShowConfirmModal,
        isProcessingPayment,
        selectedConsultant,
        setSelectedConsultant,
        selectedCategoryForBooking,
        setSelectedCategoryForBooking,
        handlePreBooking,
        confirmBooking,
        formatDateToISO,
        holdExpiresAt,
        handleExpire,
        payPalCreateOrder,
        payPalOnApprove,
    };
}
