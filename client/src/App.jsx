import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import CampusLoginPage from './components/auth/CampusLoginPage';
import StudentView from './components/student/StudentView';
import CashierView from './components/cashier/CashierView';
import DualPrinterMonitor from './components/printer/DualPrinterMonitor';
import PublicTvBoard from './components/display/PublicTvBoard';
import SessionManager from './components/sessions/SessionManager';
import DailyZReportView from './components/reports/DailyZReportView';
import { subscribeToEvents, getStats, getSessions } from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('campus_canteen_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('student');
  const [isConnected, setIsConnected] = useState(false);
  const [lastPrintedJob, setLastPrintedJob] = useState(null);
  const [lastUpdatedOrder, setLastUpdatedOrder] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [lastMenuUpdate, setLastMenuUpdate] = useState(Date.now());

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('campus_canteen_user', JSON.stringify(user));
    } catch (e) {
      console.error('Failed to persist user in localStorage:', e);
    }
    if (user.role === 'CASHIER') setActiveTab('cashier');
    else if (user.role === 'KITCHEN') setActiveTab('display');
    else if (user.role === 'ADMIN') setActiveTab('student');
    else setActiveTab('student');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('campus_canteen_user');
    } catch (e) {
      console.error('Failed to clear user from localStorage:', e);
    }
  };

  useEffect(() => {
    refreshAll();

    // Subscribe to real-time Server-Sent Events (SSE)
    const unsubscribe = subscribeToEvents(
      (event) => {
        if (event.type === 'JOB_PRINTED') {
          setLastPrintedJob(event.payload);
          refreshStats();
        } else if (event.type === 'ORDER_STATUS_UPDATED') {
          setLastUpdatedOrder(event.payload);
          refreshStats();
        } else if (event.type === 'PRINTER_STATUS_CHANGED') {
          refreshStats();
        } else if (event.type === 'MENU_UPDATED') {
          setLastMenuUpdate(Date.now());
          refreshAll();
        }
      },
      (connected) => {
        setIsConnected(connected);
      }
    );

    return () => unsubscribe();
  }, []);

  async function refreshAll() {
    await Promise.all([refreshStats(), refreshSessions()]);
  }

  async function refreshStats() {
    try {
      const res = await getStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  async function refreshSessions() {
    try {
      const res = await getSessions();
      if (res.success) {
        setActiveSession(res.activeSession);
      }
    } catch (err) {
      console.error('Failed to load session info:', err);
    }
  }

  // If unauthenticated, present clean Campus Role Login Page
  if (!currentUser) {
    return <CampusLoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Universal Clean Navigation */}
      <Navigation
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        stats={stats}
        activeSession={activeSession}
      />

      {/* Main Viewport with Strict Role Isolation */}
      <main className="flex-1 pb-16">
        {activeTab === 'student' && (currentUser.role === 'STUDENT' || currentUser.role === 'ADMIN') && (
          <StudentView
            lastPrintedJob={lastPrintedJob}
            lastUpdatedOrder={lastUpdatedOrder}
            activeSession={activeSession}
            lastMenuUpdate={lastMenuUpdate}
            currentUser={currentUser}
          />
        )}
        {activeTab === 'cashier' && (currentUser.role === 'CASHIER' || currentUser.role === 'ADMIN') && (
          <CashierView onOrderPlaced={() => refreshStats()} lastMenuUpdate={lastMenuUpdate} />
        )}
        {activeTab === 'printer' && currentUser.role === 'ADMIN' && (
          <DualPrinterMonitor lastPrintedJob={lastPrintedJob} />
        )}
        {activeTab === 'display' && (currentUser.role === 'KITCHEN' || currentUser.role === 'ADMIN' || currentUser.role === 'CASHIER') && (
          <PublicTvBoard lastUpdatedOrder={lastUpdatedOrder} />
        )}
        {activeTab === 'sessions' && currentUser.role === 'ADMIN' && (
          <SessionManager onSessionChange={refreshSessions} lastMenuUpdate={lastMenuUpdate} />
        )}
        {activeTab === 'reports' && currentUser.role === 'ADMIN' && (
          <DailyZReportView />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">Canteen Express</span>
            <span className="text-slate-300">•</span>
            <span className="text-blue-600 font-semibold">Dining Services</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            Node.js 22 + SQLite SSE • React 19 • Dual Thermal Spooler
          </span>
        </div>
      </footer>
    </div>
  );
}
