import axiosInstance from "./axiosInstance";

const DocumentAPI = {
    getAll: async (params?: any) => {
        const response = await axiosInstance.get("/documents", { params });
        return response.data.data;
    },
    getOne: async (id: string) => {
        const response = await axiosInstance.get(`/documents/${id}`);
        return response.data.data;
    },
    create: async (data: any) => {
        const response = await axiosInstance.post("/documents", data);
        return response.data.data;
    },
    update: async (id: string, data: any) => {
        const response = await axiosInstance.patch(`/documents/${id}`, data);
        return response.data.data;
    },
    delete: async (id: string) => {
        const response = await axiosInstance.delete(`/documents/${id}`);
        return response.data.data;
    },
    getTypes: async () => {
        const response = await axiosInstance.get("/documents/types");
        return response.data.data;
    },
};

export default DocumentAPI;
