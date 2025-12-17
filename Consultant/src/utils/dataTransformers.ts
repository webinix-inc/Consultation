/**
 * Data Transformation Utilities
 * Functions to transform API data to UI-friendly formats
 */

/**
 * Payment Item type for UI display
 */
export type PaymentItem = {
  id: string;
  initials: string;
  doctor: string;
  dept: string;
  status: string;
  title: string;
  date: string;
  method: string;
  txn: string;
  invoice: string;
  price: number;
  session: string;
};

/**
 * Transforms a transaction object from API to PaymentItem format for UI
 * 
 * @param transaction - Transaction object from API
 * @returns PaymentItem object for UI display
 */
export function transformTransactionToPaymentItem(transaction: any): PaymentItem {
  return {
    id: transaction._id || transaction.id,
    initials: new Date(transaction.createdAt).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    }),
    doctor: transaction.consultantSnapshot?.name || "Unknown",
    dept: transaction.consultantSnapshot?.category || "General",
    status: transaction.status || "Pending",
    title: `${transaction.consultantSnapshot?.subcategory || "General"} • ${transaction.appointment?.reason || "Consultation"}`,
    date: new Date(transaction.createdAt).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    }),
    method: transaction.paymentMethod || "System",
    txn: transaction.transactionId || "N/A",
    invoice: transaction.metadata?.invoiceId || "N/A",
    price: transaction.amount || 0,
    session: transaction.appointment?.session || "Video Call",
  };
}

/**
 * Appointment type for UI display
 */
export type Appointment = {
  id: string;
  client: string;
  consultant: string;
  category: string;
  session: string;
  date: string;
  time: string;
  status: "Upcoming" | "Confirmed" | "Completed" | "Cancelled";
  reason?: string;
  notes?: string;
  fee?: string;
  rawDate?: string;
  rawTimeStart?: string;
  rawTimeEnd?: string;
  meetingLink?: string;
};

/**
 * Transforms an appointment object from API to UI format
 * 
 * @param appointment - Appointment object from API
 * @param formatToDisplay - Function to format dates for display
 * @param normalizeTimeString - Function to normalize time strings
 * @returns Appointment object for UI display
 */
export function transformAppointmentToUI(
  appointment: any,
  formatToDisplay: (d: Date) => string,
  normalizeTimeString: (t: string) => string
): Appointment {
  const start = appointment.startAt 
    ? new Date(appointment.startAt) 
    : appointment.date && appointment.timeStart 
      ? new Date(`${appointment.date}T${normalizeTimeString(appointment.timeStart)}:00`) 
      : null;
  
  const end = appointment.endAt 
    ? new Date(appointment.endAt) 
    : appointment.date && appointment.timeEnd 
      ? new Date(`${appointment.date}T${normalizeTimeString(appointment.timeEnd)}:00`) 
      : null;

  const dateStr = start 
    ? start.toLocaleDateString() 
    : appointment.date 
      ? new Date(appointment.date).toLocaleDateString() 
      : "";
  
  const timeStr = start && end 
    ? `${formatToDisplay(start)} to ${formatToDisplay(end)}` 
    : appointment.timeStart 
      ? appointment.timeStart 
      : "";

  return {
    id: appointment._id || appointment.id,
    client: appointment.clientName || 
      (typeof appointment.client === "string" 
        ? appointment.client 
        : appointment.client?.fullName || appointment.client?.name) || 
      "Client",
    consultant: appointment.consultantName || 
      (typeof appointment.consultant === "string" 
        ? appointment.consultant 
        : appointment.consultant?.fullName || appointment.consultant?.name) || 
      "NA",
    category: appointment.category || "N/A",
    session: appointment.session || "Video Call",
    date: dateStr,
    time: timeStr,
    status: (appointment.status as Appointment["status"]) || "Upcoming",
    reason: appointment.reason,
    notes: appointment.notes,
    fee: appointment.fee !== undefined && appointment.fee !== null 
      ? `₹${Number(appointment.fee).toLocaleString("en-IN")}` 
      : undefined,
    rawDate: appointment.date,
    rawTimeStart: appointment.timeStart,
    rawTimeEnd: appointment.timeEnd,
    meetingLink: appointment.meetingLink,
  };
}

