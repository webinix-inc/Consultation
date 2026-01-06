import axiosInstance from "./axiosInstance";

const AnalyticsAPI = {
  overview: async (params?: { month?: number; year?: number; viewType?: "monthly" | "yearly" }) => {
    const res = await axiosInstance.get("/analytics/overview", { params });
    return res.data;
  },
};

export default AnalyticsAPI;









