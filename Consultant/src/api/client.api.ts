import axiosInstance from "./axiosInstance";

const ClientAPI = {
    getProfile: async () => await axiosInstance.get("/clients/profile").then(response => response.data.data),
    getProfileById: async (id: string) => await axiosInstance.get(`/clients/${id}`).then(response => response.data.data),
    updateProfile: async (data: any) => await axiosInstance.patch("/clients/profile", data).then(response => response.data.data),
};

export default ClientAPI;
