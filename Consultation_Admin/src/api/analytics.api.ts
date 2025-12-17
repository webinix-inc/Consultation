import axiosInstance from "./axiosInstance";

const AnalyticsAPI = {
  overview: async () => {
    const res = await axiosInstance.get("/analytics/overview");
    return res.data;
  },
};

export default AnalyticsAPI;









