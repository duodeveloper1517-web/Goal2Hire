const syncUserStatus = async (user) => {
  if (!user.agreed || !user.dayDeadline) return false;

  let changed = false;
  const now = new Date();

  // Keep checking if the current day deadline has passed
  while (now > new Date(user.dayDeadline)) {
    const missedDay = user.currentDay;

    // If the missed day is not already completed, mark it as failed
    if (!user.completedDays.includes(missedDay) && !user.failedDays.includes(missedDay)) {
      user.failedDays.push(missedDay);
      changed = true;
    }

    // Move currentDay to next
    user.currentDay += 1;
    // Advance deadline by 24 hours
    user.dayDeadline = new Date(new Date(user.dayDeadline).getTime() + 24 * 60 * 60 * 1000);
    changed = true;
  }

  if (changed) {
    await user.save();
  }
  return changed;
};

const formatUser = (user) => ({
  id: user._id,
  username: user.username,
  startDate: user.startDate,
  completedDays: user.completedDays,
  failedDays: user.failedDays || [],
  currentDay: user.currentDay || 1,
  dayDeadline: user.dayDeadline,
  agreed: user.agreed || false,
  agreementDate: user.agreementDate,
  selectedSubject: user.selectedSubject || null,
  quizScores: user.quizScores ? Object.fromEntries(user.quizScores) : {}
});

module.exports = { syncUserStatus, formatUser };
