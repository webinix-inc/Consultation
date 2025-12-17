import axiosInstance from './axiosInstance';

export interface TokenResponse {
  token: string;
  channelName: string;
  uid: number | string;
  appId: string;
}

export interface RecordingStartResponse {
  resourceId: string;
  sid: string;
  channelName: string;
}

export interface RecordingStopResponse {
  fileUrl?: string;
  [key: string]: any;
}

export interface RecordingStatusResponse {
  status: string;
  [key: string]: any;
}

function normalizeAxiosError(e: any) {
  if (!e) return { message: 'Unknown error' };
  const data = e?.response?.data ?? e?.data ?? null;
  if (data && typeof data === 'object') {
    return { message: data.message || data.error || 'Request failed', ...data };
  }
  return { message: e.message || String(e) };
}

const AgoraAPI = {
  /**
   * Generate RTC token for joining video call
   */
  generateToken: async (
    channelName: string,
    uid?: number | string,
    role: 'publisher' | 'audience' = 'publisher',
    expireTime: number = 3600
  ): Promise<TokenResponse> => {
    try {
      const res = await axiosInstance.post('/agora/token', {
        channelName,
        uid,
        role,
        expireTime,
      });
      return res.data.data;
    } catch (err) {
      throw normalizeAxiosError(err);
    }
  },

  /**
   * Start Cloud Recording
   */
  startRecording: async (
    appointmentId: string,
    mode: 'individual' | 'mix' = 'mix',
    storageConfig?: any
  ): Promise<RecordingStartResponse> => {
    try {
      const res = await axiosInstance.post('/agora/recording/start', {
        appointmentId,
        mode,
        storageConfig,
      });
      return res.data.data;
    } catch (err) {
      throw normalizeAxiosError(err);
    }
  },

  /**
   * Stop Cloud Recording
   */
  stopRecording: async (
    appointmentId: string,
    mode: 'individual' | 'mix' = 'mix'
  ): Promise<RecordingStopResponse> => {
    try {
      const res = await axiosInstance.post('/agora/recording/stop', {
        appointmentId,
        mode,
      });
      return res.data.data;
    } catch (err) {
      throw normalizeAxiosError(err);
    }
  },

  /**
   * Get Recording Status
   */
  getRecordingStatus: async (
    appointmentId: string,
    mode: 'individual' | 'mix' = 'mix'
  ): Promise<RecordingStatusResponse> => {
    try {
      const res = await axiosInstance.get(`/agora/recording/status/${appointmentId}`, {
        params: { mode },
      });
      return res.data.data;
    } catch (err) {
      throw normalizeAxiosError(err);
    }
  },
};

export default AgoraAPI;

