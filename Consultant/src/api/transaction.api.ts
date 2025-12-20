import axiosInstance from "./axiosInstance";

const TransactionAPI = {
    getTransactions: async (params?: { page?: number; limit?: number; type?: string }) => {
        const res = await axiosInstance.get("/transactions", { params });
        return res.data;
    },
};

export default TransactionAPI;
