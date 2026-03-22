const express = require('express');
const router = express.Router({ mergeParams: true });

const {
  getState,
  setPower,
  startCycle,
  togglePause,
  completeCycle,
  getCycles,
} = require('../controllers/deviceController');
const { protect, deviceAccess, authorize } = require('../middleware/auth');

router.use(protect, deviceAccess);

router.get('/state', getState);
router.get('/cycles', getCycles);

// Control actions — owner and technician only
router.patch('/power', authorize('owner', 'technician'), setPower);
router.post('/cycle/start', authorize('owner', 'technician'), startCycle);
router.patch('/cycle/pause', authorize('owner', 'technician'), togglePause);
router.post('/cycle/complete', authorize('owner', 'technician'), completeCycle);

module.exports = router;
