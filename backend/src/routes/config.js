const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const DeviceConfig = require('../models/DeviceConfig');
const logger = require('../config/logger');

// POST /api/config/wifi — mobile app sends new WiFi credentials
router.post('/wifi', protect, async (req, res) => {
  const { deviceId, ssid, password } = req.body;

  if (!deviceId || !ssid) {
    return res.status(400).json({ success: false, message: 'deviceId and ssid are required' });
  }

  try {
    const config = await DeviceConfig.findOneAndUpdate(
      { deviceId },
      {
        $set: {
          'wifi.ssid': ssid.trim(),
          'wifi.password': password || '',
          'wifi.updatedAt': new Date(),
          'wifi.applied': false,
        },
      },
      { upsert: true, new: true }
    );

    logger.info(`WiFi config updated for device ${deviceId} by user ${req.user?.id}`);
    res.json({ success: true, message: 'WiFi config queued for device', config });
  } catch (err) {
    logger.error(`WiFi config update failed: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to save WiFi config' });
  }
});

// GET /api/config/wifi/:deviceId — ESP32 polls this to pick up new credentials
router.get('/wifi/:deviceId', async (req, res) => {
  const { deviceId } = req.params;

  try {
    const config = await DeviceConfig.findOne({ deviceId });

    if (!config || config.wifi.applied) {
      return res.json({ success: true, pending: false });
    }

    // Mark as applied so ESP32 doesn't re-apply on next poll
    config.wifi.applied = true;
    await config.save();

    res.json({
      success: true,
      pending: true,
      wifi: { ssid: config.wifi.ssid, password: config.wifi.password },
    });
  } catch (err) {
    logger.error(`WiFi config fetch failed: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch WiFi config' });
  }
});

// GET /api/config/cycle-state/:deviceId — ESP32 polls this to know if pump should run
// Secured with X-Device-Signature header (same secret as telemetry)
router.get('/cycle-state/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  const signature = req.headers['x-device-signature'];

  if (signature !== process.env.DEVICE_HMAC_SECRET) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const DeviceState = require('../models/DeviceState');
    const state = await DeviceState.findOne({ deviceId }).lean();
    if (!state) return res.json({ success: true, cycleRunning: false });
    res.json({ success: true, cycleRunning: state.cycleStatus === 'running' });
  } catch (err) {
    res.status(500).json({ success: false, cycleRunning: false });
  }
});

module.exports = router;
