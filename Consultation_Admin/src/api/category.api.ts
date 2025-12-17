import axiosInstance from "./axiosInstance";

const CategoryAPI = {
  getAll: async () => {
    const res = await axiosInstance.get("/categories");
    return res.data;
  },
  create: async (data: any) => {
    const res = await axiosInstance.post("/categories", data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await axiosInstance.patch(`/categories/${id}`, data);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await axiosInstance.delete(`/categories/${id}`);
    return res.data;
  },
};

export default CategoryAPI;


