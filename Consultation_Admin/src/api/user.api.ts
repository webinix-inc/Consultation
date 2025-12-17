import axiosInstance from "./axiosInstance";

const UserAPI = {
  getAllUsers: async (params?: any) => await axiosInstance.get("/users", { params }).then(response => response.data),
  //   getUserById: (id: string) => axiosInstance.get(`/users/${id}`),
  createUser: async (data: any) => await axiosInstance.post("/users", data),
  updateUser: async (id: string, data: any) => await axiosInstance.patch(`/users/${id}`, data),
  deleteUser: async (id: string) => await axiosInstance.delete(`/users/${id}`),
};

export default UserAPI;