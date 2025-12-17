// frontend/src/api/clientConsultant.api.ts
import axiosInstance from "./axiosInstance";

export interface ClientUser {
  _id: string;
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  mobile?: string;
  status?: string;
  category?: any;
  subcategory?: any;
  [k: string]: any;
}

export interface ConsultantDto {
  _id: string;
  id?: string;
  name?: string;
  displayName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  status?: string;
  category?: any;
  subcategory?: any;
  [k: string]: any;
}

export interface ClientConsultantRelationship {
  _id: string;
  client: ClientUser | string | null;
  consultant: ConsultantDto | string | null;
  status: "Active" | "Inactive";
  linkedAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  [k: string]: any;
}

export interface GetAllParams {
  page?: number;
  limit?: number;
  clientId?: string;
  consultantId?: string;
  status?: string;
  q?: string;
  [k: string]: any;
}

function normalizeAxiosError(e: any) {
  if (!e) return { message: "Unknown error" };
  const data = e?.response?.data ?? e?.data ?? null;
  if (data && typeof data === "object") {
    return { message: data.message || data.error || "Request failed", ...data };
  }
  return { message: e.message || String(e) };
}

const ClientConsultantAPI = {
  link: async (payload: { clientId: string; consultantId: string; notes?: string }) => {
    try {
      const res = await axiosInstance.post("/client-consultants/link", payload);
      return res.data;
    } catch (err) {
      throw normalizeAxiosError(err);
    }
  },

  getConsultantClients: async (consultantId: string, page = 1, limit = 50) => {
    try {
      const response = await axiosInstance.get(`/client-consultants/consultant/${consultantId}/clients`, {
        params: { page, limit },
      });

      const payload = response.data;

      // 1. Check for deeply nested { data: { data: [], total: n } } (Standard response wrapper)
      if (payload?.data?.data && Array.isArray(payload.data.data)) {
        return payload.data.data;
      }

      // 2. Check if data itself is the array (Direct array response)
      if (payload?.data && Array.isArray(payload.data)) {
        return payload.data;
      }

      // 3. Check if root is array
      if (Array.isArray(payload)) {
        return payload;
      }

      // 4. Fallback: if data is object, maybe it's a single record
      if (payload?.data && typeof payload.data === 'object') {
        return [payload.data];
      }

      console.warn('Unexpected API response structure for clients:', payload);
      return [];
    } catch (err) {
      console.error('Error in getConsultantClients:', err);
      throw normalizeAxiosError(err);
    }
  },

  getClientConsultants: async (clientId: string, page = 1, limit = 50, live?: boolean) => {
    try {
      // Handle overload if page is boolean (though TS should prevent this, runtime safety)
      // But here we just stick to signature
      const params: any = { page, limit };
      if (live) params.live = "true";

      const res = await axiosInstance.get(`/client-consultants/client/${clientId}/consultants`, {
        params,
      });

      const payload = res.data;

      // 1. Check for deeply nested { data: { data: [], total: n } }
      if (payload?.data?.data && Array.isArray(payload.data.data)) {
        return payload.data.data;
      }

      // 2. Check if data itself is the array
      if (payload?.data && Array.isArray(payload.data)) {
        return payload.data;
      }

      // 3. Check if root is array
      if (Array.isArray(payload)) {
        return payload;
      }

      // 4. Fallback: if data is object, maybe it's a single record
      if (payload?.data && typeof payload.data === 'object') {
        return [payload.data];
      }

      console.warn('Unexpected API response structure for consultants:', payload);
      return [];
    } catch (err) {
      throw normalizeAxiosError(err);
    }
  },

  getAll: async (params?: GetAllParams) => {
    try {
      const res = await axiosInstance.get("/client-consultants", { params });
      return res.data;
    } catch (err) {
      throw normalizeAxiosError(err);
    }
  },
};

export default ClientConsultantAPI;