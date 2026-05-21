const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const axios = require('axios');
const User = require('../models/User');

// Generate quiz
router.post('/generate', auth, async (req, res) => {
  const { topic, subtopics, day } = req.body;
  if (!topic) return res.status(400).json({ message: 'Topic is required' });

  const prompt = `You are a CS quiz generator. Generate a quiz with exactly 10 multiple choice questions about: "${topic}".
Subtopics covered: ${subtopics ? subtopics.join(', ') : topic}

Rules:
- Each question must have exactly 4 options.
- Questions should vary in difficulty (easy, medium, hard).
- Explanations should be concise but informative (1-2 sentences).

Respond ONLY with a valid JSON array (no markdown, no explanation, no code fences) in this exact format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Brief explanation of the correct answer"
  }
]
Where "correct" is the 0-based index of the correct option. Return ONLY the JSON array, nothing else.`;

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0]?.message?.content || '';
    // Strip markdown code fences if present
    const cleaned = content.replace(/```json|```/g, '').trim();
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Could not parse quiz JSON from:', content);
      return res.status(500).json({ message: 'Failed to parse quiz from AI response' });
    }

    const questions = JSON.parse(jsonMatch[0]);
    res.json({ questions, topic, day });
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    console.error('Groq API error:', errMsg);
    res.status(500).json({ message: 'Quiz generation failed: ' + errMsg });
  }
});

// Submit quiz score
router.post('/submit', auth, async (req, res) => {
  try {
    const { day, score } = req.body;
    if (day === undefined || score === undefined) {
      return res.status(400).json({ message: 'Day and score are required' });
    }

    const dayStr = day.toString();
    const user = req.user;
    
    // Initialize map if it doesn't exist
    if (!user.quizScores) {
      user.quizScores = new Map();
    }

    const existingScore = user.quizScores.get(dayStr) || 0;
    if (score > existingScore) {
      user.quizScores.set(dayStr, score);
      await user.save();
    }

    res.json({
      message: 'Score submitted successfully',
      quizScores: Object.fromEntries(user.quizScores)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
