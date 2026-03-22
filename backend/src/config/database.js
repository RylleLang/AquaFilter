const mongoose = require('mongoose');
const logger = require('./logger');

const MONGO_OPTIONS = {
  // Auto-index in dev, disable in prod for performance
  autoIndex: process.env.NODE_ENV !== 'production',
  // Connection pool for concurrent IoT requests
  maxPoolSize: 20,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const uri =
    process.env.NODE_ENV === 'production'
      ? process.env.MONGO_URI_PROD
      : process.env.MONGO_URI;

  try {
    const conn = await mongoose.connect(uri, MONGO_OPTIONS);
    isConnected = true;
    logger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  logger.warn('MongoDB disconnected — attempting reconnect...');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  logger.info('MongoDB reconnected');
});

module.exports = connectDB;
