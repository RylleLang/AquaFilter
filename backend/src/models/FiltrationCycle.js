/**
 * FiltrationCycle — Tracks each discrete filtration run.
 *
 * A cycle begins when the user starts the filtration process and ends
 * when it completes or is manually stopped. Sensor readings reference
 * a cycleId so pre/post readings can be compared per-cycle.
 */

const mongoose = require('mongoose');

const FiltrationCycleSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
    },

    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    durationSeconds: {
      type: Number,
      default: null, // computed on completion
    },

    status: {
      type: String,
      enum: ['running', 'paused', 'completed', 'aborted'],
      default: 'running',
    },

    // Cycle number within device lifetime (increments for filter health tracking)
    cycleNumber: {
      type: Number,
      required: true,
    },

    // Snapshot averages computed at cycle end (denormalized for fast dashboards)
    summary: {
      preFilter: {
        avgPh: Number,
        avgTurbidity: Number,
        avgTds: Number,
      },
      postFilter: {
        avgPh: Number,
        avgTurbidity: Number,
        avgTds: Number,
      },
      // Percentage improvement
      phImprovement: Number,
      turbidityReduction: Number,
      tdsReduction: Number,
    },

    notes: {
      type: String,
      default: '',
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

FiltrationCycleSchema.index({ deviceId: 1, startedAt: -1 });
FiltrationCycleSchema.index({ deviceId: 1, status: 1 });

// Virtual: elapsed time for in-progress cycles
FiltrationCycleSchema.virtual('elapsedSeconds').get(function () {
  if (this.durationSeconds) return this.durationSeconds;
  return Math.floor((Date.now() - this.startedAt.getTime()) / 1000);
});

// Compute and store summary stats on completion
FiltrationCycleSchema.methods.finalize = async function (preAvg, postAvg) {
  this.completedAt = new Date();
  this.durationSeconds = Math.floor(
    (this.completedAt - this.startedAt) / 1000
  );
  this.status = 'completed';
  this.summary = {
    preFilter: preAvg,
    postFilter: postAvg,
    phImprovement:
      preAvg.avgPh && postAvg.avgPh
        ? parseFloat(
            (((preAvg.avgPh - postAvg.avgPh) / preAvg.avgPh) * 100).toFixed(2)
          )
        : null,
    turbidityReduction:
      preAvg.avgTurbidity && postAvg.avgTurbidity
        ? parseFloat(
            (
              ((preAvg.avgTurbidity - postAvg.avgTurbidity) /
                preAvg.avgTurbidity) *
              100
            ).toFixed(2)
          )
        : null,
    tdsReduction:
      preAvg.avgTds && postAvg.avgTds
        ? parseFloat(
            (
              ((preAvg.avgTds - postAvg.avgTds) / preAvg.avgTds) *
              100
            ).toFixed(2)
          )
        : null,
  };
  return this.save();
};

module.exports = mongoose.model('FiltrationCycle', FiltrationCycleSchema);
