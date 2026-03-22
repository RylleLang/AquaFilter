import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import { authAPI } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate session on app launch
  useEffect(() => {
    const rehydrate = async () => {
      try {
        const token = await storage.getItem('authToken');
        if (token) {
          const { data } = await authAPI.me();
          setUser(data.user);
        }
      } catch {
        await storage.deleteItem('authToken');
      } finally {
        setLoading(false);
      }
    };
    rehydrate();
  }, []);

  const login = async (email, password) => {
    const { data } = await authAPI.login(email, password);
    await storage.setItem('authToken', data.token);
    setUser(data.user);
  };

  const logout = async () => {
    await storage.deleteItem('authToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
