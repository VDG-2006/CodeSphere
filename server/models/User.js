const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  avatarUrl: { type: String, default: '' },
  subscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  handles: {
    leetcode: { type: String, default: '' },
    codeforces: { type: String, default: '' }
  }
}, { timestamps: true });

// Pre-save hook to automatically hash parameters
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method for password verification
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
