const User = require('../models/User');

exports.getSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('fullName email avatarUrl handles settings');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      data: {
        profile: {
          name: user.fullName || '',
          email: user.email || '',
          avatar: user.avatarUrl || ''
        },
        handles: user.handles || {},
        preferences: user.settings?.preferences || { cooldown: true, defaultView: 'dashboard', heatmapIntensity: 5 },
        aiMentor: user.settings?.aiMentor || { visible: true, chatPref: 'text', autoAnalyze: false }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const { profile, handles, preferences, aiMentor } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Update Profile
    if (profile) {
      if (profile.name !== undefined) user.fullName = profile.name;
      if (profile.email !== undefined) user.email = profile.email;
      if (profile.avatar !== undefined) user.avatarUrl = profile.avatar;
    }

    // Update Handles
    if (handles) {
      if (handles.leetcode !== undefined) user.handles.leetcode = handles.leetcode;
      if (handles.codeforces !== undefined) user.handles.codeforces = handles.codeforces;
    }

    // Update Settings Objects
    if (preferences) {
      user.settings.preferences = { ...user.settings.preferences, ...preferences };
    }
    if (aiMentor) {
      user.settings.aiMentor = { ...user.settings.aiMentor, ...aiMentor };
    }

    await user.save();

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        profile: {
          name: user.fullName,
          email: user.email,
          avatar: user.avatarUrl
        },
        handles: user.handles,
        preferences: user.settings.preferences,
        aiMentor: user.settings.aiMentor
      }
    });
  } catch (error) {
    console.error('[UserController] Update Error:', error.message);
    next(error);
  }
};
