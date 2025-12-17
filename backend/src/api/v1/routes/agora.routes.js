const express = require('express');
const router = express.Router();
const agoraController = require('../controllers/agora.controller');
const { authenticateToken, authorizeRoles } = require('../../../middlewares/auth.middleware');
const { validate } = require('../../../middlewares/validate.middleware');
const {
  generateTokenSchema,
  startRecordingSchema,
  stopRecordingSchema,
} = require('../validators/agora.validator');

// Generate RTC token
router.post(
  '/token',
  authenticateToken,
  authorizeRoles('Admin', 'Consultant', 'Client'),
  validate(generateTokenSchema),
  agoraController.generateToken
);

// Start recording
router.post(
  '/recording/start',
  authenticateToken,
  authorizeRoles('Admin', 'Consultant'),
  validate(startRecordingSchema),
  agoraController.startRecording
);

// Stop recording
router.post(
  '/recording/stop',
  authenticateToken,
  authorizeRoles('Admin', 'Consultant'),
  validate(stopRecordingSchema),
  agoraController.stopRecording
);

// Get recording status
router.get(
  '/recording/status/:appointmentId',
  authenticateToken,
  authorizeRoles('Admin', 'Consultant', 'Client'),
  agoraController.getRecordingStatus
);

module.exports = router;

