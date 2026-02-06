import axiosInstance from "./axiosInstance";

const AnalyticsAPI = {
  overview: async (params?: { month?: number; year?: number; viewType?: "monthly" | "yearly" }) => {
    const res = await axiosInstance.get("/analytics/overview", { params });
    return res.data;
  },
  overviewExport: async (params?: { month?: number; year?: number; viewType?: "monthly" | "yearly" }) => {
    const res = await axiosInstance.get("/analytics/overview", {
      params: { ...params, format: "csv" },
      responseType: "blob",
    });
    return res;
  },
};

export default AnalyticsAPI;









