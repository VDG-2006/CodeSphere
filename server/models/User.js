const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  password: { type: String, required: true, minlength: 8 },
  avatarUrl: { type: String, default: '' },
  fullName: { type: String, default: '' },
  subscriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  subscribersCount: { type: Number, default: 0 },
  handles: {
    leetcode: { type: String, default: '' },
    codeforces: { type: String, default: '' }
  },
  settings: {
    preferences: {
      cooldown: { type: Boolean, default: true },
      defaultView: { type: String, default: 'dashboard' },
      heatmapIntensity: { type: Number, default: 5 }
    },
    aiMentor: {
      visible: { type: Boolean, default: true },
      chatPref: { type: String, default: 'text' },
      autoAnalyze: { type: Boolean, default: false }
    }
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
