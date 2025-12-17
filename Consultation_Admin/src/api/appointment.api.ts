import axiosInstance from "./axiosInstance";

const AppointmentAPI = {
  getAll: async (params?: Record<string, any>) => {
    const res = await axiosInstance.get("/appointments", { params });
    return res.data;
  },
  create: async (data: any) => {
    const res = await axiosInstance.post("/appointments", data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await axiosInstance.patch(`/appointments/${id}`, data);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await axiosInstance.delete(`/appointments/${id}`);
    return res.data;
  },
};

export default AppointmentAPI;


