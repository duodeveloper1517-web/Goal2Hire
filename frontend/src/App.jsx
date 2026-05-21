/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import SubjectSelector from './components/SubjectSelector';
import SyllabusAgreement from './components/SyllabusAgreement';
import './index.css';

function AppContent() {
  const { user, loading, updateUser } = useAuth();
  const [sessionSubject, setSessionSubject] = useState(null);

  // Reset selected session subject if user logs out
  useEffect(() => {
    if (!user) {
      setSessionSubject(null);
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

  // Route 1: Subject Selection (shown on login or when returning to path selector)
  if (!sessionSubject) {
    return <SubjectSelector onSelect={(subject) => setSessionSubject(subject)} />;
  }

  // Route 2: Syllabus & Agreement (if user hasn't started/agreed to this path yet)
  if (sessionSubject === 'CS Fundamentals' && (!user.selectedSubject || !user.agreed)) {
    return <SyllabusAgreement onSubmit={(userData) => updateUser(userData)} />;
  }

  // Route 3: Main dashboard
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
