const agoraService = require('../../../services/agora.service');
const Appointment = require('../../../models/appointment.model');
const { sendSuccess, sendError, ApiError } = require('../../../utils/response');
const httpStatus = require('../../../constants/httpStatus');

/**
 * Generate RTC token for joining video call
 * POST /api/v1/agora/token
 */
exports.generateToken = async (req, res, next) => {
  try {
    const { channelName, uid, role = 'publisher', expireTime = 3600 } = req.body;

    if (!channelName) {
      throw new ApiError('channelName is required', httpStatus.BAD_REQUEST);
    }

    // Validate user has access to this channel (check via appointment)
    const user = req.user;
    const userId = user?._id || user?.id;

    // Find appointment by channel name (format: appointment-{id})
    const appointmentId = channelName.replace('appointment-', '');
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      throw new ApiError('Invalid channel name', httpStatus.NOT_FOUND);
    }

    // Verify user is either client or consultant
    const isClient = String(appointment.client) === String(userId);
    const isConsultant = String(appointment.consultant) === String(userId);
    const isAdmin = user?.role === 'Admin';

    if (!isClient && !isConsultant && !isAdmin) {
      throw new ApiError('Not authorized to join this channel', httpStatus.FORBIDDEN);
    }

    // Generate token
    const token = agoraService.generateRtcToken(channelName, uid || 0, role, expireTime);

    return sendSuccess(res, 'Token generated successfully', {
      token,
      channelName,
      uid: uid || 0,
      appId: process.env.AGORA_APP_ID,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start Cloud Recording for an appointment
 * POST /api/v1/agora/recording/start
 */
exports.startRecording = async (req, res, next) => {
  try {
    const { appointmentId, mode = 'mix', storageConfig } = req.body;

    if (!appointmentId) {
      throw new ApiError('appointmentId is required', httpStatus.BAD_REQUEST);
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new ApiError('Appointment not found', httpStatus.NOT_FOUND);
    }

    // Check authorization (only consultant or admin can start recording)
    const user = req.user;
    const userId = user?._id || user?.id;
    const isConsultant = String(appointment.consultant) === String(userId);
    const isAdmin = user?.role === 'Admin';

    if (!isConsultant && !isAdmin) {
      throw new ApiError('Only consultant can start recording', httpStatus.FORBIDDEN);
    }

    // Get or create channel name
    const channelName = appointment.agora?.channelName || agoraService.generateChannelName(appointmentId);
    const recordingUid = '999999'; // Fixed UID for recording bot

    // Acquire resource if not already acquired
    let resourceId = appointment.agora?.resourceId;
    if (!resourceId) {
      const acquireResult = await agoraService.acquireRecordingResource(
        channelName,
        recordingUid,
        storageConfig || {}
      );
      resourceId = acquireResult.resourceId;
    }

    // Start recording
    const startResult = await agoraService.startRecording(
      resourceId,
      mode,
      channelName,
      recordingUid,
      storageConfig || {}
    );

    // Update appointment with recording info
    if (!appointment.agora) {
      appointment.agora = {};
    }
    appointment.agora.channelName = channelName;
    appointment.agora.resourceId = resourceId;
    appointment.agora.recordingSid = startResult.sid;
    appointment.agora.recordingStatus = 'recording';
    await appointment.save();

    return sendSuccess(res, 'Recording started successfully', {
      resourceId,
      sid: startResult.sid,
      channelName,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Stop Cloud Recording for an appointment
 * POST /api/v1/agora/recording/stop
 */
exports.stopRecording = async (req, res, next) => {
  try {
    const { appointmentId, mode = 'mix' } = req.body;

    if (!appointmentId) {
      throw new ApiError('appointmentId is required', httpStatus.BAD_REQUEST);
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new ApiError('Appointment not found', httpStatus.NOT_FOUND);
    }

    // Check authorization
    const user = req.user;
    const userId = user?._id || user?.id;
    const isConsultant = String(appointment.consultant) === String(userId);
    const isAdmin = user?.role === 'Admin';

    if (!isConsultant && !isAdmin) {
      throw new ApiError('Only consultant can stop recording', httpStatus.FORBIDDEN);
    }

    const { resourceId, recordingSid, channelName } = appointment.agora || {};
    if (!resourceId || !recordingSid) {
      throw new ApiError('Recording not started for this appointment', httpStatus.BAD_REQUEST);
    }

    const recordingUid = '999999';
    const stopResult = await agoraService.stopRecording(
      resourceId,
      recordingSid,
      mode,
      channelName,
      recordingUid
    );

    // Extract file URL from response
    let fileUrl = null;
    if (stopResult.serverResponse && stopResult.serverResponse.fileList) {
      const fileList = stopResult.serverResponse.fileList;
      if (fileList.length > 0 && fileList[0].fileName) {
        // Construct full URL based on storage config
        fileUrl = fileList[0].fileName;
      }
    }

    // Update appointment
    appointment.agora.recordingStatus = 'stopped';
    if (fileUrl) {
      appointment.agora.recordingFileUrl = fileUrl;
    }
    await appointment.save();

    return sendSuccess(res, 'Recording stopped successfully', {
      fileUrl,
      ...stopResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Query Recording Status
 * GET /api/v1/agora/recording/status/:appointmentId
 */
exports.getRecordingStatus = async (req, res, next) => {
  try {
    const { appointmentId } = req.params;
    const { mode = 'mix' } = req.query;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      throw new ApiError('Appointment not found', httpStatus.NOT_FOUND);
    }

    const { resourceId, recordingSid } = appointment.agora || {};
    if (!resourceId || !recordingSid) {
      return sendSuccess(res, 'Recording not started', { status: 'not_started' });
    }

    const status = await agoraService.queryRecordingStatus(resourceId, recordingSid, mode);

    return sendSuccess(res, 'Recording status fetched', status);
  } catch (error) {
    next(error);
  }
};

