import axiosInstance from "./axiosInstance";

const TransactionAPI = {
    getTransactions: async (params?: { consultant?: string; page?: number; limit?: number; type?: string }) => {
        const res = await axiosInstance.get("/transactions", { params });
        return res.data;
    },

    createPayout: async (data: { consultantId: string; amount: number; notes?: string; referenceId?: string }) => {
        const res = await axiosInstance.post("/transactions/payout", data);
        return res.data;
    },
};

export default TransactionAPI;
