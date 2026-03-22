const express = require('express');
const router = express.Router();

const { ingestTelemetry, ingestBatch } = require('../controllers/telemetryController');
const {
  validateTelemetrySignature,
  validateTelemetryPayload,
} = require('../middleware/validateTelemetry');
const { telemetryLimiter } = require('../middleware/rateLimiter');

// Single reading — primary ESP32 telemetry endpoint
router.post(
  '/',
  telemetryLimiter,
  validateTelemetrySignature,
  validateTelemetryPayload,
  ingestTelemetry
);

// Buffered batch sync (e.g. after reconnect)
router.post(
  '/batch',
  telemetryLimiter,
  validateTelemetrySignature,
  ingestBatch
);

module.exports = router;
