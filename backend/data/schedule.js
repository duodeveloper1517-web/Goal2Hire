const fs = require('fs');
const path = require('path');

const scheduleJsonPath = path.join(__dirname, 'schedule.json');
const baseDays = JSON.parse(fs.readFileSync(scheduleJsonPath, 'utf8'));

// Generate 90-day schedule (cycle 1: days 1-45, cycle 2: days 46-90)
const schedule = [];
for (let cycle = 0; cycle < 2; cycle++) {
  baseDays.forEach((d) => {
    schedule.push({
      ...d,
      day: d.day + cycle * 45,
      cycleDay: d.day,
      cycle: cycle + 1
    });
  });
}

module.exports = { schedule, baseDays };
