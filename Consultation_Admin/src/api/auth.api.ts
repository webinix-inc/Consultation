import axiosInstance from "./axiosInstance";

const AuthAPI = {
  login: (data: { email: string; password: string; role?: "Admin" | "Employee" }) =>
    axiosInstance.post("/auth/login", data),

  sendOtp: (data: { mobile: string }) =>
    axiosInstance.post("/auth/send-otp", data),

  verifyOtp: (data: { mobile: string; otp: string; role?: "Client" | "Consultant" | "Admin" | "Employee" }) =>
    axiosInstance.post("/auth/verify-otp", data),

  register: (data: {
    registrationToken: string;
    fullName: string;
    email: string;
    role: "Consultant" | "Client";
    category?: string;
    subcategory?: string;
  }) => axiosInstance.post("/auth/register", data),
};

export default AuthAPI;
