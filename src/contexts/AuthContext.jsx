import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token === 'http-only-cookie') {
          localStorage.removeItem('token');
        }
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        // Fetch fresh user profile from backend /api/auth/me
        const meRes = await fetch('/api/auth/me', { credentials: 'include' });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData && meData.authenticated !== false) {
            localStorage.setItem('user', JSON.stringify(meData));
            setUser(meData);
          }
        }
      } catch (error) {
        console.error('Auth error', error);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = (userData, token) => {
    if (token && token !== 'http-only-cookie') {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.warn('Logout endpoint call failed:', e);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
