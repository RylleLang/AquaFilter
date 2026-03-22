const MaintenanceRecord = require('../models/MaintenanceRecord');
const { resetFilterHealth } = require('../services/filterHealthService');
const logger = require('../config/logger');

/**
 * POST /api/maintenance/:deviceId
 * Log a new maintenance event.
 */
exports.createRecord = async (req, res) => {
  const { deviceId } = req.params;
  const {
    type,
    performedAt,
    cycleCountAtService,
    filterStage,
    notes,
    calibrationData,
  } = req.body;

  if (!type || cycleCountAtService === undefined) {
    return res.status(400).json({
      success: false,
      message: 'type and cycleCountAtService are required',
    });
  }

  try {
    const record = await MaintenanceRecord.create({
      deviceId,
      type,
      performedAt: performedAt ? new Date(performedAt) : new Date(),
      cycleCountAtService,
      filterStage: filterStage || null,
      performedBy: req.user._id,
      notes: notes || '',
      calibrationData: calibrationData || {},
    });

    // Reset filter health counter on replacement
    if (type === 'filter_replacement') {
      await resetFilterHealth(deviceId);
      logger.info(`Filter replaced on device ${deviceId} — health reset to 100%`);
    }

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    logger.error(`createRecord error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to log maintenance record' });
  }
};

/**
 * GET /api/maintenance/:deviceId
 * Returns paginated maintenance history.
 * Query params: type, limit, skip
 */
exports.getRecords = async (req, res) => {
  const { deviceId } = req.params;
  const { type, limit = 20, skip = 0 } = req.query;

  const filter = { deviceId };
  if (type) filter.type = type;

  try {
    const [records, total] = await Promise.all([
      MaintenanceRecord.find(filter)
        .sort({ performedAt: -1 })
        .skip(parseInt(skip))
        .limit(Math.min(parseInt(limit), 100))
        .populate('performedBy', 'name email')
        .lean(),
      MaintenanceRecord.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      total,
      count: records.length,
      data: records,
    });
  } catch (err) {
    logger.error(`getRecords error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch maintenance records' });
  }
};

/**
 * GET /api/maintenance/:deviceId/last-filter-replacement
 * Convenience endpoint for the dashboard's filter status widget.
 */
exports.getLastFilterReplacement = async (req, res) => {
  const { deviceId } = req.params;

  try {
    const record = await MaintenanceRecord.getLastFilterReplacement(deviceId);

    res.status(200).json({
      success: true,
      data: record || null,
    });
  } catch (err) {
    logger.error(`getLastFilterReplacement error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch maintenance record' });
  }
};
