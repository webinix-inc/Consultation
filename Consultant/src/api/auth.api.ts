import axiosInstance from "./axiosInstance";

const AuthAPI = {


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
  }) => axiosInstance.post("/auth/register", data),

  signup: (data: {
    fullName: string;
    email: string;
    mobile: string;

    role: "Client";
  }) => axiosInstance.post("/auth/signup", data),

};

export default AuthAPI;
