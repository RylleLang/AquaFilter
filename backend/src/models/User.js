const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never returned in queries by default
    },

    role: {
      type: String,
      enum: ['owner', 'technician', 'viewer'],
      default: 'owner',
    },

    // Devices this user has access to
    deviceIds: {
      type: [String],
      default: [],
    },

    // Expo push notification tokens registered by this user's devices
    expoPushTokens: {
      type: [String],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// -------------------------------------------------------------------
// HOOKS
// -------------------------------------------------------------------

// Hash password before save if modified
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// -------------------------------------------------------------------
// METHODS
// -------------------------------------------------------------------

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Register a push token (avoid duplicates)
UserSchema.methods.registerPushToken = async function (token) {
  if (!this.expoPushTokens.includes(token)) {
    this.expoPushTokens.push(token);
    await this.save();
  }
};

// Remove a push token on logout
UserSchema.methods.removePushToken = async function (token) {
  this.expoPushTokens = this.expoPushTokens.filter((t) => t !== token);
  await this.save();
};

module.exports = mongoose.model('User', UserSchema);
