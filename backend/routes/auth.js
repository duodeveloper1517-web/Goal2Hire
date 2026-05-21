const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { syncUserStatus, formatUser } = require('../utils/syncUser');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Username and password are required' });

    const existing = await User.findOne({ username });
    if (existing)
      return res.status(400).json({ message: 'Username already taken' });

    const user = await User.create({ username, password });
    const token = signToken(user._id);

    res.status(201).json({
      token,
      user: formatUser(user)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Username and password are required' });

    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    await syncUserStatus(user);
    const token = signToken(user._id);
    res.json({
      token,
      user: formatUser(user)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user (protected)
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    await syncUserStatus(req.user);
    res.json({
      user: formatUser(req.user)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
