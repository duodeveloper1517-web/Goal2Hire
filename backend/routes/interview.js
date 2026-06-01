const express = require('express');
const router = express.Router();
const axios = require('axios');
const auth = require('../middleware/auth');
const InterviewAnswer = require('../models/InterviewAnswer');
const interviewTopics = require('../data/interviewQuestions');

// Helper: build the Groq prompt for a given topic and question
function buildAnswerPrompt(topicTitle, question) {
  return `You are a world-class ${topicTitle} expert and a great teacher who explains things clearly to fresher-level developers preparing for interviews.

Answer the following interview question in this EXACT structure:

**Question:** ${question}

---

## 📖 Definition
Start with a **precise, formal definition** of the concept being asked. Write it as a textbook would — clear, accurate, and complete in 2-3 sentences.

## 🧠 Simple Explanation
Now explain the same concept **in very simple, easy-to-understand language** as if you're explaining it to a beginner. Use analogies or everyday comparisons where helpful. Keep it conversational and clear.

## 💡 Example
Provide a **practical, real-world code example** or scenario that clearly demonstrates the concept. Use proper code blocks with the language specified. Walk through what the code does step by step.

## ✅ Key Points to Remember
List **3-5 bullet points** that a fresher should definitely mention in an interview to impress the interviewer.

## 🔍 Common Follow-up Questions
List **2-3 follow-up questions** an interviewer typically asks after this question.

---
Be thorough but concise. Use markdown formatting exactly as shown above.`;
}

// Helper: call Groq API and return the generated answer text
async function fetchFromGroq(prompt) {
  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 1500,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data.choices[0]?.message?.content || '';
}

// ─────────────────────────────────────────────
// GET /api/interview/topics
// Returns all topics with questions (no answers)
// ─────────────────────────────────────────────
router.get('/topics', auth, (req, res) => {
  try {
    const topics = interviewTopics.map((t) => ({
      id: t.id,
      title: t.title,
      icon: t.icon,
      color: t.color,
      isFocusArea: t.isFocusArea,
      description: t.description,
      questionCount: t.questions.length,
      questions: t.questions.map((q) => ({ id: q.id, text: q.text })),
    }));
    res.json({ topics });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/interview/answer/:questionId
// Returns cached answer, or generates + caches it
// ─────────────────────────────────────────────
router.get('/answer/:questionId', auth, async (req, res) => {
  const { questionId } = req.params;

  try {
    // 1. Check DB cache first
    const cached = await InterviewAnswer.findOne({ questionId });
    if (cached) {
      return res.json({
        answer: cached.answer,
        fromCache: true,
        questionId: cached.questionId,
        reportCount: cached.reportCount,
      });
    }

    // 2. Find the question in our data
    let foundQuestion = null;
    let foundTopic = null;
    for (const topic of interviewTopics) {
      const q = topic.questions.find((q) => q.id === questionId);
      if (q) {
        foundQuestion = q;
        foundTopic = topic;
        break;
      }
    }

    if (!foundQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // 3. Generate answer via Groq
    const prompt = buildAnswerPrompt(foundTopic.title, foundQuestion.text);
    const answer = await fetchFromGroq(prompt);

    if (!answer) {
      return res.status(500).json({ message: 'Failed to generate answer from AI' });
    }

    // 4. Cache in DB
    const saved = await InterviewAnswer.create({
      questionId,
      topicId: foundTopic.id,
      topicTitle: foundTopic.title,
      question: foundQuestion.text,
      answer,
    });

    res.json({
      answer: saved.answer,
      fromCache: false,
      questionId: saved.questionId,
      reportCount: 0,
    });
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    console.error('Interview answer error:', errMsg);
    res.status(500).json({ message: 'Failed to get answer: ' + errMsg });
  }
});

// ─────────────────────────────────────────────
// POST /api/interview/report/:questionId
// User reports an issue and provides context.
// Regenerates and updates the cached answer.
// ─────────────────────────────────────────────
router.post('/report/:questionId', auth, async (req, res) => {
  const { questionId } = req.params;
  const { context } = req.body;

  if (!context || !context.trim()) {
    return res.status(400).json({ message: 'Please provide context about the issue.' });
  }

  try {
    // Find the question in our data
    let foundQuestion = null;
    let foundTopic = null;
    for (const topic of interviewTopics) {
      const q = topic.questions.find((q) => q.id === questionId);
      if (q) {
        foundQuestion = q;
        foundTopic = topic;
        break;
      }
    }

    if (!foundQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Build a correction prompt incorporating user's feedback
    const correctionPrompt = `You are now a world-class expert in ${foundTopic.title}. A user reported an issue with the previous AI-generated answer for this interview question and has provided the following correction context:

**Question:** ${foundQuestion.text}

**User's Correction Context / Issue:**
${context}

Please provide a corrected, accurate, and comprehensive answer in the following format:

## Direct Answer
Give a clear, concise direct answer in 2-3 sentences.

## Detailed Explanation
Explain the concept in depth using simple language for a fresher candidate. Address any misconceptions noted in the correction context.

## Real-World Example
Provide a practical code snippet or real-world scenario. Use proper code formatting with \`\`\` blocks.

## Key Points to Remember
List 3-5 bullet points that an interviewer would expect you to know.

## Common Follow-up Questions
List 2-3 follow-up questions an interviewer might ask.

Make sure this corrected answer fully addresses the issue raised by the user.`;

    const newAnswer = await fetchFromGroq(correctionPrompt);

    if (!newAnswer) {
      return res.status(500).json({ message: 'Failed to regenerate answer from AI' });
    }

    // Update or create the record
    const updated = await InterviewAnswer.findOneAndUpdate(
      { questionId },
      {
        answer: newAnswer,
        topicId: foundTopic.id,
        topicTitle: foundTopic.title,
        question: foundQuestion.text,
        $inc: { reportCount: 1 },
        lastReportContext: context,
        lastReportedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({
      answer: updated.answer,
      questionId: updated.questionId,
      reportCount: updated.reportCount,
      message: 'Answer corrected and updated successfully!',
    });
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    console.error('Interview report error:', errMsg);
    res.status(500).json({ message: 'Failed to regenerate answer: ' + errMsg });
  }
});

module.exports = router;
