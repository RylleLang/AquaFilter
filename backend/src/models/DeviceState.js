/**
 * DeviceState — Persistent record of the ESP32 device's last known state.
 *
 * One document per device (upserted). Acts as the source of truth
 * for the mobile app dashboard (on/off, cycle status, filter health).
 */

const mongoose = require('mongoose');

const DeviceStateSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Master power state
    isPoweredOn: {
      type: Boolean,
      default: false,
    },

    // Filtration cycle state
    cycleStatus: {
      type: String,
      enum: ['idle', 'running', 'paused', 'completed'],
      default: 'idle',
    },

    activeCycleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FiltrationCycle',
      default: null,
    },

    // Cumulative count of completed filtration cycles since last filter change
    cyclesSinceLastService: {
      type: Number,
      default: 0,
    },

    // Total lifetime cycles (never resets)
    totalCycles: {
      type: Number,
      default: 0,
    },

    // Filter health percentage (100% = new, 0% = needs replacement)
    filterHealthPercent: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },

    // Last telemetry received from device
    lastHeartbeatAt: {
      type: Date,
      default: null,
    },

    // Device firmware version for OTA management
    firmwareVersion: {
      type: String,
      default: '1.0.0',
    },

    // Expo push token(s) registered for this device's owner
    pushTokens: {
      type: [String],
      default: [],
    },

    // Device is considered offline if no heartbeat in this many seconds
    offlineThresholdSeconds: {
      type: Number,
      default: 30,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Virtual: is the device currently online?
DeviceStateSchema.virtual('isOnline').get(function () {
  if (!this.lastHeartbeatAt) return false;
  const elapsed = (Date.now() - this.lastHeartbeatAt.getTime()) / 1000;
  return elapsed <= this.offlineThresholdSeconds;
});

// Upsert helper — create or update device state atomically
DeviceStateSchema.statics.upsertState = function (deviceId, update) {
  return this.findOneAndUpdate({ deviceId }, update, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
    runValidators: true,
  });
};

// Recalculate filter health based on cycle limit from env
DeviceStateSchema.methods.recalculateFilterHealth = function () {
  const limit = parseInt(process.env.FILTER_REPLACEMENT_CYCLE_LIMIT) || 50;
  this.filterHealthPercent = Math.max(
    0,
    Math.round(((limit - this.cyclesSinceLastService) / limit) * 100)
  );
};

module.exports = mongoose.model('DeviceState', DeviceStateSchema);
