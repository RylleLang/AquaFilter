const SensorReading = require('../models/SensorReading');
const logger = require('../config/logger');

/**
 * GET /api/sensors/:deviceId/history
 *
 * Returns paginated time-series readings for chart rendering.
 * Query params:
 *   startDate   — ISO date string (required)
 *   endDate     — ISO date string (required)
 *   samplePoint — 'pre-filter' | 'post-filter' (default: 'post-filter')
 *   limit       — max results (default: 200, max: 1000)
 *   skip        — pagination offset
 */
exports.getHistory = async (req, res) => {
  const { deviceId } = req.params;
  const {
    startDate,
    endDate,
    samplePoint = 'post-filter',
    limit = 200,
    skip = 0,
  } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'startDate and endDate query parameters are required',
    });
  }

  const parsedLimit = Math.min(parseInt(limit) || 200, 1000);
  const parsedSkip = parseInt(skip) || 0;

  try {
    const readings = await SensorReading.getTimeSeries(deviceId, {
      startDate,
      endDate,
      samplePoint,
      limit: parsedLimit,
      skip: parsedSkip,
    });

    res.status(200).json({
      success: true,
      count: readings.length,
      data: readings,
    });
  } catch (err) {
    logger.error(`getHistory error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch sensor history' });
  }
};

/**
 * GET /api/sensors/:deviceId/averages
 *
 * Returns aggregated averages for a time range.
 * Useful for the analytics summary cards.
 * Query params: startDate, endDate, samplePoint
 */
exports.getAverages = async (req, res) => {
  const { deviceId } = req.params;
  const { startDate, endDate, samplePoint = 'post-filter' } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'startDate and endDate are required',
    });
  }

  try {
    const [averages] = await SensorReading.getAveragesForRange(
      deviceId,
      startDate,
      endDate,
      samplePoint
    );

    res.status(200).json({
      success: true,
      data: averages || {
        avgPh: null,
        avgTurbidity: null,
        avgTds: null,
        readingCount: 0,
      },
    });
  } catch (err) {
    logger.error(`getAverages error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to compute averages' });
  }
};

/**
 * GET /api/sensors/:deviceId/latest
 *
 * Returns the most recent reading for each sample point.
 * Used by the dashboard for live status indicators.
 */
exports.getLatest = async (req, res) => {
  const { deviceId } = req.params;

  try {
    const [preFilter, postFilter] = await Promise.all([
      SensorReading.findOne({ deviceId, samplePoint: 'pre-filter' })
        .sort({ timestamp: -1 })
        .select('ph turbidity tds temperature timestamp -_id')
        .lean(),
      SensorReading.findOne({ deviceId, samplePoint: 'post-filter' })
        .sort({ timestamp: -1 })
        .select('ph turbidity tds temperature timestamp -_id')
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data: { preFilter, postFilter },
    });
  } catch (err) {
    logger.error(`getLatest error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch latest readings' });
  }
};

/**
 * GET /api/sensors/:deviceId/compare
 *
 * Compares pre-filter vs post-filter averages for a given cycle or date range.
 * Returns percentage improvement values for each parameter.
 */
exports.compareFilterPerformance = async (req, res) => {
  const { deviceId } = req.params;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'startDate and endDate are required',
    });
  }

  try {
    const [preAvgArr, postAvgArr] = await Promise.all([
      SensorReading.getAveragesForRange(deviceId, startDate, endDate, 'pre-filter'),
      SensorReading.getAveragesForRange(deviceId, startDate, endDate, 'post-filter'),
    ]);

    const pre = preAvgArr[0] || {};
    const post = postAvgArr[0] || {};

    const pctImprovement = (before, after) =>
      before && after
        ? parseFloat((((before - after) / before) * 100).toFixed(2))
        : null;

    res.status(200).json({
      success: true,
      data: {
        preFilter: pre,
        postFilter: post,
        improvement: {
          ph: pctImprovement(pre.avgPh, post.avgPh),
          turbidity: pctImprovement(pre.avgTurbidity, post.avgTurbidity),
          tds: pctImprovement(pre.avgTds, post.avgTds),
        },
      },
    });
  } catch (err) {
    logger.error(`compareFilterPerformance error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to compare filter performance' });
  }
};
