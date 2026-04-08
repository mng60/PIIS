import React, { createContext, useState, useContext, useEffect } from 'react';
import { api } from '@/api/client';

const AuthContext = createContext();
const TEMP_LEVEL2_XP_OVERRIDE = 220;

function applyTemporaryLevel2XP(user) {
  if (!user || user.role === 'admin' || user.role === 'empresa') return user;

  return {
    ...user,
    // TODO: Quitar este override temporal cuando ya no necesitemos previsualizar el nivel 2.
    xp: Math.max(user.xp ?? 0, TEMP_LEVEL2_XP_OVERRIDE),
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsLoadingAuth(false);
      return;
    }
    try {
      const currentUser = await api.get('/auth/me');
      setUser(applyTemporaryLevel2XP(currentUser));
      setIsAuthenticated(true);
    } catch {
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (email, password) => {
    const { token, user } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', token);
    setUser(applyTemporaryLevel2XP(user));
    setIsAuthenticated(true);
    return applyTemporaryLevel2XP(user);
  };

  const register = async (email, password, full_name) => {
    const { token, user } = await api.post('/auth/register', { email, password, full_name });
    localStorage.setItem('token', token);
    setUser(applyTemporaryLevel2XP(user));
    setIsAuthenticated(true);
    return applyTemporaryLevel2XP(user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  const updateUserData = (data) => setUser((prev) => ({ ...prev, ...data }));

  const refreshUser = async () => {
    try {
      const currentUser = await api.get('/auth/me');
      setUser(applyTemporaryLevel2XP(currentUser));
    } catch { /* silencioso */ }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      login,
      register,
      logout,
      updateUserData,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
