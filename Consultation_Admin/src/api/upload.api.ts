import axiosInstance from "./axiosInstance";

interface UploadResponse {
    message: string;
    data: {
        url: string;
        key: string;
        fileName: string;
        size: number;
        mimeType: string;
    };
}

const UploadAPI = {
    uploadImage: async (file: File): Promise<UploadResponse> => {
        const formData = new FormData();
        formData.append("image", file);

        const response = await axiosInstance.post("/upload/image", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },

    uploadDocument: async (file: File): Promise<UploadResponse> => {
        const formData = new FormData();
        formData.append("document", file);

        const response = await axiosInstance.post("/upload/document", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },
};

export default UploadAPI;
