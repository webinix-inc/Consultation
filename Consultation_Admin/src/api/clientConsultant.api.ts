import axiosInstance from "./axiosInstance";

const ClientConsultantAPI = {
  // Link a client to a consultant
  link: async (data: { clientId: string; consultantId: string; notes?: string }) => {
    const res = await axiosInstance.post("/client-consultants/link", data);
    return res.data;
  },

  // Unlink a client from a consultant
  unlink: async (relationshipId: string) => {
    const res = await axiosInstance.delete(`/client-consultants/${relationshipId}`);
    return res.data;
  },

  // Batch: get client counts for multiple consultants
  getBatchClientCounts: async (consultantIds: string[]) => {
    const res = await axiosInstance.post("/client-consultants/batch-client-counts", { consultantIds });
    return res.data;
  },

  // Get all clients for a consultant
  getConsultantClients: async (consultantId: string) => {
    const res = await axiosInstance.get(`/client-consultants/consultant/${consultantId}/clients`);
    return res.data;
  },

  // Get all consultants for a client
  getClientConsultants: async (clientId: string, live?: boolean) => {
    const params = live ? { live: "true" } : {};
    const res = await axiosInstance.get(`/client-consultants/client/${clientId}/consultants`, { params });
    return res.data;
  },

  // Get all relationships
  getAll: async (params?: { clientId?: string; consultantId?: string; status?: string }) => {
    const res = await axiosInstance.get("/client-consultants", { params });
    return res.data;
  },

  // Update relationship status
  updateStatus: async (relationshipId: string, status: "Active" | "Inactive") => {
    const res = await axiosInstance.patch(`/client-consultants/${relationshipId}/status`, { status });
    return res.data;
  },
};

export default ClientConsultantAPI;

