const crypto = require('crypto');
const SensorReading = require('../models/SensorReading');
const DeviceState = require('../models/DeviceState');
const { checkWaterQualityAlert } = require('../services/filterHealthService');
const logger = require('../config/logger');

/**
 * POST /api/telemetry
 *
 * Receives a secured telemetry payload from the ESP32 NodeMCU master.
 * Authenticated via HMAC-SHA256 signature (handled in middleware).
 *
 * Expected body:
 * {
 *   ph: 7.2,
 *   turbidity: 45.3,
 *   tds: 320,
 *   temperature: 28.5,   // optional
 *   samplePoint: "post-filter",
 *   timestamp: "2025-01-01T12:00:00.000Z",  // optional, defaults to server time
 *   cycleId: "objectId" // optional
 * }
 */
exports.ingestTelemetry = async (req, res) => {
  const { ph, turbidity, tds, temperature, samplePoint, timestamp, cycleId } =
    req.body;

  const deviceId = req.deviceId; // Set by validateTelemetrySignature middleware

  // Compute checksum for data integrity audit trail
  const payloadChecksum = crypto
    .createHash('sha256')
    .update(JSON.stringify(req.body))
    .digest('hex');

  try {
    const reading = await SensorReading.create({
      deviceId,
      ph,
      turbidity,
      tds,
      temperature: temperature ?? null,
      samplePoint,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      cycleId: cycleId || null,
      payloadChecksum,
    });

    // Update device heartbeat timestamp
    await DeviceState.upsertState(deviceId, {
      $set: { lastHeartbeatAt: new Date() },
    });

    // Async quality check — don't block the response
    checkWaterQualityAlert(deviceId, { ph, turbidity, tds, samplePoint }).catch(
      (err) => logger.error(`Quality alert check failed: ${err.message}`)
    );

    logger.debug(
      `[Telemetry] Device ${deviceId} — ${samplePoint} pH:${ph} Turb:${turbidity} TDS:${tds}`
    );

    res.status(201).json({
      success: true,
      readingId: reading._id,
      timestamp: reading.timestamp,
    });
  } catch (err) {
    logger.error(`Telemetry ingest error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to store telemetry' });
  }
};

/**
 * POST /api/telemetry/batch
 *
 * Accepts an array of readings in one request.
 * Useful for buffered offline sync from the ESP32.
 * Max 50 readings per batch to prevent payload abuse.
 */
exports.ingestBatch = async (req, res) => {
  const { readings } = req.body;
  const deviceId = req.deviceId;

  if (!Array.isArray(readings) || readings.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: 'readings must be a non-empty array' });
  }

  if (readings.length > 50) {
    return res
      .status(413)
      .json({ success: false, message: 'Batch limit is 50 readings per request' });
  }

  const docs = readings.map((r) => ({
    deviceId,
    ph: r.ph,
    turbidity: r.turbidity,
    tds: r.tds,
    temperature: r.temperature ?? null,
    samplePoint: r.samplePoint,
    timestamp: r.timestamp ? new Date(r.timestamp) : new Date(),
    cycleId: r.cycleId || null,
    payloadChecksum: crypto
      .createHash('sha256')
      .update(JSON.stringify(r))
      .digest('hex'),
  }));

  try {
    const result = await SensorReading.insertMany(docs, { ordered: false });

    await DeviceState.upsertState(deviceId, {
      $set: { lastHeartbeatAt: new Date() },
    });

    res.status(201).json({
      success: true,
      inserted: result.length,
    });
  } catch (err) {
    logger.error(`Batch ingest error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Batch ingest failed' });
  }
};
