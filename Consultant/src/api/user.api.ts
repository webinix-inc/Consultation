import axiosInstance from "./axiosInstance";

const UserAPI = {
  getAllUsers: async () => await axiosInstance.get("/users").then(response => response.data),
  getActiveConsultants: async () => await axiosInstance.get("/users/consultants/active").then(response => response.data),
  //   getUserById: (id: string) => axiosInstance.get(`/users/${id}`),

  updateUser: async (id: string, data: any) => await axiosInstance.patch(`/users/${id}`, data),
  getProfile: async () => await axiosInstance.get("/users/profile").then(response => response.data.data),
};

export default UserAPI;