import axiosInstance from "./axiosInstance";

const ConsultantSettingsAPI = {
  getSettings: async (consultantId: string) => {
    const res = await axiosInstance.get(`/consultant-settings/${consultantId}`);
    return res.data;
  },

  createSettings: async (data: any) => {
    const res = await axiosInstance.post("/consultant-settings", data);
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
  },
};

export default ConsultantSettingsAPI;

