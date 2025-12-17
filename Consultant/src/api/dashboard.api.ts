import axiosInstance from "./axiosInstance";

const DashboardAPI = {
    getConsultantStats: async () => {
        const res = await axiosInstance.get("/analytics/consultant");
        return res.data.data;
    },
    getClientStats: async () => {
        const res = await axiosInstance.get("/analytics/client");
        return res.data.data;
    },
    getClientStatsById: async (id: string) => {
        const res = await axiosInstance.get(`/analytics/client/${id}`);
        return res.data.data;
    },
};

export default DashboardAPI;
