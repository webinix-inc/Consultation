import axiosInstance from "./axiosInstance";

const DashboardAPI = {
    getConsultantStats: async (params?: { viewType?: "monthly" | "yearly"; month?: number; year?: number }) => {
        const res = await axiosInstance.get("/analytics/consultant", { params });
        return res.data.data;
    },
    getClientStats: async (params?: { viewType?: "monthly" | "yearly"; month?: number; year?: number }) => {
        const res = await axiosInstance.get("/analytics/client", { params });
        return res.data.data;
    },
    getClientStatsById: async (id: string) => {
        const res = await axiosInstance.get(`/analytics/client/${id}`);
        return res.data.data;
    },
};

export default DashboardAPI;
