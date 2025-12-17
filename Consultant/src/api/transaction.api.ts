import axiosInstance from "./axiosInstance";

const TransactionAPI = {
    getAll: async (params?: any) => {
        const res = await axiosInstance.get("/transactions", { params });
        return res.data;
    },
};

export default TransactionAPI;
