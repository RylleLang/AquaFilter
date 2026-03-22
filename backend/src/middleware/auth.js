const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

/**
 * Verifies Bearer JWT token from Authorization header.
 * Attaches decoded user to req.user.
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.warn(`JWT verification failed: ${err.message}`);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Role-based access control middleware.
 * Usage: authorize('owner', 'technician')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized for this action`,
      });
    }
    next();
  };
};

/**
 * Verifies that the requesting user has access to the target deviceId.
 * Reads deviceId from req.params.deviceId or req.body.deviceId.
 */
const deviceAccess = (req, res, next) => {
  const deviceId = req.params.deviceId || req.body.deviceId;

  if (!deviceId) {
    return res.status(400).json({ success: false, message: 'deviceId is required' });
  }

  if (
    req.user.role !== 'owner' &&
    !req.user.deviceIds.includes(deviceId)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to this device',
    });
  }

  req.deviceId = deviceId;
  next();
};

module.exports = { protect, authorize, deviceAccess };
