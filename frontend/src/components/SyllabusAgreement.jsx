import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';

export default function SyllabusAgreement({ onSubmit }) {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isChecked, setIsChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    API.get('/schedule')
      .then(({ data }) => {
        // Just take the first cycle (days 1-45) as the core syllabus
        const baseSyllabus = data.schedule.filter(d => d.cycle === 1);
        setSchedule(baseSyllabus);
      })
      .catch(() => toast.error('Failed to load syllabus'))
      .finally(() => setLoading(false));
  }, []);

  const handleStart = async () => {
    if (!isChecked) {
      return toast.error('Please agree to the statement first');
    }
    setSubmitting(true);
    try {
      const { data } = await API.post('/schedule/start', { subject: 'CS Fundamentals' });
      toast.success('Your 90-Day Journey begins now! 🚀');
      onSubmit(data.user);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start journey');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="agreement-bg">
      <div className="agreement-card">
        <header className="agreement-header">
          <span className="badge">CS Fundamentals Syllabus</span>
          <h1>90-Day Journey Overview</h1>
          <p>Please review the core curriculum before committing to your daily activities.</p>
        </header>

        {loading ? (
          <div className="syllabus-loading">
            <div className="loading-spinner-large" />
            <p>Loading course syllabus...</p>
          </div>
        ) : (
          <div className="syllabus-list-container">
            <h3>📖 45 Core Modules (Repeated for Cycle 2 Deepening)</h3>
            <div className="syllabus-scroll-box">
              {schedule.map(item => (
                <div key={item.day} className="syllabus-item">
                  <div className="item-day-badge">Day {item.day}</div>
                  <div className="item-details">
                    <div className="item-topic">{item.topic}</div>
                    <div className="item-category">{item.category}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="agreement-form">
          <div className="agreement-checkbox-wrapper">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={e => setIsChecked(e.target.checked)}
              />
              <span className="checkmark" />
              <span className="agreement-text">
                I am start this task , I will daily perform my activities and surely work up to date if 
              </span>
            </label>
          </div>

          <button
            className={`btn-start-journey ${!isChecked || submitting ? 'disabled' : ''}`}
            disabled={!isChecked || submitting}
            onClick={handleStart}
          >
            {submitting ? 'Initializing Journey...' : 'Submit & Start Journey ⚡'}
          </button>
        </div>
      </div>
    </div>
  );
}
