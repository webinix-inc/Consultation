import axiosInstance from "./axiosInstance";

const CategoryAPI = {
  getAll: async () => {
    const res = await axiosInstance.get("/categories");
    return res.data;
  },

};

export default CategoryAPI;


