import axiosInstance from "./axiosInstance";

interface CreateNotificationPayload {
  name: string;
  message: string;
  recipientRole?: "Admin" | "Consultant" | "Client";
  recipient?: string; // User ID for specific user
  type?: "system" | "appointment" | "registration" | "payment" | "other";
  avatar?: string;
}

const NotificationsAPI = {
  getAll: async () => {
    const res = await axiosInstance.get("/notifications");
    return res.data;
  },
  create: async (payload: CreateNotificationPayload) => {
    const res = await axiosInstance.post("/notifications", payload);
    return res.data;
  },
  markAllRead: async () => {
    const res = await axiosInstance.post("/notifications/mark-all-read");
    return res.data;
  },
  deleteAll: async () => {
    const res = await axiosInstance.delete("/notifications");
    return res.data;
  },
};

export default NotificationsAPI;









