import axiosInstance from "./axiosInstance";

const SubcategoryAPI = {
  getAll: async (categoryId?: string) => {
    const params = categoryId ? { categoryId } : {};
    const res = await axiosInstance.get("/subcategories", { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await axiosInstance.get(`/subcategories/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await axiosInstance.post("/subcategories", data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await axiosInstance.patch(`/subcategories/${id}`, data);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await axiosInstance.delete(`/subcategories/${id}`);
    return res.data;
  },
};

export default SubcategoryAPI;

