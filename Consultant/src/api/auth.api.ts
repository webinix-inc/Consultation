import axiosInstance from "./axiosInstance";

const AuthAPI = {


  login: (data: any) => axiosInstance.post("/auth/login", data),

  forgotPassword: (data: { email: string; role?: 'Client' | 'Consultant' }) => axiosInstance.post("/auth/forgot-password", data),

  resetPassword: (token: string, data: { password: string }) => axiosInstance.put(`/auth/reset-password/${token}`, data),

  sendOtp: (data: { mobile: string }) =>
    axiosInstance.post("/auth/send-otp", data),

  verifyOtp: (data: { mobile: string; otp: string; role?: "Client" | "Consultant" }) =>
    axiosInstance.post("/auth/verify-otp", data),

  register: (data: {
    registrationToken: string;
    fullName: string;
    email: string;
    role: "Consultant" | "Client";
    category?: string;
    subcategory?: string;
    categories?: Array<{ categoryId?: string; categoryName?: string; subcategoryId?: string; subcategoryName?: string }>;
    password?: string;
    fees?: number;
  }) => axiosInstance.post("/auth/register", data),

  signup: (data: any) => axiosInstance.post("/auth/signup", data),

};

export default AuthAPI;
