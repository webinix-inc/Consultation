import axiosInstance from "./axiosInstance";

const ClientAPI = {
    getProfile: async () => await axiosInstance.get("/clients/profile").then(response => response.data.data),
    getProfileById: async (id: string) => await axiosInstance.get(`/clients/${id}`).then(response => response.data.data),
    updateProfile: async (data: any) => await axiosInstance.patch("/clients/profile", data).then(response => response.data.data),
    /** GDPR: Export my data (Right to Access) */
    exportMyData: async () => {
        const res = await axiosInstance.get("/clients/profile/export", { responseType: "json" });
        return res.data;
    },
    /** GDPR: Delete my account (Right to Erasure) - requires password */
    deleteMyAccount: async (password: string) =>
        await axiosInstance.delete("/clients/profile", { data: { password } }).then((r) => r.data),
    /** GDPR: Update consent preferences */
    updateConsent: async (data: { marketingConsent?: boolean; dataProcessingConsent?: boolean }) =>
        await axiosInstance.patch("/clients/profile/consent", data).then((r) => r.data),
};

export default ClientAPI;
