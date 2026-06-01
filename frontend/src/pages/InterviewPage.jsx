import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Simple markdown renderer — converts headers, bold, bullets, code blocks
function MarkdownRenderer({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={key++} className="iq-code-block">
          {lang && <span className="iq-code-lang">{lang}</span>}
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++;
      continue;
    }

    // H2
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key++} className="iq-md-h2">{line.slice(3)}</h2>
      );
      i++;
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key++} className="iq-md-h3">{line.slice(4)}</h3>
      );
      i++;
      continue;
    }

    // Bullet
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const bulletLines = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))
      ) {
        bulletLines.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(
        <ul key={key++} className="iq-md-ul">
          {bulletLines.map((b, bi) => (
            <li key={bi} dangerouslySetInnerHTML={{ __html: formatInline(b) }} />
          ))}
        </ul>
      );
      continue;
    }

    // Empty line → spacer
    if (line.trim() === '') {
      elements.push(<div key={key++} className="iq-md-spacer" />);
      i++;
      continue;
    }

    // Normal paragraph
    elements.push(
      <p
        key={key++}
        className="iq-md-p"
        dangerouslySetInnerHTML={{ __html: formatInline(line) }}
      />
    );
    i++;
  }

  return <div className="iq-markdown">{elements}</div>;
}

function formatInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="iq-inline-code">$1</code>');
}

