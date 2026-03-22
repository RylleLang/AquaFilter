const express = require('express');
const router = express.Router({ mergeParams: true });

const {
  createRecord,
  getRecords,
  getLastFilterReplacement,
} = require('../controllers/maintenanceController');
const { protect, deviceAccess, authorize } = require('../middleware/auth');

router.use(protect, deviceAccess);

router.get('/', getRecords);
router.get('/last-filter-replacement', getLastFilterReplacement);
router.post('/', authorize('owner', 'technician'), createRecord);

module.exports = router;
