const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const DeviceConfig = require('../models/DeviceConfig');
const logger = require('../config/logger');

// ── POST /api/config/wifi ─────────────────────────────────────────────────
// Mobile app sends new WiFi credentials for ESP32
router.post('/wifi', protect, async (req, res) => {
  const { deviceId, ssid, password } = req.body;
  if (!deviceId || !ssid)
    return res.status(400).json({ success: false, message: 'deviceId and ssid are required' });

  try {
    const config = await DeviceConfig.findOneAndUpdate(
      { deviceId },
      { $set: { 'wifi.ssid': ssid.trim(), 'wifi.password': password || '', 'wifi.updatedAt': new Date(), 'wifi.applied': false } },
      { upsert: true, new: true }
    );
    logger.info(`WiFi config updated for device ${deviceId}`);
    res.json({ success: true, message: 'WiFi config queued for device', config });
  } catch (err) {
    logger.error(`WiFi config update failed: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to save WiFi config' });
  }
});

// ── GET /api/config/wifi/:deviceId ────────────────────────────────────────
// ESP32 polls to pick up new WiFi credentials
router.get('/wifi/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  try {
    const config = await DeviceConfig.findOne({ deviceId });
    if (!config || config.wifi.applied)
      return res.json({ success: true, pending: false });

    config.wifi.applied = true;
    await config.save();
    res.json({ success: true, pending: true, wifi: { ssid: config.wifi.ssid, password: config.wifi.password } });
  } catch (err) {
    logger.error(`WiFi config fetch failed: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch WiFi config' });
  }
});

// ── POST /api/config/wifi-scan-request/:deviceId ──────────────────────────
// Mobile app requests ESP32 to scan nearby WiFi networks
router.post('/wifi-scan-request/:deviceId', protect, async (req, res) => {
  const { deviceId } = req.params;
  try {
    await DeviceConfig.findOneAndUpdate(
      { deviceId },
      { $set: { 'wifiScan.requested': true, 'wifiScan.requestedAt': new Date(), 'wifiScan.results': [] } },
      { upsert: true }
    );
    res.json({ success: true, message: 'Scan requested — ESP32 will scan shortly' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to request scan' });
  }
});

// ── GET /api/config/wifi-scan-request/:deviceId ───────────────────────────
// ESP32 polls to check if app has requested a scan
router.get('/wifi-scan-request/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  const signature = req.headers['x-device-signature'];
  if (signature !== process.env.DEVICE_HMAC_SECRET)
    return res.status(401).json({ success: false });

  try {
    const config = await DeviceConfig.findOne({ deviceId });
    if (!config || !config.wifiScan.requested)
      return res.json({ success: true, scanRequested: false });

    // Clear the request flag so ESP32 doesn't scan again
    config.wifiScan.requested = false;
    await config.save();
    res.json({ success: true, scanRequested: true });
  } catch (err) {
    res.status(500).json({ success: false, scanRequested: false });
  }
});

// ── POST /api/config/wifi-scan-results/:deviceId ──────────────────────────
// ESP32 uploads the scan results
router.post('/wifi-scan-results/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  const signature = req.headers['x-device-signature'];
  if (signature !== process.env.DEVICE_HMAC_SECRET)
    return res.status(401).json({ success: false });

  const { networks } = req.body; // [{ ssid, rssi, open }]
  try {
    await DeviceConfig.findOneAndUpdate(
      { deviceId },
      { $set: { 'wifiScan.results': networks || [], 'wifiScan.completedAt': new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ── GET /api/config/wifi-scan-results/:deviceId ───────────────────────────
// Mobile app polls to get the list of scanned networks
router.get('/wifi-scan-results/:deviceId', protect, async (req, res) => {
  const { deviceId } = req.params;
  try {
    const config = await DeviceConfig.findOne({ deviceId });
    if (!config || !config.wifiScan.completedAt)
      return res.json({ success: true, ready: false, networks: [] });

    res.json({ success: true, ready: true, networks: config.wifiScan.results });
  } catch (err) {
    res.status(500).json({ success: false, ready: false, networks: [] });
  }
});

// ── GET /api/config/cycle-state/:deviceId ────────────────────────────────
// ESP32 polls to know if pump should run
router.get('/cycle-state/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  const signature = req.headers['x-device-signature'];
  if (signature !== process.env.DEVICE_HMAC_SECRET)
    return res.status(401).json({ success: false, message: 'Unauthorized' });

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
