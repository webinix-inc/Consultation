// frontend/src/api/appointment.api.ts
import axiosInstance from "./axiosInstance";

export interface AppointmentItem {
  _id: string;
  client?: any;
  clientName?: string;
  clientId?: string;
  consultant?: any;
  consultantName?: string;
  consultantId?: string;
  category?: string;
  session?: string;
  startAt?: string;
  endAt?: string;
  date?: string; // "YYYY-MM-DD"
  timeStart?: string; // "HH:mm"
  timeEnd?: string;   // "HH:mm"
  status?: string;
  reason?: string;
  notes?: string;
  fee?: number;
  [k: string]: any;
}

export interface GetAllParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  consultant?: string;
  from?: string;
  to?: string;
  [k: string]: any;
}

export interface GetAllResponse {
  data: AppointmentItem[];
  total?: number;
  page?: number;
  limit?: number;
  meta?: any;
}

function normalizeAxiosError(e: any) {
  if (!e) return { message: "Unknown error" };
  const data = e?.response?.data ?? e?.data ?? null;
  if (data && typeof data === "object") {
    return { message: data.message || data.error || "Request failed", ...data };
  }
  return { message: e.message || String(e) };
}

const AppointmentAPI = {
  getAll: async (params?: GetAllParams): Promise<GetAllResponse> => {
    try {
      const res = await axiosInstance.get("/appointments", { params });
      // expect server to return { data: [], total, page, limit } or similar
      return res.data.data;
    } catch (err) {
      throw normalizeAxiosError(err);
    }
  },

  getAvailableSlots: async (consultantId: string, date: string, slotDurationMin?: number) => {
    try {
      const params: Record<string, any> = { consultant: consultantId, date };
      if (slotDurationMin) params.slotDurationMin = slotDurationMin;
      const res = await axiosInstance.get("/appointments/available-slots", { params });
      const payload = res.data;
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    } catch (err) {
      throw normalizeAxiosError(err);
    }
  },

  create: async (payload: Record<string, any>) => {
    try {
      const res = await axiosInstance.post("/appointments", payload);
      return res.data;
    } catch (err) {
      throw normalizeAxiosError(err);
    }
  },

  update: async (id: string, payload: Record<string, any>) => {
    try {
      const res = await axiosInstance.patch(`/appointments/${id}`, payload);
      return res.data;
    } catch (err) {
      throw normalizeAxiosError(err);
    }
  },

  remove: async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/appointments/${id}`);
      return res.data;
    } catch (err) {
      throw normalizeAxiosError(err);
    }
  },


};

export default AppointmentAPI;
