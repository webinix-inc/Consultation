import axios from "axios";

// Create instance
const axiosInstance = axios.create({
  // baseURL: "https://consultation-kywq.onrender.com/api/v1",     // ✅ Netlify proxy
  baseURL: "http://localhost:5002/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔐 Add Authorization header dynamically from localStorage
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// (Optional) 🧯 Handle global errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // If token is expired or unauthorized
    if (error.response?.status === 401) {
      console.warn("🚫 Unauthorized! Logging out...");
      // Temporarily disable redirect for testing
      // localStorage.clear();
      // window.location.href = "/"; // Redirect to login page
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
