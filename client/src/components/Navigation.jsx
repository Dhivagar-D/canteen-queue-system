import React, { useState, useEffect } from 'react';
import { Smartphone, Receipt, Printer, Tv, Clock, ExternalLink, LogOut, GraduationCap, ChefHat, ShieldAlert, BarChart3, FileText } from 'lucide-react';
import ThermalReceiptModal from './receipt/ThermalReceiptModal';

export default function Navigation({
  currentUser,
  onLogout,
  activeTab,
  setActiveTab,
  isConnected,
  stats,
  activeSession
}) {
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const allTabs = [
    {
      id: 'student',
      label: 'Student Order',
      icon: Smartphone,
      badge: activeSession ? activeSession.label.split(' ')[0] : 'Menu',
      roles: ['STUDENT', 'ADMIN']
    },
    {
      id: 'cashier',
      label: 'Cashier POS',
      icon: Receipt,
      badge: 'Counter',
      roles: ['CASHIER', 'ADMIN']
    },
    {
      id: 'printer',
      label: 'Local Print Agent',
      icon: Printer,
      badge: `${stats?.printer1Orders || 0} | ${stats?.printer2Orders || 0}`,
      roles: ['ADMIN']
    },
    {
      id: 'display',
      label: 'Kitchen & TV Board',
      icon: Tv,
      badge: `${stats?.activeQueueCount || 0} Prep`,
      roles: ['KITCHEN', 'CASHIER', 'ADMIN']
    },
    {
      id: 'sessions',
      label: 'Menu & Sessions',
      icon: Clock,
      roles: ['ADMIN']
    },
    {
      id: 'reports',
      label: 'Daily Z-Report',
      icon: BarChart3,
      badge: 'Audit',
      roles: ['ADMIN']
    }
  ];

  const currentRole = currentUser?.role || 'STUDENT';
  const tabs = allTabs.filter((t) => t.roles.includes(currentRole));

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((t) => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [currentRole, tabs, activeTab, setActiveTab]);

  const getRoleIcon = () => {
    switch (currentRole) {
      case 'STUDENT': return GraduationCap;
      case 'CASHIER': return Receipt;
      case 'KITCHEN': return ChefHat;
      case 'ADMIN': return ShieldAlert;
      default: return GraduationCap;
    }
  };

  const RoleIcon = getRoleIcon();


  return (
    <header className="sticky top-0 z-50 shadow-md">
      {/* Top Tier: Clean White Brand Bar */}
      <div className="bg-white border-b border-slate-200 text-slate-900 py-2.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Product identity */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <ChefHat className="w-5 h-5" />
            </div>
            <div className="hidden sm:block pl-3 border-l border-slate-200">
              <span className="text-xs font-black tracking-wider text-blue-900 uppercase">
                Canteen Express
              </span>
            </div>
          </div>

          {/* Right Top Actions */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            {activeSession && (
              <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs shadow-sm">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span className="font-bold">{activeSession.label}</span>
                <span className="text-[10px] text-blue-600 font-mono font-semibold">({activeSession.timeRemainingText})</span>
              </div>
            )}

            <div
              className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full border shadow-sm ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-rose-50 text-rose-700 border-rose-300'
              }`}
              title={isConnected ? 'Connected to Cloud SSE' : 'Offline'}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="font-mono text-[10px] font-bold">{isConnected ? 'LIVE CLOUD' : 'OFFLINE'}</span>
            </div>

            <button
              onClick={() => setIsReceiptModalOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition border border-blue-200 text-xs font-semibold shadow-sm"
              title="Inspect physical 58mm/80mm thermal slip"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline text-[11px]">Slip Preview</span>
            </button>

            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition border border-slate-300 shadow-sm"
              title="Open duplicate window for multi-screen testing"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            {currentUser && (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-blue-700 text-white text-xs shadow-sm">
                  <RoleIcon className="w-3.5 h-3.5 text-blue-200" />
                  <span className="font-semibold hidden sm:inline text-[11px]">
                    {currentUser.displayName || currentUser.role}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-white text-blue-700 font-mono font-black">
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-1 px-2 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition border border-rose-200 text-xs font-semibold shadow-sm"
                  title="Switch Role or Log Out"
                >
                  <LogOut className="w-3 h-3 text-rose-600" />
                  <span className="hidden md:inline text-[10px]">Switch</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tier 2: Refreshing Blue Navigation Bar */}
      <div className="bg-blue-600 border-b border-blue-700 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-12">
          {/* Desktop Navigation Tabs */}
          <nav className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-blue-700 shadow-md shadow-blue-900/20'
                      : 'text-blue-100 hover:text-white hover:bg-blue-500/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 font-extrabold'
                          : 'bg-blue-700/80 text-blue-100'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 58mm/80mm Thermal Receipt Slip Preview Modal */}
      <ThermalReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
      />
    </header>
  );
}

