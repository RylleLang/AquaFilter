/**
 * MaintenanceRecord — Logs all service events for the filtration device.
 *
 * Covers filter replacements (banana peel bio-adsorbent), cleanings,
 * sensor calibrations, and any manual interventions.
 */

const mongoose = require('mongoose');

const MaintenanceRecordSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        'filter_replacement', // Banana peel bio-adsorbent replaced
        'filter_cleaning',    // Partial cleaning, not full replacement
        'sensor_calibration', // pH/turbidity/TDS sensor re-calibrated
        'system_inspection',  // General inspection
        'repair',             // Hardware repair
        'other',
      ],
      required: true,
    },

    performedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // Cumulative cycle count at the time of this maintenance event
    cycleCountAtService: {
      type: Number,
      required: true,
    },

    // For filter replacements: which filter stage was serviced
    filterStage: {
      type: String,
      enum: ['primary', 'secondary', 'all', null],
      default: null,
    },

    // Who performed the maintenance (user account)
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    notes: {
      type: String,
      default: '',
      maxlength: 1000,
    },

    // Sensor readings logged before/after calibration for audit trail
    calibrationData: {
      before: {
        ph: Number,
        turbidity: Number,
        tds: Number,
      },
      after: {
        ph: Number,
        turbidity: Number,
        tds: Number,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

MaintenanceRecordSchema.index({ deviceId: 1, performedAt: -1 });
MaintenanceRecordSchema.index({ deviceId: 1, type: 1 });

// Fetch last filter replacement for a device
MaintenanceRecordSchema.statics.getLastFilterReplacement = function (deviceId) {
  return this.findOne({ deviceId, type: 'filter_replacement' })
    .sort({ performedAt: -1 })
    .lean();
};

module.exports = mongoose.model('MaintenanceRecord', MaintenanceRecordSchema);
