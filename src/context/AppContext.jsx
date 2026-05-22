import React, { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [globalLoading, setGlobalLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('Overview');

  const addNotification = useCallback((notification) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const entry = { id, timestamp: Date.now(), ...notification };
    setNotifications((prev) => [...prev, entry]);
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = {
    theme,
    setTheme,
    globalLoading,
    setGlobalLoading,
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    activeTab,
    setActiveTab,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}

export default AppContext;
