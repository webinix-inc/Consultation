import axiosInstance from "./axiosInstance";

// Types
export interface NotificationItem {
  _id: string;
  name: string;
  message: string;
  avatar?: string;
  read: boolean;
  readAt?: string;
  recipient?: string;
  recipientRole?: string;
  type: "system" | "appointment" | "registration" | "payment" | "message" | "reminder" | "alert" | "other";
  category: "general" | "appointments" | "payments" | "messages" | "system" | "reminders";
  priority: "low" | "normal" | "high" | "urgent";
  actionUrl?: string;
  actionLabel?: string;
  relatedId?: string;
  relatedType?: string;
  metadata?: Record<string, any>;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  data: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

export interface SendToClientPayload {
  name: string;
  message: string;
  recipient: string;
  type?: NotificationItem["type"];
  category?: NotificationItem["category"];
  priority?: NotificationItem["priority"];
  actionUrl?: string;
  actionLabel?: string;
  avatar?: string;
}

export interface ListParams {
  page?: number;
  limit?: number;
  category?: string;
  type?: string;
  priority?: string;
  read?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

const NotificationsAPI = {
  // Get notifications with pagination and filtering
  getAll: async (params?: ListParams): Promise<NotificationListResponse> => {
    const res = await axiosInstance.get("/notifications", { params });
    return res.data.data;
  },

  // Get unread count only (for badge)
  getUnreadCount: async (): Promise<{ count: number }> => {
    const res = await axiosInstance.get("/notifications/unread-count");
    return res.data.data;
  },

  // Get notifications grouped by category
  getGrouped: async () => {
    const res = await axiosInstance.get("/notifications/grouped");
    return res.data.data;
  },

  // Mark single notification as read
  markRead: async (id: string) => {
    const res = await axiosInstance.patch(`/notifications/${id}/read`);
    return res.data;
  },

  // Mark all notifications as read
  markAllRead: async () => {
    const res = await axiosInstance.post("/notifications/mark-all-read");
    return res.data;
  },

  // Delete single notification
  delete: async (id: string) => {
    const res = await axiosInstance.delete(`/notifications/${id}`);
    return res.data;
  },

  // Delete all notifications
  deleteAll: async () => {
    const res = await axiosInstance.delete("/notifications/all");
    return res.data;
  },

  // Send notification to client (Consultant only)
  sendToClient: async (payload: SendToClientPayload) => {
    const res = await axiosInstance.post("/notifications/consultant/send", payload);
    return res.data;
  },
};

export default NotificationsAPI;
