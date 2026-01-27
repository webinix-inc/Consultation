/**
 * NotificationService - Helper for creating properly-targeted notifications
 * 
 * Usage:
 *   await NotificationService.notifyUser(userId, { ... })
 *   await NotificationService.notifyRole("Consultant", { ... })
 *   await NotificationService.notifyGlobal({ ... })
 *   await NotificationService.notifyAppointmentBooked(appointment)
 */

const Notification = require("../models/notification.model");
const User = require("../models/user.model");
const SocketService = require("./socket.service");

class NotificationService {
    /**
     * Send notification to a specific user
     */
    static async notifyUser(userId, options) {
        const {
            name,
            message,
            type = "other",
            category = "general",
            priority = "normal",
            actionUrl = "",
            actionLabel = "",
            relatedId = null,
            relatedType = null,
            sender = null,
            senderRole = "System",
            avatar = "",
            metadata = {},
            expiresAt = null,
        } = options;

        try {
            const notification = await Notification.create({
                recipient: userId,
                recipientRole: null,
                isGlobal: false,
                name,
                message,
                type,
                category,
                priority,
                actionUrl,
                actionLabel,
                relatedId,
                relatedType,
                sender,
                senderRole,
                avatar,
                metadata,
                expiresAt,
            });

            // Emit real-time event
            SocketService.emitToUser(userId, "notification:new", notification);

            return notification;
        } catch (error) {
            console.error("[NotificationService] notifyUser Error:", error);
            return null;
        }
    }

    /**
     * Send notification to all users of a specific role
     */
    static async notifyRole(role, options) {
        const {
            name,
            message,
            type = "system",
            category = "system",
            priority = "normal",
            actionUrl = "",
            actionLabel = "",
            sender = null,
            senderRole = "System",
            avatar = "",
            metadata = {},
            expiresAt = null,
        } = options;

        const notification = await Notification.create({
            recipient: null,
            recipientRole: role,
            isGlobal: false,
            name,
            message,
            type,
            category,
            priority,
            actionUrl,
            actionLabel,
            sender,
            senderRole,
            avatar,
            metadata,
            expiresAt,
        });

        // Emit real-time event
        SocketService.emitToRole(role, "notification:new", notification);

        return notification;
    }

    /**
     * Send global notification to all users (Admin broadcast)
     */
    static async notifyGlobal(options) {
        const {
            name,
            message,
            type = "system",
            category = "system",
            priority = "normal",
            actionUrl = "",
            actionLabel = "",
            sender = null,
            senderRole = "Admin",
            avatar = "",
            metadata = {},
            expiresAt = null,
        } = options;

        const notification = await Notification.create({
            recipient: null,
            recipientRole: null,
            isGlobal: true,
            name,
            message,
            type,
            category,
            priority,
            actionUrl,
            actionLabel,
            sender,
            senderRole,
            avatar,
            metadata,
            expiresAt,
        });

        // Emit real-time event
        SocketService.emitGlobal("notification:new", notification);

        return notification;
    }

    // ================================
    // APPOINTMENT NOTIFICATIONS
    // ================================