export default function InterviewPage({ onBack }) {
  const { user, logout } = useAuth();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  // Answer state
  const [answer, setAnswer] = useState(null);
  const [answerLoading, setAnswerLoading] = useState(false);
  const [answerError, setAnswerError] = useState(null);
  const [reportCount, setReportCount] = useState(0);

  // Report form state
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportContext, setReportContext] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  // Cache in-memory so we don't re-fetch on re-open
  const [answerCache, setAnswerCache] = useState({});

  useEffect(() => {
    API.get('/interview/topics')
      .then(({ data }) => setTopics(data.topics))
      .catch(() => toast.error('Failed to load interview topics'))
      .finally(() => setLoading(false));
  }, []);

  const fetchAnswer = useCallback(
    async (question, topic) => {
      // Use in-memory cache if available
      if (answerCache[question.id]) {
        const cached = answerCache[question.id];
        setAnswer(cached.answer);
        setReportCount(cached.reportCount);
        setAnswerError(null);
        return;
      }

      setAnswerLoading(true);
      setAnswerError(null);
      setAnswer(null);
      setShowReportForm(false);
      setReportContext('');

      try {
        const { data } = await API.get(`/interview/answer/${question.id}`);
        setAnswer(data.answer);
        setReportCount(data.reportCount || 0);
        setAnswerCache((prev) => ({
          ...prev,
          [question.id]: { answer: data.answer, reportCount: data.reportCount || 0 },
        }));
      } catch (err) {
        setAnswerError(err.response?.data?.message || 'Failed to load answer');
      } finally {
        setAnswerLoading(false);
      }
    },
    [answerCache]
  );

  const handleQuestionClick = (question, topic) => {
    setSelectedQuestion(question);
    setAnswer(null);
    setShowReportForm(false);
    setReportContext('');
    fetchAnswer(question, topic);
  };

  const handleReport = async () => {
    if (!reportContext.trim()) {
      toast.error('Please describe the issue or provide correct context');
      return;
    }
    setReportLoading(true);
    try {
      const { data } = await API.post(`/interview/report/${selectedQuestion.id}`, {
        context: reportContext,
      });
      setAnswer(data.answer);
      setReportCount(data.reportCount);
      // Update cache
      setAnswerCache((prev) => ({
        ...prev,
        [selectedQuestion.id]: { answer: data.answer, reportCount: data.reportCount },
      }));
      setShowReportForm(false);
      setReportContext('');
      toast.success('✅ Answer corrected and updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to correct answer');
    } finally {
      setReportLoading(false);
    }
  };

  const handleBackToTopics = () => {
    setSelectedTopic(null);
    setSelectedQuestion(null);
    setAnswer(null);
    setShowReportForm(false);
    setReportContext('');
  };

  const handleBackToQuestions = () => {
    setSelectedQuestion(null);
    setAnswer(null);
    setShowReportForm(false);
    setReportContext('');
  };

  if (loading) {
    return (
      <div className="iq-loading-screen">
        <div className="loading-spinner-large" />
        <p>Loading Interview Questions...</p>
      </div>
    );
  }

  // If viewed standalone (from SubjectSelector), wrap in full page with navbar
  const isStandalone = !!onBack;

  return (
    <div className={isStandalone ? 'iq-page' : 'iq-container'}>
      {isStandalone && (
        <nav className="navbar">
          <div className="nav-left">
            <span className="nav-logo">⚡ Goal2Hire</span>
            <span className="nav-subtitle">🎯 Interview Questions</span>
          </div>
          <div className="nav-right">
            <span className="nav-user">👤 {user?.username}</span>
            <button className="btn-switch-path" onClick={onBack}>← Back to Paths</button>
            <button className="btn-logout" onClick={logout}>Logout</button>
          </div>
        </nav>
      )}
      <div className="iq-container">
      {/* Header */}
      <div className="iq-header">
        <div className="iq-header-left">
          {selectedTopic && (
            <button className="iq-back-btn" onClick={selectedQuestion ? handleBackToQuestions : handleBackToTopics}>
              ← {selectedQuestion ? 'Back to Questions' : 'Back to Topics'}
            </button>
          )}
          <div>
            <h1 className="iq-title">
              {selectedQuestion
                ? '💬 Answer'
                : selectedTopic
                ? `${selectedTopic.icon} ${selectedTopic.title}`
                : '🎯 Interview Questions'}
            </h1>
            <p className="iq-subtitle">
              {selectedQuestion
                ? selectedTopic?.title + ' — Interview Question'
                : selectedTopic
                ? selectedTopic.description
                : 'MERN Stack Fresher Level · 11 Topics · 110+ Questions'}
            </p>
          </div>
        </div>
        {selectedTopic && !selectedQuestion && (
          <div className="iq-topic-badge" style={{ background: selectedTopic.color + '22', borderColor: selectedTopic.color + '55', color: selectedTopic.color }}>
            {selectedTopic.questions.length} Questions
          </div>
        )}
      </div>

      {/* ── TOPIC GRID ── */}
      {!selectedTopic && (
        <AnimatePresence>
          <motion.div
            className="iq-topics-grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {topics.map((topic, idx) => (
              <motion.div
                key={topic.id}
                className={`iq-topic-card ${topic.isFocusArea ? 'focus-area' : ''}`}
                style={{ '--topic-color': topic.color }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => setSelectedTopic(topic)}
              >
                {topic.isFocusArea && (
                  <div className="iq-focus-badge">★ Focus Area</div>
                )}
                <div className="iq-topic-icon">{topic.icon}</div>
                <div className="iq-topic-name">{topic.title}</div>
                <div className="iq-topic-desc">{topic.description.replace('★ Focus Area — ', '')}</div>
                <div className="iq-topic-footer">
                  <span className="iq-q-count">{topic.questionCount} questions</span>
                  <span className="iq-topic-arrow">→</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── QUESTION LIST ── */}
      {selectedTopic && !selectedQuestion && (
        <AnimatePresence>
          <motion.div
            className="iq-questions-list"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {selectedTopic.questions.map((q, idx) => {
              const isCached = !!answerCache[q.id];
              return (
                <motion.div
                  key={q.id}
                  className={`iq-question-item ${isCached ? 'cached' : ''}`}
                  style={{ '--topic-color': selectedTopic.color }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => handleQuestionClick(q, selectedTopic)}
                >
                  <div className="iq-q-number" style={{ color: selectedTopic.color }}>
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div className="iq-q-text">{q.text}</div>
                  <div className="iq-q-actions">
                    {isCached && <span className="iq-cached-tag">✓ Cached</span>}
                    <span className="iq-q-arrow" style={{ color: selectedTopic.color }}>›</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── ANSWER PANEL ── */}
      {selectedQuestion && (
        <AnimatePresence>
          <motion.div
            className="iq-answer-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Question box */}
            <div className="iq-question-box" style={{ borderLeftColor: selectedTopic?.color }}>
              <div className="iq-question-label">Interview Question</div>
              <div className="iq-question-full">{selectedQuestion.text}</div>
            </div>

            {/* Loading state */}
            {answerLoading && (
              <div className="iq-answer-loading">
                <div className="iq-ai-pulse">
                  <span>🤖</span>
                </div>
                <p>Generating expert answer<span className="iq-dots">...</span></p>
                <p className="iq-loading-sub">Powered by Groq · llama-3.3-70b-versatile</p>
              </div>
            )}

            {/* Error state */}
            {answerError && !answerLoading && (
              <div className="iq-answer-error">
                <span>⚠️</span>
                <p>{answerError}</p>
                <button
                  className="iq-retry-btn"
                  onClick={() => fetchAnswer(selectedQuestion, selectedTopic)}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Answer content */}
            {answer && !answerLoading && (
              <>
                <div className="iq-answer-card">
                  <div className="iq-answer-header">
                    <div className="iq-answer-ai-badge">
                      <span>🤖</span> AI Expert Answer
                    </div>
                    {reportCount > 0 && (
                      <div className="iq-corrected-badge">
                        ✓ Corrected {reportCount} time{reportCount > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  <MarkdownRenderer content={answer} />
                </div>

                {/* Report Issue Section */}
                <div className="iq-report-section">
                  {!showReportForm ? (
                    <button
                      className="iq-report-btn"
                      onClick={() => setShowReportForm(true)}
                    >
                      ⚠️ Report an Issue / Suggest Correction
                    </button>
                  ) : (
                    <motion.div
                      className="iq-report-form"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="iq-report-form-header">
                        <span>⚠️ Report an Issue</span>
                        <button
                          className="iq-report-close"
                          onClick={() => { setShowReportForm(false); setReportContext(''); }}
                        >
                          ✕
                        </button>
                      </div>
                      <p className="iq-report-desc">
                        Describe what's incorrect or provide the correct information. The AI will regenerate a corrected answer using your context.
                      </p>
                      <textarea
                        className="iq-report-textarea"
                        placeholder="e.g., The explanation of closures is incorrect. A closure is... The example should show..."
                        value={reportContext}
                        onChange={(e) => setReportContext(e.target.value)}
                        rows={4}
                      />
                      <div className="iq-report-actions">
                        <button
                          className="iq-report-cancel"
                          onClick={() => { setShowReportForm(false); setReportContext(''); }}
                        >
                          Cancel
                        </button>
                        <button
                          className="iq-report-submit"
                          onClick={handleReport}
                          disabled={reportLoading || !reportContext.trim()}
                        >
                          {reportLoading ? (
                            <><div className="spinner" /> Regenerating...</>
                          ) : (
                            '🔄 Submit & Regenerate'
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      )}
      </div>
    </div>
  );
}
