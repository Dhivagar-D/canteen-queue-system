import React, { useState } from 'react';
import { GraduationCap, Receipt, ChefHat, ShieldAlert, ArrowRight, Lock, KeyRound, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { loginCampus } from '../../services/api';

export default function CampusLoginPage({ onLoginSuccess }) {
  const [selectedRole, setSelectedRole] = useState('STUDENT');
  const [studentId, setStudentId] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const roles = [
    {
      id: 'STUDENT',
      title: 'Student Portal',
      subtitle: 'Pre-order food, skip counter queues, get digital token',
      icon: GraduationCap,
      color: 'from-blue-600 to-blue-500',
      borderHover: 'hover:border-blue-500',
      bgActive: 'bg-blue-50/80 border-blue-600 ring-1 ring-blue-600/30',
      badge: 'Quick Order'
    },
    {
      id: 'CASHIER',
      title: 'Cashier POS Counter',
      subtitle: 'Walk-in cash billing terminal with dual-printer dispatch',
      icon: Receipt,
      color: 'from-blue-700 to-indigo-600',
      borderHover: 'hover:border-blue-500',
      bgActive: 'bg-blue-50/80 border-blue-600 ring-1 ring-blue-600/30',
      badge: 'PIN: 1234'
    },
    {
      id: 'KITCHEN',
      title: 'Kitchen & TV Board',
      subtitle: 'Dining hall pickup screen & server preparation board',
      icon: ChefHat,
      color: 'from-teal-600 to-emerald-600',
      borderHover: 'hover:border-teal-500',
      bgActive: 'bg-teal-50/80 border-teal-600 ring-1 ring-teal-600/30',
      badge: 'PIN: 5555'
    },
    {
      id: 'ADMIN',
      title: 'Canteen Manager',
      subtitle: 'Live stock editor, session schedules, and spooler monitor',
      icon: ShieldAlert,
      color: 'from-indigo-600 to-blue-700',
      borderHover: 'hover:border-indigo-500',
      bgActive: 'bg-indigo-50/80 border-indigo-600 ring-1 ring-indigo-600/30',
      badge: 'PIN: 9999'
    }
  ];

  async function handleLogin(e) {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const payload = {
        role: selectedRole,
        identifier: selectedRole === 'STUDENT' ? studentId : undefined,
        pin: selectedRole !== 'STUDENT' ? pin : undefined
      };

      const res = await loginCampus(payload);
      if (res.success) {
        onLoginSuccess(res.user);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 sm:px-6 lg:px-8 text-slate-900 selection:bg-blue-600 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl px-4">
        {/* Clean product header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/25 mb-4 hover:scale-[1.01] transition-transform">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            CANTEEN EXPRESS
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
            Quick, simple campus dining
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Role Grid Selection */}
          <div className="mb-6">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
              1. Choose Your Portal Role:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roles.map(role => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role.id);
                      setErrorMsg('');
                    }}
                    className={`p-4 rounded-2xl text-left border transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? role.bgActive
                        : `bg-slate-50/80 border-slate-200 ${role.borderHover}`
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-xl bg-gradient-to-tr ${role.color} text-white shadow-sm`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-600 font-mono border border-slate-200 font-semibold">
                          {role.badge}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-2.5">{role.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{role.subtitle}</p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                      <span className={isSelected ? 'text-blue-600 font-bold' : 'text-slate-400'}>
                        {isSelected ? '✓ Selected' : 'Tap to select'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role Credential Form */}
          <form onSubmit={handleLogin} className="space-y-4 pt-2 border-t border-slate-200">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              2. Enter Credentials:
            </label>

            {/* Student Role Form */}
            {selectedRole === 'STUDENT' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  College Roll Number / Student ID or Name *
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                    placeholder="e.g. 22CS104 or Priya Sharma"
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Instant student ordering portal. Generates pickup tokens under this ID.
                </p>
              </div>
            )}

            {/* Cashier / Kitchen / Admin Role Form */}
            {selectedRole !== 'STUDENT' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    4-Digit Security PIN *
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Default: {selectedRole === 'CASHIER' ? '1234' : selectedRole === 'KITCHEN' ? '5555' : '9999'}
                  </span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="••••"
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-9 pr-4 py-2.5 text-sm tracking-widest font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Restricted staff terminal. Protects counter billing & kitchen controls.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/25 transition-all active:scale-98"
            >
              <span>{loading ? 'Authenticating...' : `Enter as ${roles.find(r => r.id === selectedRole)?.title}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Campus Footer Note */}
        <p className="text-center text-slate-400 text-xs mt-6 font-mono">
          Canteen Express
        </p>
      </div>
    </div>
  );
}
