const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const axios = require('axios');

// Load Agora credentials from environment
const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;
const AGORA_CUSTOMER_ID = process.env.AGORA_CUSTOMER_ID; // For Cloud Recording
const AGORA_CUSTOMER_SECRET = process.env.AGORA_CUSTOMER_SECRET; // For Cloud Recording
const AGORA_REST_API_BASE = 'https://api.agora.io/v1';

/**
 * Generate RTC token for video/voice calling
 * @param {string} channelName - Channel name
 * @param {string|number} uid - User ID (0 for auto-assign)
 * @param {string} role - 'publisher' (host) or 'audience' (viewer)
 * @param {number} expireTime - Token expiration time in seconds (default: 3600 = 1 hour)
 * @returns {string} RTC token
 */
function generateRtcToken(channelName, uid = 0, role = 'publisher', expireTime = 3600) {
  if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
    throw new Error('Agora credentials not configured');
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTime + expireTime;

  // Convert role string to RtcRole enum
  const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  // Build token
  const token = RtcTokenBuilder.buildTokenWithUid(
    AGORA_APP_ID,
    AGORA_APP_CERTIFICATE,
    channelName,
    uid,
    rtcRole,
    privilegeExpiredTs
  );

  return token;
}

/**
 * Create Basic Auth header for Cloud Recording REST APIs
 */
function getCloudRecordingAuthHeader() {
  if (!AGORA_CUSTOMER_ID || !AGORA_CUSTOMER_SECRET) {
    throw new Error('Agora Cloud Recording credentials not configured');
  }

  const credentials = Buffer.from(`${AGORA_CUSTOMER_ID}:${AGORA_CUSTOMER_SECRET}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Acquire Cloud Recording resource
 * @param {string} cname - Channel name
 * @param {string} uid - Recording bot UID (string format)
 * @param {object} storageConfig - Storage configuration (S3/OSS/etc)
 * @returns {Promise<{resourceId: string}>}
 */
async function acquireRecordingResource(cname, uid, storageConfig = {}) {
  try {
    const url = `${AGORA_REST_API_BASE}/apps/${AGORA_APP_ID}/cloud_recording/acquire`;
    
    const payload = {
      cname,
      uid: String(uid), // Must be string
      clientRequest: {
        resourceExpiredHour: 24, // Resource expires in 24 hours
        ...storageConfig,
      },
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': getCloudRecordingAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (response.data && response.data.resourceId) {
      return { resourceId: response.data.resourceId };
    }

    throw new Error('Failed to acquire recording resource');
  } catch (error) {
    console.error('Error acquiring recording resource:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Start Cloud Recording
 * @param {string} resourceId - Resource ID from acquire
 * @param {string} mode - 'individual' or 'mix'
 * @param {string} cname - Channel name
 * @param {string} uid - Recording bot UID
 * @param {object} storageConfig - Storage config (S3 credentials, bucket, etc)
 * @returns {Promise<{sid: string}>}
 */
async function startRecording(resourceId, mode, cname, uid, storageConfig) {
  try {
    const url = `${AGORA_REST_API_BASE}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/mode/${mode}/start`;

    const payload = {
      cname,
      uid: String(uid),
      clientRequest: {
        token: generateRtcToken(cname, uid, 'publisher'), // Generate token for recording bot
        storageConfig,
      },
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': getCloudRecordingAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    if (response.data && response.data.sid) {
      return { sid: response.data.sid };
    }

    throw new Error('Failed to start recording');
  } catch (error) {
    console.error('Error starting recording:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Query Cloud Recording status
 * @param {string} resourceId - Resource ID
 * @param {string} sid - Recording session ID
 * @param {string} mode - 'individual' or 'mix'
 * @returns {Promise<object>}
 */
async function queryRecordingStatus(resourceId, sid, mode) {
  try {
    const url = `${AGORA_REST_API_BASE}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/${mode}/query`;

    const response = await axios.get(url, {
      headers: {
        'Authorization': getCloudRecordingAuthHeader(),
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error querying recording status:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Stop Cloud Recording
 * @param {string} resourceId - Resource ID
 * @param {string} sid - Recording session ID
 * @param {string} mode - 'individual' or 'mix'
 * @param {string} cname - Channel name
 * @param {string} uid - Recording bot UID
 * @returns {Promise<object>}
 */
async function stopRecording(resourceId, sid, mode, cname, uid) {
  try {
    const url = `${AGORA_REST_API_BASE}/apps/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/${mode}/stop`;

    const payload = {
      cname,
      uid: String(uid),
      clientRequest: {},
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': getCloudRecordingAuthHeader(),
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error stopping recording:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Generate unique channel name for appointment
 * @param {string} appointmentId - Appointment ID
 * @returns {string}
 */
function generateChannelName(appointmentId) {
  return `appointment-${appointmentId}`;
}

module.exports = {
  generateRtcToken,
  acquireRecordingResource,
  startRecording,
  queryRecordingStatus,
  stopRecording,
  generateChannelName,
  getCloudRecordingAuthHeader,
};

