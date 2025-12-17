import axiosInstance from "./axiosInstance";

const PaymentAPI = {
  createOrder: async (data: {
    amount: number;
    appointmentId?: string;
    consultantId?: string;
    clientId?: string;
  }) => {
    const res = await axiosInstance.post("/payments/create-order", data);
    return res.data;
  },

  verifyPayment: async (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    transactionId?: string;
    appointmentId?: string;
  }) => {
    const res = await axiosInstance.post("/payments/verify", data);
    return res.data;
  },

  getPaymentStatus: async (transactionId?: string, orderId?: string) => {
    const params: any = {};
    if (transactionId) params.transactionId = transactionId;
    if (orderId) params.orderId = orderId;
    const res = await axiosInstance.get("/payments/status", { params });
    return res.data;
  },
};

export default PaymentAPI;