    static getTime(appointment) {
        if (appointment.timeStart) return appointment.timeStart;
        if (appointment.startAt) {
            return new Date(appointment.startAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true
            });
        }
        return "";
    }

    static getDate(appointment) {
        if (appointment.date) return appointment.date;
        if (appointment.startAt) {
            return new Date(appointment.startAt).toLocaleDateString("en-US", {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        return "";
    }

    /**
     * Notify both client and consultant when appointment is booked
     */
    static async notifyAppointmentBooked(appointment, clientName, consultantName) {
        const promises = [];
        const timeStr = this.getTime(appointment);
        const dateStr = this.getDate(appointment);

        // Notify Client
        if (appointment.client) {
            const clientId = appointment.client._id || appointment.client;
            promises.push(
                this.notifyUser(clientId, {
                    name: "Appointment Confirmed",
                    message: `Your appointment with ${consultantName} on ${dateStr} at ${timeStr} has been confirmed.`,
                    type: "appointment",
                    category: "appointments",
                    priority: "high",
                    actionUrl: `/my-bookings`,
                    actionLabel: "View Booking",
                    relatedId: appointment._id,
                    relatedType: "appointment",
                    senderRole: "System",
                })
            );
        }

        // Notify Consultant
        if (appointment.consultant) {
            const consultantId = appointment.consultant._id || appointment.consultant;
            promises.push(
                this.notifyUser(consultantId, {
                    name: "New Appointment",
                    message: `${clientName} has booked an appointment for ${dateStr} at ${timeStr}.`,
                    type: "appointment",
                    category: "appointments",
                    priority: "high",
                    actionUrl: `/appointments`,
                    actionLabel: "View Appointment",
                    relatedId: appointment._id,
                    relatedType: "appointment",
                    senderRole: "System",
                })
            );
        }

        return Promise.all(promises);
    }

    /**
     * Notify both parties when appointment is cancelled
     */
    static async notifyAppointmentCancelled(appointment, cancelledBy, clientName, consultantName) {
        const promises = [];
        const cancellerName = cancelledBy === "client" ? clientName : consultantName;
        const timeStr = this.getTime(appointment);
        const dateStr = this.getDate(appointment);

        // Notify Client (if consultant cancelled)
        if (appointment.client && cancelledBy !== "client") {
            const clientId = appointment.client._id || appointment.client;
            promises.push(
                this.notifyUser(clientId, {
                    name: "Appointment Cancelled",
                    message: `Your appointment with ${consultantName} on ${dateStr} has been cancelled.`,
                    type: "appointment",
                    category: "appointments",
                    priority: "high",
                    actionUrl: `/my-bookings`,
                    actionLabel: "Book Again",
                    relatedId: appointment._id,
                    relatedType: "appointment",
                    senderRole: "System",
                })
            );
        }

        // Notify Consultant (if client cancelled)
        if (appointment.consultant && cancelledBy !== "consultant") {
            const consultantId = appointment.consultant._id || appointment.consultant;
            promises.push(
                this.notifyUser(consultantId, {
                    name: "Appointment Cancelled",
                    message: `${clientName} has cancelled their appointment on ${dateStr} at ${timeStr}.`,
                    type: "appointment",
                    category: "appointments",
                    priority: "normal",
                    actionUrl: `/appointments`,
                    actionLabel: "View Details",
                    relatedId: appointment._id,
                    relatedType: "appointment",
                    senderRole: "System",
                })
            );
        }

        return Promise.all(promises);
    }

    /**
     * Notify for appointment reminder (can be called by scheduler)
     */
    static async notifyAppointmentReminder(appointment, clientName, consultantName) {
        const promises = [];
        const timeStr = this.getTime(appointment);

        // Notify Client
        if (appointment.client) {
            const clientId = appointment.client._id || appointment.client;
            promises.push(
                this.notifyUser(clientId, {
                    name: "Appointment Reminder",
                    message: `Reminder: Your appointment with ${consultantName} is in 15 minutes at ${timeStr}.`,
                    type: "reminder",
                    category: "reminders",
                    priority: "urgent",
                    actionUrl: `/my-bookings`,
                    actionLabel: "Join Now",
                    relatedId: appointment._id,
                    relatedType: "appointment",
                    senderRole: "System",
                })
            );
        }

        // Notify Consultant
        if (appointment.consultant) {
            const consultantId = appointment.consultant._id || appointment.consultant;
            promises.push(
                this.notifyUser(consultantId, {
                    name: "Appointment Reminder",
                    message: `Reminder: Appointment with ${clientName} in 15 minutes at ${timeStr}.`,
                    type: "reminder",
                    category: "reminders",
                    priority: "urgent",
                    actionUrl: `/appointments`,
                    actionLabel: "Prepare",
                    relatedId: appointment._id,
                    relatedType: "appointment",
                    senderRole: "System",
                })
            );
        }

        return Promise.all(promises);
    }

    /**
     * Notify when appointment status changes
     */
    static async notifyAppointmentStatusChange(appointment, newStatus, clientName, consultantName) {
        const promises = [];
        const dateStr = this.getDate(appointment);

        // Notify Client
        if (appointment.client) {
            const clientId = appointment.client._id || appointment.client;
            promises.push(
                this.notifyUser(clientId, {
                    name: `Appointment ${newStatus}`,
                    message: `Your appointment with ${consultantName} on ${dateStr} is now ${newStatus.toLowerCase()}.`,
                    type: "appointment",
                    category: "appointments",
                    priority: newStatus === "Completed" ? "low" : "normal",
                    actionUrl: `/my-bookings`,
                    actionLabel: "View Details",
                    relatedId: appointment._id,
                    relatedType: "appointment",
                    senderRole: "System",
                })
            );
        }

        return Promise.all(promises);
    }

    // ================================
    // PAYMENT NOTIFICATIONS
    // ================================

    /**
     * Notify Admin when payment is received (Agency Model)
     */
    static async notifyAdminPaymentReceived(transaction, clientName, consultantName) {
        return this.notifyRole("Admin", {
            name: "Payment Received",
            message: `Payment of ₹${transaction.amount} received from ${clientName} for appointment with ${consultantName}.`,
            type: "payment",
            category: "payments", // Fixed from 'finance'
            priority: "high",
            actionUrl: `/admin/revenue`,
            actionLabel: "View Revenue",
            relatedId: transaction._id,
            relatedType: "payment", // Fixed from 'transaction' (model only supports 'payment')
            senderRole: "System",
        });
    }

    /**
     * Notify client on successful payment
     */
    static async notifyPaymentSuccess(transaction, clientName) {
        if (!transaction.user) return;

        return this.notifyUser(transaction.user, {
            name: "Payment Successful",
            message: `Your payment of ₹${transaction.amount} was successful.`,
            type: "payment",
            category: "payments",
            priority: "normal",
            actionUrl: transaction.invoiceUrl ? `${transaction.invoiceUrl}&view=inline` : `/dashboard`,
            actionLabel: "View Receipt",
            relatedId: transaction._id,
            relatedType: "payment",
            senderRole: "System",
        });
    }

    /**
     * Notify consultant when they receive payment
     */
    static async notifyPaymentReceived(transaction, clientName, consultantId) {
        if (!consultantId) return;

        return this.notifyUser(consultantId, {
            name: "Payment Received",
            message: `You received ₹${transaction.netAmount || transaction.amount} from ${clientName}.`,
            type: "payment",
            category: "payments",
            priority: "normal",
            actionUrl: `/dashboard`,
            actionLabel: "View Details",
            relatedId: transaction._id,
            relatedType: "payment",
            senderRole: "System",
        });
    }

    /**
     * Notify Consultant when a payout is processed
     */
    static async notifyPayoutProcessed(consultantId, amount, currency, notes) {
        return this.notifyUser(consultantId, {
            name: "Payout Processed",
            message: `A payout of ${currency} ${amount} has been processed for your account.${notes ? ` Notes: ${notes}` : ""}`,
            type: "payment",
            category: "payments",
            priority: "high",
            actionUrl: `/dashboard?tab=payments`,
            actionLabel: "View Wallet",
            relatedId: null,
            relatedType: "payment",
            senderRole: "System"
        });
    }

    // ================================
    // USER NOTIFICATIONS
    // ================================

    /**
     * Notify consultant when new client is linked
     */
    static async notifyNewClientLinked(consultantId, clientName) {
        return this.notifyUser(consultantId, {
            name: "New Client",
            message: `${clientName} is now connected with you.`,
            type: "system",
            category: "system",
            priority: "normal",
            actionUrl: `/clients`,
            actionLabel: "View Client",
            senderRole: "System",
        });
    }

    /**
     * Notify client when linked to consultant
     */
    static async notifyLinkedToConsultant(clientId, consultantName) {
        return this.notifyUser(clientId, {
            name: "Connected",
            message: `You are now connected with ${consultantName}.`,
            type: "system",
            category: "system",
            priority: "normal",
            actionUrl: `/consultants`,
            actionLabel: "View Profile",
            senderRole: "System",
        });
    }

    /**
     * Welcome notification for new users
     */
    static async notifyWelcome(userId, userName, role) {
        return this.notifyUser(userId, {
            name: "Welcome!",
            message: `Welcome to the platform, ${userName}! Start exploring.`,
            type: "system",
            category: "system",
            priority: "normal",
            actionUrl: role === "Client" ? "/consultants" : "/dashboard",
            actionLabel: "Get Started",
            senderRole: "System",
        });
    }
}

module.exports = NotificationService;
