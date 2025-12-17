import axiosInstance from "./axiosInstance";

const LocationAPI = {
  getStates: async () => {
    const res = await axiosInstance.get("/locations/states");
    return res.data;
  },

  getCities: async (state?: string) => {
    const params = state ? { state } : {};
    const res = await axiosInstance.get("/locations/cities", { params });
    return res.data;
  },

  searchStates: async (query: string) => {
    const res = await axiosInstance.get("/locations/states/search", {
      params: { q: query },
    });
    return res.data;
  },

  searchCities: async (query: string, state?: string) => {
    const params: any = { q: query };
    if (state) params.state = state;
    const res = await axiosInstance.get("/locations/cities/search", { params });
    return res.data;
  },
};

export default LocationAPI;

