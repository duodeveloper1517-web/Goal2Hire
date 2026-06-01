export default function SubjectSelector({ onSelect }) {
  const subjects = [
    {
      name: 'CS Fundamentals',
      desc: 'Master Operating Systems, Computer Networks, Databases, Computer Architecture, and execution runtimes in 90 days.',
      icon: '⚡',
      enabled: true,
      tag: 'Ready',
      badge: null,
      accentColor: '#6366f1',
    },
    {
      name: 'Interview Questions',
      desc: 'Ace your MERN Stack interview with 110+ topic-wise questions. AI-powered answers with examples, cached for instant access.',
      icon: '🎯',
      enabled: true,
      tag: 'New',
      badge: 'NEW',
      accentColor: '#10b981',
    },
    {
      name: 'DSA (Data Structures & Algorithms)',
      desc: 'Master Arrays, Linked Lists, Trees, Graphs, Dynamic Programming, and advanced problem-solving techniques.',
      icon: '🌲',
      enabled: false,
      tag: 'In Work',
      badge: 'IN WORK',
      accentColor: '#f59e0b',
    },
    {
      name: 'Aptitude & Reasoning',
      desc: 'Prepare for quantitative aptitude, logical reasoning, and data interpretation for technical interviews.',
      icon: '🧩',
      enabled: false,
      tag: 'In Work',
      badge: 'IN WORK',
      accentColor: '#f59e0b',
    },
  ];

  return (
    <div className="selector-bg">
      <div className="selector-container">
        <header className="selector-header">
          <h1 className="selector-title">Select Your Learning Path</h1>
          <p className="selector-subtitle">Embark on a structured journey to master core computer science and engineering topics.</p>
        </header>

        <div className="subject-grid">
          {subjects.map((sub, i) => (
            <div
              key={i}
              className={`subject-card ${!sub.enabled ? 'disabled' : 'active'}`}
              style={{ '--card-accent': sub.accentColor }}
              onClick={() => sub.enabled && onSelect(sub.name)}
            >
              {sub.badge && !sub.enabled && (
                <div className="overlay-badge">
                  <span>{sub.badge}</span>
                </div>
              )}
              {sub.badge && sub.enabled && sub.badge === 'NEW' && (
                <div className="new-badge">✦ NEW</div>
              )}
              <div className="subject-icon">{sub.icon}</div>
              <h2 className="subject-name">{sub.name}</h2>
              <p className="subject-desc">{sub.desc}</p>

              {sub.enabled ? (
                <button
                  className="btn-subject-start"
                  style={{ background: `linear-gradient(135deg, ${sub.accentColor}, ${sub.accentColor}cc)` }}
                >
                  {sub.name === 'Interview Questions' ? 'Start Prep →' : 'Start Journey →'}
                </button>
              ) : (
                <button className="btn-subject-start locked" disabled>Locked</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
