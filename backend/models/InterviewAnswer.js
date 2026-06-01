const mongoose = require('mongoose');

const interviewAnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    topicId: {
      type: String,
      required: true,
    },
    topicTitle: {
      type: String,
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
    reportCount: {
      type: Number,
      default: 0,
    },
    lastReportContext: {
      type: String,
      default: null,
    },
    lastReportedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InterviewAnswer', interviewAnswerSchema);
