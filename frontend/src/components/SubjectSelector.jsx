export default function SubjectSelector({ onSelect }) {
  const subjects = [
    {
      name: 'CS Fundamentals',
      desc: 'Master Operating Systems, Computer Networks, Databases, Computer Architecture, and execution runtimes in 90 days.',
      icon: '⚡',
      enabled: true,
      tag: 'Ready'
    },
    {
      name: 'DSA (Data Structures & Algorithms)',
      desc: 'Master Arrays, Linked Lists, Trees, Graphs, Dynamic Programming, and advanced problem-solving techniques.',
      icon: '🌲',
      enabled: false,
      tag: 'In Work'
    },
    {
      name: 'Aptitude & Reasoning',
      desc: 'Prepare for quantitative aptitude, logical reasoning, and data interpretation for technical interviews.',
      icon: '🧩',
      enabled: false,
      tag: 'In Work'
    }
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
              onClick={() => sub.enabled && onSelect(sub.name)}
            >
              {!sub.enabled && (
                <div className="overlay-badge">
                  <span>{sub.tag}</span>
                </div>
              )}
              <div className="subject-icon">{sub.icon}</div>
              <h2 className="subject-name">{sub.name}</h2>
              <p className="subject-desc">{sub.desc}</p>
              
              {sub.enabled ? (
                <button className="btn-subject-start">Start Journey →</button>
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
