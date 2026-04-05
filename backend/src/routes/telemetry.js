const express = require('express');
const router = express.Router();

const { ingestTelemetry, ingestBatch } = require('../controllers/telemetryController');
const { validateTelemetryPayload } = require('../middleware/validateTelemetry');
const { telemetryLimiter } = require('../middleware/rateLimiter');

// Single reading — primary ESP32 telemetry endpoint
router.post(
  '/',
  telemetryLimiter,
  (req, res, next) => { req.deviceId = req.headers['x-device-id'] || 'esp32-aquafilter-001'; next(); },
  validateTelemetryPayload,
  ingestTelemetry
);

// Buffered batch sync (e.g. after reconnect)
router.post(
  '/batch',
  telemetryLimiter,
  (req, res, next) => { req.deviceId = req.headers['x-device-id'] || 'esp32-aquafilter-001'; next(); },
  ingestBatch
);

module.exports = router;
