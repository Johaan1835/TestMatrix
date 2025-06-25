// src/context/AuthContext.jsx
import React, { createContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState({ username: null, role: null });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check for token in sessionStorage on load
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserInfo({
          username: decoded.username,
          role: decoded.role,
        });
        console.log("✅ AuthContext: Decoded token:", decoded);
      } catch (err) {
        console.error("❌ Invalid token in sessionStorage:", err);
        sessionStorage.removeItem('token');
        setUserInfo({ username: null, role: null });
      }
    }
    setIsLoading(false);
  }, []);

  // Auto logout on inactivity
  useEffect(() => {
    if (!userInfo.role) return;

    let timeout;
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        logout();
        alert('Logged out due to inactivity.');
      }, 30 * 60 * 1000); // 30 mins
    };

    const events = ['click', 'mousemove', 'keydown'];
    events.forEach(event => document.addEventListener(event, resetTimeout));
    resetTimeout();

    return () => {
      events.forEach(event => document.removeEventListener(event, resetTimeout));
      clearTimeout(timeout);
    };
  }, [userInfo.role]);

  const logout = () => {
    sessionStorage.clear();
    setUserInfo({ username: null, role: null });
    navigate('/', { replace: true });
  };

  const contextValue = {
    ...userInfo,
    isLoading,
    logout,
    setUserInfo, // ✅ Expose this so LoginPage and others can use it
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};
