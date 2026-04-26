const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.register = async (req, res, next) => {
  try {
    const { username, email, password, handles } = req.body;
    console.log(`[Auth] Register attempt: ${username} (${email})`);
    
    const userExists = await User.findOne({ $or: [{ username }, { email }] });
    if (userExists) {
      const field = userExists.username === username ? "Username" : "Email";
      console.log(`[Auth] Register failed: ${field} taken`);
      return res.status(400).json({ success: false, message: `${field} already taken` });
    }

    const user = await User.create({ username, email, password, handles });
    console.log(`[Auth] User created: ${user._id}`);

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        handles: user.handles,
        settings: user.settings,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    console.error('[Auth] Register Error:', error.message);
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    console.log(`[Auth] Login attempt for: ${identifier}`);

    // Search by username OR email
    const user = await User.findOne({ 
      $or: [
        { username: identifier },
        { email: identifier }
      ] 
    });

    if (!user) {
      console.log(`[Auth] Login failed: User not found for ${identifier}`);
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(`[Auth] Login failed: Password mismatch for ${user.username}`);
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    console.log(`[Auth] Login successful: ${user.username}`);
    res.json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        handles: user.handles,
        settings: user.settings,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    console.error('[Auth] Login Error:', error.message);
    next(error);
  }
};
