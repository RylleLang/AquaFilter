const crypto = require('crypto');
const logger = require('../config/logger');

/**
 * Validates ESP32 telemetry payloads via HMAC-SHA256 signature.
 *
 * The NodeMCU firmware must:
 *  1. Serialize the JSON payload body as a UTF-8 string
 *  2. Compute HMAC-SHA256 of that string using the shared DEVICE_HMAC_SECRET
 *  3. Send the hex digest in the X-Device-Signature header
 *
 * This middleware rejects any request where the signature does not match,
 * preventing spoofed or tampered sensor data from entering the database.
 */
const validateTelemetrySignature = (req, res, next) => {
  const signature = req.headers['x-device-signature'];
  const deviceId = req.headers['x-device-id'];

  if (!signature) {
    logger.warn(`Telemetry rejected — missing X-Device-Signature from ${req.ip}`);
    return res.status(401).json({
      success: false,
      message: 'Missing device signature',
    });
  }

  if (!deviceId) {
    return res.status(400).json({
      success: false,
      message: 'Missing X-Device-Id header',
    });
  }

  // Use the raw body bytes for HMAC — re-serializing req.body changes number formats
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', process.env.DEVICE_HMAC_SECRET)
    .update(rawBody)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    logger.warn(
      `Telemetry rejected — invalid signature for deviceId: ${deviceId}`
    );
    return res.status(401).json({
      success: false,
      message: 'Invalid device signature',
    });
  }

  // Attach validated deviceId to the request
  req.deviceId = deviceId;
  next();
};

/**
 * Validates that the telemetry payload contains required sensor fields
 * and that values are within physically possible ranges.
 */
const validateTelemetryPayload = (req, res, next) => {
  const { ph, turbidity, tds, samplePoint, timestamp } = req.body;
  const errors = [];

  if (ph === undefined || ph === null) {
    errors.push('ph is required');
  } else if (typeof ph !== 'number' || ph < 0 || ph > 14) {
    errors.push('ph must be a number between 0 and 14');
  }

  if (turbidity === undefined || turbidity === null) {
    errors.push('turbidity is required');
  } else if (typeof turbidity !== 'number' || turbidity < 0) {
    errors.push('turbidity must be a non-negative number (NTU)');
  }

  if (tds === undefined || tds === null) {
    errors.push('tds is required');
  } else if (typeof tds !== 'number' || tds < 0) {
    errors.push('tds must be a non-negative number (ppm)');
  }

  if (!samplePoint || !['pre-filter', 'post-filter'].includes(samplePoint)) {
    errors.push("samplePoint must be 'pre-filter' or 'post-filter'");
  }

  if (timestamp && isNaN(Date.parse(timestamp))) {
    errors.push('timestamp must be a valid ISO 8601 date string');
  }

  if (errors.length > 0) {
    return res.status(422).json({ success: false, errors });
  }

  next();
};

module.exports = { validateTelemetrySignature, validateTelemetryPayload };
