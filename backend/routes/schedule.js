const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const { schedule } = require('../data/schedule');
const { syncUserStatus, formatUser } = require('../utils/syncUser');

// Get full schedule for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    await syncUserStatus(req.user);
    res.json({
      schedule,
      completedDays: req.user.completedDays,
      failedDays: req.user.failedDays || [],
      currentDay: req.user.currentDay || 1,
      dayDeadline: req.user.dayDeadline,
      agreed: req.user.agreed || false,
      selectedSubject: req.user.selectedSubject || null,
      quizScores: req.user.quizScores ? Object.fromEntries(req.user.quizScores) : {}
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single day details
router.get('/:day', auth, async (req, res) => {
  try {
    await syncUserStatus(req.user);
    const dayNum = parseInt(req.params.day);
    const dayData = schedule.find(d => d.day === dayNum);
    if (!dayData) return res.status(404).json({ message: 'Day not found' });
    
    res.json({
      day: dayData,
      completed: req.user.completedDays.includes(dayNum),
      failed: req.user.failedDays.includes(dayNum)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Start Subject and Agreement
router.post('/start', auth, async (req, res) => {
  try {
    const { subject } = req.body;
    if (!subject) {
      return res.status(400).json({ message: 'Subject is required' });
    }

    if (subject !== 'CS Fundamentals') {
      return res.status(400).json({ message: `${subject} is currently in work!` });
    }

    const user = req.user;
    user.selectedSubject = 'CS Fundamentals';
    user.agreed = true;
    user.agreementDate = new Date();
    user.startDate = new Date();
    user.currentDay = 1;
    // Set 24 hour deadline
    user.dayDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.completedDays = [];
    user.failedDays = [];
    user.quizScores = new Map();

    await user.save();

    res.json({
      message: 'Journey started successfully!',
      user: formatUser(user)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark day as done / undo
router.post('/:day/toggle', auth, async (req, res) => {
  try {
    await syncUserStatus(req.user);
    const dayNum = parseInt(req.params.day);
    const user = req.user;
    
    const idx = user.completedDays.indexOf(dayNum);
    
    if (idx === -1) {
      // Enforce quiz score constraint
      const quizScore = user.quizScores.get(dayNum.toString());
      if (quizScore === undefined || quizScore < 8) {
        return res.status(400).json({
          message: `You must score at least 8/10 on the quiz for Day ${dayNum} to mark it as done! (Current: ${quizScore === undefined ? 'Not attempted' : quizScore + '/10'})`
        });
      }

      // Check if yesterday's day was failed and is required to catch up
      const yesterday = dayNum - 1;
      const yesterdayFailed = user.failedDays.includes(yesterday);
      if (yesterdayFailed) {
        const yesterdayScore = user.quizScores.get(yesterday.toString());
        if (yesterdayScore === undefined || yesterdayScore < 8) {
          return res.status(400).json({
            message: `Since you failed yesterday (Day ${yesterday}), you must also score at least 8/10 on the Day ${yesterday} quiz to complete today's task!`
          });
        }
        // Both quizzes are passed. Complete both!
        user.completedDays.push(dayNum);
        user.completedDays.push(yesterday);
        
        // Remove yesterday from failedDays
        user.failedDays = user.failedDays.filter(d => d !== yesterday);
      } else {
        user.completedDays.push(dayNum);
      }

      // Advance currentDay if user completed today's day (or caught up)
      if (dayNum === user.currentDay || yesterday === user.currentDay) {
        user.currentDay = Math.max(user.currentDay, dayNum + 1);
        // Extend deadline by a fresh 24 hours
        user.dayDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
    } else {
      // Undo completion
      user.completedDays.splice(idx, 1);
    }
    
    await user.save();
    res.json({
      completedDays: user.completedDays,
      failedDays: user.failedDays,
      currentDay: user.currentDay,
      dayDeadline: user.dayDeadline
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
