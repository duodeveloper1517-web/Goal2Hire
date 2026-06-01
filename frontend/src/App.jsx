/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import InterviewPage from './pages/InterviewPage';
import SubjectSelector from './components/SubjectSelector';
import SyllabusAgreement from './components/SyllabusAgreement';
import './index.css';

function AppContent() {
  const { user, loading, updateUser } = useAuth();
  const [sessionSubject, setSessionSubjectState] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('path') || null;
  });

  const setSessionSubject = (subject) => {
    if (subject) {
      window.history.pushState({ subject }, '', `?path=${encodeURIComponent(subject)}`);
    } else {
      window.history.pushState({ subject: null }, '', window.location.pathname);
    }
    setSessionSubjectState(subject);
  };

  useEffect(() => {
    const handlePopState = (event) => {
      setSessionSubjectState(event.state?.subject || null);
    };

    window.history.replaceState({ subject: sessionSubject }, '');
    window.addEventListener('popstate', handlePopState);
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Reset selected session subject if user logs out
  useEffect(() => {
    if (!user) {
      setSessionSubjectState(null);
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f1a' }}>
        <div className="loading-spinner-large" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Route 1: Subject Selection
  if (!sessionSubject) {
    return <SubjectSelector onSelect={(subject) => setSessionSubject(subject)} />;
  }

  // Route 2: Interview Questions (standalone path)
  if (sessionSubject === 'Interview Questions') {
    return <InterviewPage onBack={() => setSessionSubject(null)} />;
  }

  // Route 3: Syllabus & Agreement (CS Fundamentals only)
  if (sessionSubject === 'CS Fundamentals' && (!user.selectedSubject || !user.agreed)) {
    return <SyllabusAgreement onSubmit={(userData) => updateUser(userData)} />;
  }

  // Route 4: Main dashboard (CS Fundamentals)
  return <Dashboard onBackToSubjects={() => setSessionSubject(null)} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1a1a28', color: '#f0f0ff', border: '1px solid rgba(255,255,255,0.1)' },
          duration: 3000
        }}
      />
      <AppContent />
    </AuthProvider>
  );
}
