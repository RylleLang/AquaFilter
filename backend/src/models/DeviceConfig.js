const mongoose = require('mongoose');

const deviceConfigSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true, trim: true },
    wifi: {
      ssid: { type: String, default: '' },
      password: { type: String, default: '' },
      updatedAt: { type: Date, default: null },
      applied: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeviceConfig', deviceConfigSchema);
