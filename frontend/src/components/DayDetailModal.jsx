import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

const categoryColors = {
  'Computer Organization & Architecture': '#6366f1',
  'Memory Systems & Data Representation': '#8b5cf6',
  'Program Execution & Runtime': '#a855f7',
  'Operating Systems': '#ec4899',
  'Computer Networks': '#14b8a6',
  'Databases': '#f59e0b',
  'System Integration & Real-world Debugging': '#f97316'
};

export default function DayDetailModal({
  day,
  onClose,
  completedDays,
  failedDays = [],
  quizScores = {},
  onToggle,
  onScoreSubmit
}) {
  const [tab, setTab] = useState('resources');
  const [quiz, setQuiz] = useState(null);           // all 10 questions
  const [quizLoading, setQuizLoading] = useState(false);
  const [current, setCurrent] = useState(0);         // current question index
  const [selected, setSelected] = useState(null);    // selected option index
  const [revealed, setRevealed] = useState(false);   // show answer?
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const isCompleted = completedDays.includes(day.day);
  const catColor = categoryColors[day.category] || '#6366f1';

  const todayScore = quizScores?.[day.day.toString()];
  const yesterdayNum = day.day - 1;
  const yesterdayFailed = failedDays?.includes(yesterdayNum);
  const yesterdayScore = yesterdayFailed ? quizScores?.[yesterdayNum.toString()] : null;

  const canMarkComplete = isCompleted || (
    (todayScore !== undefined && todayScore >= 8) &&
    (!yesterdayFailed || (yesterdayScore !== undefined && yesterdayScore >= 8))
  );

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const generateQuiz = async () => {
    setQuizLoading(true);
    setQuiz(null);
    setCurrent(0);
    setSelected(null);
    setRevealed(false);
    setScore(0);
    setFinished(false);
    try {
      const { data } = await API.post('/quiz/generate', {
        topic: day.topic,
        subtopics: day.subtopics,
        day: day.day
      });
      setQuiz(data.questions);
      setTab('quiz');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Quiz generation failed');
    } finally {
      setQuizLoading(false);
    }
  };

  // User picks an option → immediately reveal correct/wrong + explanation
  const handleSelect = (optIdx) => {
    if (revealed) return;
    setSelected(optIdx);
    setRevealed(true);
    if (quiz && optIdx === quiz[current].correct) {
      setScore(s => s + 1);
    }
  };

  const handleNext = async () => {
    if (current + 1 >= quiz.length) {
      setFinished(true);
      try {
        await API.post('/quiz/submit', { day: day.day, score });
        if (onScoreSubmit) {
          onScoreSubmit(day.day, score);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to submit quiz score');
      }
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  const q = quiz ? quiz[current] : null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header" style={{ borderTop: `4px solid ${catColor}` }}>
          <div className="modal-day-badge" style={{ background: catColor }}>Day {day.day}</div>
          <h2 className="modal-title">{day.topic}</h2>
          <div className="modal-meta">
            <span className="modal-category" style={{ color: catColor }}>{day.category}</span>
            <span className="modal-cycle">Cycle {day.cycle}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <div className="modal-actions" style={{ marginTop: 0 }}>
              <button
                className={`btn-complete ${isCompleted ? 'completed' : ''}`}
                onClick={() => onToggle(day.day)}
                disabled={!canMarkComplete}
                title={
                  !canMarkComplete
                    ? yesterdayFailed && (yesterdayScore === undefined || yesterdayScore < 8)
                      ? `You must pass yesterday's quiz (Day ${yesterdayNum}) with a score >= 8 and today's quiz (Day ${day.day}) with a score >= 8 first.`
                      : `You must pass today's quiz (Day ${day.day}) with a score >= 8 first.`
                    : ''
                }
              >
                {isCompleted ? '✓ Completed' : 'Mark as Done'}
              </button>
              <button className="btn-close" onClick={onClose}>✕</button>
            </div>
            
            {!canMarkComplete && (
              <div className="quiz-requirement-alert" style={{
                fontSize: '0.8rem',
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ⚠️ <span>
                  {yesterdayFailed && (yesterdayScore === undefined || yesterdayScore < 8) ? (
                    <>
                      <strong>Score Requirement:</strong> You must score <strong>&ge; 8/10</strong> on <strong>both</strong> Day {yesterdayNum} (yesterday's failed task) and Day {day.day} quizzes.
                      <br />
                      Current: Day {yesterdayNum}: {yesterdayScore !== undefined ? `${yesterdayScore}/10` : 'Not attempted'}, Day {day.day}: {todayScore !== undefined ? `${todayScore}/10` : 'Not attempted'}
                    </>
                  ) : (
                    <>
                      <strong>Score Requirement:</strong> You must score <strong>&ge; 8/10</strong> on the Day {day.day} quiz to mark it done.
                      <br />
                      Current score: {todayScore !== undefined ? `${todayScore}/10` : 'Not attempted'}
                    </>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`modal-tab ${tab === 'resources' ? 'active' : ''}`}
            onClick={() => setTab('resources')}
          >
            📚 Resources
          </button>
          <button
            className={`modal-tab ${tab === 'quiz' ? 'active' : ''}`}
            onClick={() => setTab('quiz')}
          >
            🧠 Quiz {quiz && !finished ? `(${current + 1}/${quiz.length})` : ''}
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* ── RESOURCES TAB ── */}
          {tab === 'resources' && (
            <div className="resources-panel">
              <div className="subtopics-section">
                <h3>📌 Topics to Cover</h3>
                <ul className="subtopic-list">
                  {day.subtopics.map((s, i) => (
                    <li key={i}><span className="bullet" style={{ background: catColor }} />{s}</li>
                  ))}
                </ul>
              </div>
              <div className="resources-section">
                <h3>🔗 Learning Resources</h3>
                <div className="resource-links">
                  {day.resources.map((url, i) => {
                    const domain = new URL(url).hostname.replace('www.', '');
                    const emoji = domain.includes('youtube') ? '▶️' : domain.includes('geeksforgeeks') ? '🟢' : '🌐';
                    return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="resource-link">
                        <span>{emoji}</span>
                        <span>{domain}</span>
                        <span className="link-arrow">↗</span>
                      </a>
                    );
                  })}
                </div>
                <button className="btn-quiz-gen" onClick={generateQuiz} disabled={quizLoading}>
                  {quizLoading
                    ? <><span className="spinner-sm" /> Generating Quiz...</>
                    : '🧠 Take a 10-Question Quiz'}
                </button>
              </div>
            </div>
          )}

          {/* ── QUIZ TAB ── */}
          {tab === 'quiz' && (
            <div className="quiz-panel">

              {/* Quiz overview / previous score status */}
              {!quiz && !quizLoading && (
                <div className="quiz-overview" style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🧠</div>
                  {todayScore !== undefined ? (
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text)' }}>Previous Best Score</h3>
                      <div className={`final-score-ring ${todayScore >= 8 ? 'excellent' : todayScore >= 6 ? 'good' : 'try-again'}`} style={{ margin: '0 auto 16px' }}>
                        <span className="final-score-num">{todayScore}</span>
                        <span className="final-score-denom">/10</span>
                      </div>
                      <p style={{
                        color: todayScore >= 8 ? 'var(--green)' : '#ef4444',
                        fontWeight: '600',
                        fontSize: '0.95rem'
                      }}>
                        {todayScore >= 8 ? '✅ Passed! (Score is >= 8)' : '❌ Not Passed (Requires >= 8)'}
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>
                        {todayScore >= 8 
                          ? 'You can now mark this day as completed.' 
                          : 'You must retake and score at least 8/10 to mark this day as completed.'}
                      </p>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text)' }}>Quiz Not Attempted</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '300px', margin: '0 auto' }}>
                        You must complete the quiz and score at least <strong>8/10</strong> to mark Day {day.day} as completed.
                      </p>
                    </div>
                  )}
                  
                  <button className="btn-quiz-gen" onClick={generateQuiz} style={{ maxWidth: '280px', margin: '0 auto' }}>
                    {todayScore !== undefined ? '🔄 Retake Quiz' : '🚀 Start Quiz'}
                  </button>
                </div>
              )}

              {/* Loading state */}
              {quizLoading && (
                <div className="quiz-loading">
                  <div className="loading-brain">🧠</div>
                  <p>Generating 10 questions with AI...</p>
                </div>
              )}

              {/* Finished screen */}
              {!quizLoading && finished && quiz && (
                <div className="quiz-finished">
                  <div className={`final-score-ring ${score >= 8 ? 'excellent' : score >= 6 ? 'good' : 'try-again'}`}>
                    <span className="final-score-num">{score}</span>
                    <span className="final-score-denom">/{quiz.length}</span>
                  </div>
                  <div className="final-msg">
                    {score === quiz.length ? '🏆 Perfect Score!' : score >= 8 ? '🌟 Excellent!' : score >= 6 ? '👍 Good Job!' : '📖 Keep Studying!'}
                  </div>
                  <div className="final-sub">{score >= 6 ? 'Great understanding of the topic!' : 'Review the resources and try again.'}</div>
                  <button className="btn-retake" onClick={generateQuiz}>🔄 New Quiz</button>
                </div>
              )}

              {/* One question at a time */}
              {!quizLoading && !finished && q && (
                <>
                  {/* Progress bar */}
                  <div className="quiz-progress-bar">
                    <div
                      className="quiz-progress-fill"
                      style={{ width: `${((current) / quiz.length) * 100}%` }}
                    />
                  </div>
                  <div className="quiz-progress-label">
                    <span>Question {current + 1} of {quiz.length}</span>
                    <span>Score: {score}/{current + (revealed ? 1 : 0)}</span>
                  </div>

                  {/* Question card */}
                  <div className="quiz-question-card">
                    <p className="q-text">
                      <span className="q-num">Q{current + 1}.</span> {q.question}
                    </p>

                    <div className="q-options">
                      {q.options.map((opt, oi) => {
                        let cls = 'q-option';
                        if (revealed) {
                          if (oi === q.correct) cls += ' correct';
                          else if (selected === oi) cls += ' wrong';
                          else cls += ' dimmed';
                        } else if (selected === oi) {
                          cls += ' selected';
                        }
                        return (
                          <button
                            key={oi}
                            className={cls}
                            onClick={() => handleSelect(oi)}
                            disabled={revealed}
                          >
                            <span className="opt-letter">{String.fromCharCode(65 + oi)}</span>
                            {opt}
                            {revealed && oi === q.correct && <span className="opt-tick">✓</span>}
                            {revealed && selected === oi && oi !== q.correct && <span className="opt-cross">✗</span>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Instant explanation */}
                    {revealed && (
                      <div className={`instant-explanation ${selected === q.correct ? 'correct-exp' : 'wrong-exp'}`}>
                        <span className="exp-icon">{selected === q.correct ? '✅' : '❌'}</span>
                        <div>
                          <div className="exp-verdict">
                            {selected === q.correct ? 'Correct!' : `Wrong — correct answer: ${q.options[q.correct]}`}
                          </div>
                          <div className="exp-text">💡 {q.explanation}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Next button (only after answering) */}
                  {revealed && (
                    <button className="btn-next" onClick={handleNext}>
                      {current + 1 === quiz.length ? 'See Results 🏁' : 'Next Question →'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
