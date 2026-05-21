const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const API_URL = 'http://localhost:5000/api';
const username = 'testuser_' + Math.random().toString(36).substring(7);
const password = 'password123';

async function runTests() {
  console.log(`Starting flow validation for user: ${username}`);
  
  // Connect to DB for direct manipulation
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB for direct database test assertions.');

  let token = '';
  const client = axios.create({
    baseURL: API_URL,
    validateStatus: () => true // Don't throw on non-2xx statuses
  });

  // 1. Register User
  console.log('\n--- 1. Registering User ---');
  let res = await client.post('/auth/register', { username, password });
  console.log('Status:', res.status);
  if (res.status !== 201) {
    console.error('Failed to register:', res.data);
    process.exit(1);
  }
  token = res.data.token;
  client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  console.log('User registered successfully. Token received.');

  // 2. Fetch profile to check initial state
  console.log('\n--- 2. Checking Initial State ---');
  res = await client.get('/auth/me');
  console.log('Status:', res.status);
  console.log('selectedSubject:', res.data.user.selectedSubject);
  console.log('agreed:', res.data.user.agreed);

  // 3. Select Subject & Accept Agreement
  console.log('\n--- 3. Selecting Subject & Accepting Agreement ---');
  res = await client.post('/schedule/start', { subject: 'CS Fundamentals' });
  console.log('Status:', res.status);
  console.log('User currentDay:', res.data.user.currentDay);
  console.log('User dayDeadline:', res.data.user.dayDeadline);

  // 4. Try to Mark Completed without quiz score
  console.log('\n--- 4. Toggle Day 1 (No Quiz Score) ---');
  res = await client.post('/schedule/1/toggle');
  console.log('Status:', res.status);
  if (res.status !== 400) {
    console.error('Validation failed: expected 400 Bad Request');
    process.exit(1);
  }

  // 5. Submit Low Quiz Score (5/10)
  console.log('\n--- 5. Submit Low Quiz Score (5/10) ---');
  res = await client.post('/quiz/submit', { day: 1, score: 5 });
  console.log('Status:', res.status);

  // 6. Try to Mark Completed with Low Quiz Score
  console.log('\n--- 6. Toggle Day 1 (Low Score) ---');
  res = await client.post('/schedule/1/toggle');
  console.log('Status:', res.status);
  if (res.status !== 400) {
    console.error('Validation failed: expected 400 Request');
    process.exit(1);
  }

  // 7. Submit Passing Quiz Score (9/10)
  console.log('\n--- 7. Submit Passing Quiz Score (9/10) ---');
  res = await client.post('/quiz/submit', { day: 1, score: 9 });
  console.log('Status:', res.status);

  // 8. Toggle Day 1 (Passing Score)
  console.log('\n--- 8. Toggle Day 1 (Passing Score) ---');
  res = await client.post('/schedule/1/toggle');
  console.log('Status:', res.status);
  console.log('completedDays:', res.data.completedDays);
  console.log('currentDay:', res.data.currentDay);
  console.log('dayDeadline:', res.data.dayDeadline);
  if (res.status !== 200) {
    console.error('Toggle failed: expected 200 OK');
    process.exit(1);
  }

  // 9. Simulate Expiry of Day 2
  console.log('\n--- 9. Simulating Expiry of Day 2 ---');
  // Directly update user record in DB to make Day 2 expire
  const dbUser = await User.findOne({ username });
  dbUser.dayDeadline = new Date(Date.now() - 3600 * 1000); // 1 hour ago
  await dbUser.save();
  console.log('Updated user in DB: set dayDeadline to 1 hour in the past to trigger expiry.');

  // Trigger sync via schedule API GET request
  res = await client.get('/schedule');
  console.log('Triggered /schedule GET request.');
  console.log('Status:', res.status);
  console.log('After expiry - currentDay:', res.data.currentDay);
  console.log('After expiry - failedDays:', res.data.failedDays);
  console.log('After expiry - completedDays:', res.data.completedDays);
  if (!res.data.failedDays.includes(2)) {
    console.error('Failed Days does not include Day 2 after expiry!');
    process.exit(1);
  }
  if (res.data.currentDay !== 3) {
    console.error('Expected currentDay to advance to 3!');
    process.exit(1);
  }

  // 10. Test Yesterday Carry-Over Catch-Up: Try to toggle Day 3 without Day 3 and Day 2 passed
  console.log('\n--- 10. Toggle Day 3 (Carry-over, no scores passed) ---');
  res = await client.post('/schedule/3/toggle');
  console.log('Status:', res.status);
  console.log('Response Message:', res.data.message);
  if (res.status !== 400) {
    console.error('Expected 400 Bad Request');
    process.exit(1);
  }

  // 11. Submit Day 3 passing score, but leave Day 2 quiz unpassed
  console.log('\n--- 11. Submit Day 3 Quiz Score (9/10), leave Day 2 unpassed ---');
  res = await client.post('/quiz/submit', { day: 3, score: 9 });
  console.log('Status:', res.status);

  console.log('\n--- 12. Toggle Day 3 (Yesterday still unpassed) ---');
  res = await client.post('/schedule/3/toggle');
  console.log('Status:', res.status);
  console.log('Response Message:', res.data.message);
  if (res.status !== 400) {
    console.error('Expected 400 Bad Request');
    process.exit(1);
  }

  // 13. Submit Day 2 passing score (9/10)
  console.log('\n--- 13. Submit Day 2 Quiz Score (9/10) ---');
  res = await client.post('/quiz/submit', { day: 2, score: 9 });
  console.log('Status:', res.status);

  // 14. Toggle Day 3 (Both quizzes passed - Catch-up should trigger)
  console.log('\n--- 14. Toggle Day 3 (Both quizzes passed - Catch-up) ---');
  res = await client.post('/schedule/3/toggle');
  console.log('Status:', res.status);
  console.log('completedDays:', res.data.completedDays);
  console.log('failedDays:', res.data.failedDays);
  console.log('currentDay:', res.data.currentDay);
  if (res.status !== 200) {
    console.error('Toggle failed: expected 200 OK');
    process.exit(1);
  }
  if (res.data.failedDays.includes(2)) {
    console.error('Failed Days should not contain Day 2 anymore after catch-up!');
    process.exit(1);
  }
  if (!res.data.completedDays.includes(2) || !res.data.completedDays.includes(3)) {
    console.error('Expected both Day 2 and Day 3 to be marked completed!');
    process.exit(1);
  }
  if (res.data.currentDay !== 4) {
    console.error('Expected currentDay to advance to 4!');
    process.exit(1);
  }

  console.log('\n======================================');
  console.log('  ALL BACKEND INTEGRATION TESTS PASSED! ');
  console.log('======================================');

  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test run error:', err);
  mongoose.disconnect();
  process.exit(1);
});
