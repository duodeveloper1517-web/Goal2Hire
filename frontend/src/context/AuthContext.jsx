/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const { data } = await API.get('/auth/me');
      setUser(data.user);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const { data } = await API.post('/auth/login', { username, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  };

  const register = async (username, password) => {
    const { data } = await API.post('/auth/register', { username, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = useCallback((updatedFields) => {
    setUser(prev => prev ? { ...prev, ...updatedFields } : updatedFields);
  }, []);

  const updateCompletedDays = useCallback((completedDays) => {
    setUser(prev => prev ? { ...prev, completedDays } : null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, updateCompletedDays }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
