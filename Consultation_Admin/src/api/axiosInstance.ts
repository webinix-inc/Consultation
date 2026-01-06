import axios from "axios";

// Create instance (CHANGED)
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

// 🧯 Handle global errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("🚫 Unauthorized! Logging out...");
      // localStorage.clear();
      // window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
