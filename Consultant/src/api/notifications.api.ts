import axiosInstance from "./axiosInstance";

interface SendToClientPayload {
  name: string;
  message: string;
  recipient: string; // Client ID
  type?: "system" | "appointment" | "registration" | "payment" | "other";
  avatar?: string;
}

const NotificationsAPI = {
  getAll: async () => {
    const res = await axiosInstance.get("/notifications");
    return res.data;
  },
  sendToClient: async (payload: SendToClientPayload) => {
    const res = await axiosInstance.post("/notifications/consultant/send", payload);
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




