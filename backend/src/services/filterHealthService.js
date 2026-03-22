const DeviceState = require('../models/DeviceState');
const User = require('../models/User');
const {
  notifyFilterReplacement,
  notifyWaterQualityAlert,
} = require('./notificationService');
const logger = require('../config/logger');

const CYCLE_LIMIT = parseInt(process.env.FILTER_REPLACEMENT_CYCLE_LIMIT) || 50;

// Thresholds for water quality alerts (post-filter readings)
const QUALITY_THRESHOLDS = {
  ph: { min: 6.0, max: 9.0 },
  turbidity: { max: 100 }, // NTU — above this is concerning post-filter
  tds: { max: 1500 },      // ppm
};

/**
 * Called after each cycle completes.
 * Increments cycle counters, recalculates filter health,
 * and sends a push notification if replacement threshold is crossed.
 */
const evaluateFilterHealth = async (deviceId) => {
  const state = await DeviceState.findOne({ deviceId });
  if (!state) return;

  state.cyclesSinceLastService += 1;
  state.totalCycles += 1;
  state.recalculateFilterHealth();
  await state.save();

  const healthPercent = state.filterHealthPercent;
  logger.info(
    `[FilterHealth] Device ${deviceId} — cycles since service: ${state.cyclesSinceLastService}, health: ${healthPercent}%`
  );

  // Notify at 25%, 10%, and 0% health
  const notifyAt = [25, 10, 0];
  if (notifyAt.includes(healthPercent)) {
    const users = await User.find({ deviceIds: deviceId }).select(
      'expoPushTokens'
    );
    const tokens = users.flatMap((u) => u.expoPushTokens);

    if (tokens.length > 0) {
      await notifyFilterReplacement(tokens, healthPercent);
      logger.info(
        `[FilterHealth] Sent filter replacement alert to ${tokens.length} token(s)`
      );
    }
  }

  return state;
};

/**
 * Resets cyclesSinceLastService after a maintenance record is logged.
 * Called by the maintenance controller on filter_replacement events.
 */
const resetFilterHealth = async (deviceId) => {
  const state = await DeviceState.findOne({ deviceId });
  if (!state) return;

  state.cyclesSinceLastService = 0;
  state.filterHealthPercent = 100;
  await state.save();

  logger.info(`[FilterHealth] Filter health reset to 100% for device ${deviceId}`);
  return state;
};

/**
 * Checks if post-filter sensor readings exceed alert thresholds.
 * If so, pushes a water quality alert notification.
 */
const checkWaterQualityAlert = async (deviceId, { ph, turbidity, tds, samplePoint }) => {
  if (samplePoint !== 'post-filter') return;

  const isAlert =
    ph < QUALITY_THRESHOLDS.ph.min ||
    ph > QUALITY_THRESHOLDS.ph.max ||
    turbidity > QUALITY_THRESHOLDS.turbidity.max ||
    tds > QUALITY_THRESHOLDS.tds.max;

  if (!isAlert) return;

  logger.warn(
    `[QualityAlert] Device ${deviceId} — pH: ${ph}, Turbidity: ${turbidity}, TDS: ${tds}`
  );

  const users = await User.find({ deviceIds: deviceId }).select('expoPushTokens');
  const tokens = users.flatMap((u) => u.expoPushTokens);

  if (tokens.length > 0) {
    await notifyWaterQualityAlert(tokens, { ph, turbidity, tds });
  }
};

module.exports = { evaluateFilterHealth, resetFilterHealth, checkWaterQualityAlert };
