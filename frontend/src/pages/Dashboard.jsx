/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import DayDetailModal from '../components/DayDetailModal';
import ProjectIcon from '../components/ProjectIcon';
import slogansData from '../data/slogans.json';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const categoryColors = {
  'Computer Organization & Architecture': '#6366f1',
  'Memory Systems & Data Representation': '#8b5cf6',
  'Program Execution & Runtime': '#a855f7',
  'Operating Systems': '#ec4899',
  'Computer Networks': '#14b8a6',
  'Databases': '#f59e0b',
  'System Integration & Real-world Debugging': '#f97316'
};

const FILTERS = ['All', 'Cycle 1', 'Cycle 2', 'Completed', 'Pending', "Today's Target"];

export default function Dashboard({ onBackToSubjects }) {
  const { user, logout, updateUser } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [completedDays, setCompletedDays] = useState([]);
  const [failedDays, setFailedDays] = useState([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [dayDeadline, setDayDeadline] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [slogan, setSlogan] = useState('');
  const [countdownText, setCountdownText] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  const todayDate = new Date();
  const [calendarYear, setCalendarYear] = useState(todayDate.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(todayDate.getMonth());

  // Center calendar on start date if available
  useEffect(() => {
    if (user?.startDate) {
      const start = new Date(user.startDate);
      setCalendarYear(start.getFullYear());
      setCalendarMonth(start.getMonth());
    }
  }, [user?.startDate]);

  // Fetch initial schedule & sync user day status
  useEffect(() => {
    API.get('/schedule')
      .then(({ data }) => {
        setSchedule(data.schedule);
        setCompletedDays(data.completedDays || []);
        setFailedDays(data.failedDays || []);
        setCurrentDay(data.currentDay || 1);
        setDayDeadline(data.dayDeadline);
        updateUser({
          completedDays: data.completedDays,
          failedDays: data.failedDays,
          currentDay: data.currentDay,
          dayDeadline: data.dayDeadline,
          quizScores: data.quizScores
        });
      })
      .catch(() => toast.error('Failed to load schedule'))
      .finally(() => setLoading(false));
  }, [updateUser]);

  // Update motivational slogan based on status
  useEffect(() => {
    if (completedDays.length === 0 && failedDays.length === 0) {
      setSlogan(slogansData.doing_task[0]);
      return;
    }

    let status = 'doing_task';
    const streak = (() => {
      let count = 0;
      let checkDay = currentDay - 1;
      while (checkDay > 0 && completedDays.includes(checkDay)) {
        count++;
        checkDay--;
      }
      return count;
    })();

    if (failedDays.length > 0) {
      status = 'failed';
    } else if (completedDays.includes(currentDay)) {
      status = 'completed';
    } else if (streak >= 2) {
      status = 'streak';
    }

    const list = slogansData[status] || slogansData.doing_task;
    const random = list[Math.floor(Math.random() * list.length)];
    setSlogan(random);
  }, [completedDays, failedDays, currentDay]);

  // Live countdown timer and 30-min alert check
  useEffect(() => {
    if (!dayDeadline) return;

    const updateTimer = () => {
      const diff = new Date(dayDeadline) - Date.now();
      if (diff <= 0) {
        setCountdownText('Expired');
        setIsUrgent(false);
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdownText(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      
      const urgent = diff > 0 && diff < 3 * 60 * 60 * 1000;
      setIsUrgent(urgent);
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);

    // Continuous alert check for < 3 hours remaining
    const alertInterval = setInterval(() => {
      if (completedDays.includes(currentDay)) return;
      const diff = new Date(dayDeadline) - Date.now();
      const threeHours = 3 * 60 * 60 * 1000;
      
      if (diff > 0 && diff < threeHours) {
        const lastAlert = localStorage.getItem('lastUrgentAlertTime');
        const now = Date.now();
        if (!lastAlert || now - parseInt(lastAlert) >= 30 * 60 * 1000) {
          toast.error(
            "⚠️ URGENT ALERT: Less than 3 hours remaining to complete today's task! Do it now before you fail!",
            { duration: 6000 }
          );
          localStorage.setItem('lastUrgentAlertTime', now.toString());
        }
      }
    }, 10000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(alertInterval);
    };
  }, [dayDeadline, completedDays, currentDay]);

  // Handle Mark Done / Undo Toggle
  const handleToggle = async (dayNum) => {
    try {
      const { data } = await API.post(`/schedule/${dayNum}/toggle`);
      setCompletedDays(data.completedDays);
      setFailedDays(data.failedDays);
      setCurrentDay(data.currentDay);
      setDayDeadline(data.dayDeadline);
      
      updateUser({
        completedDays: data.completedDays,
        failedDays: data.failedDays,
        currentDay: data.currentDay,
        dayDeadline: data.dayDeadline
      });

      const isNowDone = data.completedDays.includes(dayNum);
      toast.success(isNowDone ? '✅ Day marked complete!' : '↩️ Marked as incomplete');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update progress');
    }
  };

  const handleScoreSubmit = (dayNum, score) => {
    if (!user) return;
    const updatedScores = { ...(user.quizScores || {}), [dayNum.toString()]: score };
    updateUser({ quizScores: updatedScores });
  };

  const handlePrevMonth = () => {
    setCalendarMonth(prev => {
      if (prev === 0) {
        setCalendarYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCalendarMonth(prev => {
      if (prev === 11) {
        setCalendarYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const getProgramDayForDate = useCallback((date) => {
    if (!user?.startDate) return null;
    const start = new Date(user.startDate);
    const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const targetMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffTime = targetMidnight.getTime() - startMidnight.getTime();
    const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000));
    const dayNum = diffDays + 1;
    return (dayNum >= 1 && dayNum <= 90) ? dayNum : null;
  }, [user]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDayIndex = getFirstDayOfMonth(calendarYear, calendarMonth);

  const calendarCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ isPadding: true, key: `pad-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(calendarYear, calendarMonth, day);
    const dayNum = getProgramDayForDate(date);
    
    let status = 'none';
    let isLocked = false;
    
    if (dayNum !== null) {
      if (completedDays.includes(dayNum)) {
        status = 'completed';
      } else if (failedDays.includes(dayNum)) {
        status = 'failed';
      } else if (dayNum <= currentDay) {
        status = 'pending';
      } else {
        status = 'locked';
        isLocked = true;
      }
    }
    
    calendarCells.push({
      isPadding: false,
      day,
      date,
      dayNum,
      status,
      isLocked,
      key: `day-${day}`
    });
  }

  // Determine avatar icon state
  const getAvatarState = () => {
    if (failedDays.length > 0) return 'sad';
    if (!completedDays.includes(currentDay) && dayDeadline && isUrgent) {
      return 'angry';
    }
    return 'smile';
  };

  const avatarState = getAvatarState();

  // Filtered schedule for main grid
  const filteredSchedule = schedule.filter(d => {
    if (filter === 'Cycle 1') return d.cycle === 1;
    if (filter === 'Cycle 2') return d.cycle === 2;
    if (filter === 'Completed') return completedDays.includes(d.day);
    if (filter === 'Pending') return !completedDays.includes(d.day);
    if (filter === "Today's Target") return d.day === currentDay;
    return true;
  });

  const progress = schedule.length ? Math.round((completedDays.length / 90) * 100) : 0;
  const isTodayCompleted = completedDays.includes(currentDay);

  // Yesterday task failed check
  const yesterday = currentDay - 1;
  const yesterdayFailed = yesterday > 0 && failedDays.includes(yesterday) && !completedDays.includes(yesterday);

  return (
    <div className="dashboard">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-left">
          <ProjectIcon state={avatarState} size={42} />
          <span className="nav-logo" style={{ marginLeft: '8px' }}>⚡ Goal2Hire</span>
          <span className="nav-subtitle">90-Day Journey</span>
        </div>
        <div className="nav-right">
          <div className="nav-progress-mini">
            <span>{completedDays.length}/90 days</span>
            <div className="mini-bar"><div style={{ width: `${progress}%` }} /></div>
          </div>
          <span className="nav-user">👤 {user?.username}</span>
          <button className="btn-switch-path" onClick={onBackToSubjects}>Switch Path</button>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
      </nav>

      {/* Slogan motivates user */}
      {slogan && (
        <motion.div
          key={slogan}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 80, damping: 15 }}
          className="slogan-card"
        >
          <span className="slogan-sparkle">
            {avatarState === 'smile' ? '🎉' : avatarState === 'angry' ? '⚡' : '🌱'}
          </span>
          <div className="slogan-content">
            <h4>Daily Motivation</h4>
            <p className="slogan-text">{slogan}</p>
          </div>
        </motion.div>
      )}

      {/* Urgent Alert Banner (if < 3 hours remaining and not done) */}
      {!isTodayCompleted && dayDeadline && isUrgent && (
        <div className="countdown-banner">
          <div className="countdown-left">
            <span>⏰ Warning: Today's deadline is approaching! Complete quiz with ≥ 8/10 to mark done.</span>
          </div>
          <div className="countdown-time">
            Time Left: {countdownText}
          </div>
        </div>
      )}

      {/* Carry-over Failed Days Banner */}
      {yesterdayFailed && (
        <div className="catch-up-banner">
          <div className="catch-up-header">
            <span>⚠️ Carry-Over Catch-Up Mode Active</span>
          </div>
          <p className="catch-up-desc">
            You missed yesterday's deadline! In order to complete today's task (Day {currentDay}), you must study and complete the quiz with score ≥ 8/10 for BOTH <strong>Day {yesterday} (Yesterday)</strong> and <strong>Day {currentDay} (Today)</strong>. Both days will be marked complete upon submit.
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="hero-stats">
        <div className="stat-card">
          <div className="stat-number">{completedDays.length}</div>
          <div className="stat-label">Days Complete</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-number">Day {currentDay}</div>
          <div className="stat-label">Today's Target</div>
          {schedule.find(d => d.day === currentDay) && (
            <div className="stat-topic" onClick={() => setSelectedDay(schedule.find(d => d.day === currentDay))}>
              {schedule.find(d => d.day === currentDay)?.topic}
            </div>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-number">{failedDays.length}</div>
          <div className="stat-label">Days Failed</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{progress}%</div>
          <div className="stat-label">Overall Progress</div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="progress-section">
        <div className="progress-label">
          <span>Journey Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Main dashboard content & Calendar Sidebar */}
      <div className="dashboard-container">
        
        {/* Left Column: Task Grid */}
        <div className="dashboard-main">
          <div className="filter-section" style={{ paddingLeft: 0, paddingRight: 0 }}>
            {FILTERS.map(f => (
              <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
            <span className="filter-count">{filteredSchedule.length} days</span>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner-large" />
              <p>Loading your schedule...</p>
            </div>
          ) : (
            <div className="schedule-grid" style={{ paddingLeft: 0, paddingRight: 0 }}>
              {filteredSchedule.map(day => {
                const isCompleted = completedDays.includes(day.day);
                const isFailed = failedDays.includes(day.day);
                const isToday = day.day === currentDay;
                const catColor = categoryColors[day.category] || '#6366f1';
                
                // Unlocked condition: <= currentDay OR already completed or failed
                const isUnlocked = day.day <= currentDay || isCompleted || isFailed;
                const isLocked = !isUnlocked;

                return (
                  <div
                    key={day.day}
                    className={`day-card ${isCompleted ? 'done' : ''} ${isFailed ? 'failed-card' : ''} ${isToday ? 'today' : ''} ${isLocked ? 'locked' : ''}`}
                    onClick={() => !isLocked && setSelectedDay(day)}
                    style={{ 
                      '--cat-color': isLocked ? '#444' : catColor,
                      borderLeft: isFailed ? '3px solid #ef4444' : `3px solid ${isLocked ? '#444' : catColor}`
                    }}
                    title={isLocked ? `This day is locked until you progress to Day ${day.day}` : ''}
                  >
                    {isLocked ? (
                      <>
                        <div className="lock-icon">🔒</div>
                        <div className="day-number">Day {day.day}</div>
                        <div className="day-cycle">Cycle {day.cycle} · Day {day.cycleDay}</div>
                        <div className="day-topic locked-text">{day.topic}</div>
                        <div className="locked-hint">Locked</div>
                      </>
                    ) : (
                      <>
                        {isToday && <div className="today-badge">ACTIVE</div>}
                        {isCompleted && <div className="done-badge">✓</div>}
                        {isFailed && <div className="done-badge" style={{ background: '#ef4444' }}>✗</div>}
                        <div className="day-number">Day {day.day}</div>
                        <div className="day-cycle">Cycle {day.cycle} · Day {day.cycleDay}</div>
                        <div className="day-topic">{day.topic}</div>
                        <div className="day-category" style={{ color: isFailed ? '#ef4444' : catColor }}>{day.category}</div>
                        
                        <div className="day-card-footer">
                          <span className="subtopic-count">{day.subtopics.length} subtopics</span>
                          <button
                            className={`card-toggle ${isCompleted ? 'undo' : 'mark'}`}
                            onClick={e => { 
                              e.stopPropagation(); 
                              if (isCompleted) {
                                handleToggle(day.day);
                              } else {
                                setSelectedDay(day); 
                              }
                            }}
                          >
                            {isCompleted ? 'Undo' : 'Study & Quiz'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Real-Time Calendar */}
        <aside className="dashboard-sidebar">
          <div className="calendar-sidebar-card">
            <div className="calendar-title-wrapper" style={{ marginBottom: '12px' }}>
              <h3>📅 Real-Time Calendar</h3>
              <p className="calendar-subtitle">Mapping your 90-day Goal2Hire journey to the calendar.</p>
            </div>
            
            <div className="calendar-month-nav">
              <button onClick={handlePrevMonth}>&lt;</button>
              <span>{monthNames[calendarMonth]} {calendarYear}</span>
              <button onClick={handleNextMonth}>&gt;</button>
            </div>

            <div className="calendar-weekdays">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            <div className="calendar-grid">
              {calendarCells.map((cell) => {
                if (cell.isPadding) {
                  return <div key={cell.key} className="calendar-cell padding" />;
                }

                let cellClass = 'calendar-cell';
                let title = `${monthNames[calendarMonth]} ${cell.day}, ${calendarYear}`;
                
                if (cell.dayNum !== null) {
                  title += ` (Day ${cell.dayNum}): `;
                  if (cell.status === 'completed') {
                    cellClass += ' completed';
                    title += 'Completed';
                  } else if (cell.status === 'failed') {
                    cellClass += ' failed';
                    title += 'Missed / Failed';
                  } else if (cell.status === 'pending') {
                    cellClass += ' current';
                    title += 'Pending (Active Target)';
                  } else if (cell.status === 'locked') {
                    cellClass += ' locked';
                    title += 'Locked';
                  }
                } else {
                  cellClass += ' neutral';
                }

                const isClickable = cell.dayNum !== null && !cell.isLocked;

                return (
                  <div
                    key={cell.key}
                    className={cellClass}
                    onClick={() => isClickable && handleCalendarCellClick(cell.dayNum)}
                    title={title}
                  >
                    {cell.day}
                  </div>
                );
              })}
            </div>

            <div className="calendar-legend">
              <div className="legend-item">
                <div className="legend-color green" />
                <span>Completed</span>
              </div>
              <div className="legend-item">
                <div className="legend-color yellow" />
                <span>Pending Target</span>
              </div>
              <div className="legend-item">
                <div className="legend-color red" />
                <span>Missed / Failed</span>
              </div>
              <div className="legend-item">
                <div className="legend-color gray" />
                <span>Locked / Neutral</span>
              </div>
            </div>
          </div>
        </aside>

      </div>

      {selectedDay && (
        <DayDetailModal
          day={selectedDay}
          completedDays={completedDays}
          failedDays={failedDays}
          currentDay={currentDay}
          quizScores={user?.quizScores || {}}
          onToggle={handleToggle}
          onScoreSubmit={handleScoreSubmit}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );

  function handleCalendarCellClick(dayNum) {
    const found = schedule.find(d => d.day === dayNum);
    if (found) {
      setSelectedDay(found);
    }
  }
}
