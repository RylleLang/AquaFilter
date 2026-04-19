const mongoose = require('mongoose');

const deviceConfigSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true, trim: true },
    wifi: {
      ssid:      { type: String, default: '' },
      password:  { type: String, default: '' },
      updatedAt: { type: Date,   default: null },
      applied:   { type: Boolean, default: false },
    },
    wifiScan: {
      requested:   { type: Boolean, default: false },
      requestedAt: { type: Date,    default: null },
      results:     { type: Array,   default: [] },  // [{ ssid, rssi, open }]
      completedAt: { type: Date,    default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeviceConfig', deviceConfigSchema);
