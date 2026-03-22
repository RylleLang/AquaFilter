const express = require('express');
const router = express.Router({ mergeParams: true }); // inherits :deviceId from parent

const {
  getHistory,
  getAverages,
  getLatest,
  compareFilterPerformance,
} = require('../controllers/sensorController');
const { protect } = require('../middleware/auth');
const { deviceAccess } = require('../middleware/auth');

// All sensor routes require authentication + device ownership
router.use(protect, deviceAccess);

router.get('/history', getHistory);
router.get('/averages', getAverages);
router.get('/latest', getLatest);
router.get('/compare', compareFilterPerformance);

module.exports = router;
