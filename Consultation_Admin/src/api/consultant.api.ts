import axiosInstance from "./axiosInstance";

const ConsultantAPI = {
  getAllConsultants: async (params?: Record<string, any>) => {
    const res = await axiosInstance.get("/consultants", { params });
    return res.data;
  },
  getAllUsers: async (params?: Record<string, any>) => {
    const res = await axiosInstance.get("/users", { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await axiosInstance.get(`/consultants/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await axiosInstance.post("/consultants", data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await axiosInstance.patch(`/consultants/${id}`, data);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await axiosInstance.delete(`/consultants/${id}`);
    return res.data;
  },
  approve: async (id: string) => {
    const res = await axiosInstance.post(`/consultants/${id}/approve`);
    return res.data;
  },
  reject: async (id: string) => {
    const res = await axiosInstance.post(`/consultants/${id}/reject`);
    return res.data;
  },
};

export default ConsultantAPI;


