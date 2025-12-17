import axiosInstance from "./axiosInstance";

const SubcategoryAPI = {
  getAll: async (categoryId?: string) => {
    const params = categoryId ? { categoryId } : {};
    const res = await axiosInstance.get("/subcategories", { params });
    return res.data;
  },

};

export default SubcategoryAPI;

