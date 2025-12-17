import axiosInstance from "./axiosInstance";

const ConsultantAPI = {
  getAll: async (params?: Record<string, any>) => {
    const res = await axiosInstance.get("/consultants", { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await axiosInstance.get(`/consultants/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await axiosInstance.post("/consultants", data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await axiosInstance.patch(`/consultants/${id}`, data);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await axiosInstance.delete(`/consultants/${id}`);
    return res.data;
  },

  // Settings
  getSettings: async (consultantId: string) => {
    const res = await axiosInstance.get(`/consultant-settings/${consultantId}`);
    return res.data;
  },
  updateSettings: async (consultantId: string, data: any) => {
    const res = await axiosInstance.put(`/consultant-settings/${consultantId}`, data);
    return res.data;
  },
  updateNotifications: async (consultantId: string, data: any) => {
    const res = await axiosInstance.put(`/consultant-settings/${consultantId}/notifications`, data);
    return res.data;
  },
  updateAvailability: async (consultantId: string, data: any) => {
    const res = await axiosInstance.put(`/consultant-settings/${consultantId}/availability`, data);
    return res.data;
  }
};

export default ConsultantAPI;