import axiosInstance from "./axiosInstance";

const ClientAPI = {
    getAllClients: async () => await axiosInstance.get("/clients").then(response => response.data),
    getProfile: async (id: string) => await axiosInstance.get(`/clients/${id}`).then(response => response.data),
    updateClient: async (id: string, data: any) => await axiosInstance.patch(`/clients/${id}`, data).then(response => response.data),
};

export default ClientAPI;
