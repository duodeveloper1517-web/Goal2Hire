const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  completedDays: {
    type: [Number], // array of day numbers (1-90) that are completed
    default: []
  },
  cycle: {
    type: Number,
    default: 1 // which cycle (1 or 2)
  },
  selectedSubject: {
    type: String,
    default: null
  },
  agreed: {
    type: Boolean,
    default: false
  },
  agreementDate: {
    type: Date
  },
  currentDay: {
    type: Number,
    default: 1
  },
  dayDeadline: {
    type: Date
  },
  failedDays: {
    type: [Number],
    default: []
  },
  quizScores: {
    type: Map,
    of: Number,
    default: {}
  }
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
