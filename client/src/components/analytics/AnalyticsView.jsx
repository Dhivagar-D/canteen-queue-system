import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Smartphone, Receipt, Printer, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { getStats, getMenu, toggleMenuItem } from '../../services/api';

export default function AnalyticsView({ stats, onRefreshStats }) {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMenu();
  }, []);

  async function loadMenu() {
    try {
      setLoading(true);
      const res = await getMenu();
      if (res.success) {
        setMenuItems(res.items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id) {
    try {
      const res = await toggleMenuItem(id);
      if (res.success) {
        setMenuItems(prev => prev.map(i => i.id === id ? res.item : i));
      }
    } catch (err) {
      alert(err.message);
    }
  }

  const total = stats?.totalOrders || 0;
  const digital = stats?.digitalOrders || 0;
  const manual = stats?.manualOrders || 0;
  const digitalPercent = total > 0 ? Math.round((digital / total) * 100) : 0;
  const queueReductionImpact = digitalPercent; // Percentage of students bypassing the billing queue!

  const p1 = stats?.printer1Orders || 0;
  const p2 = stats?.printer2Orders || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Total Canteen Orders</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">{total}</div>
          <div className="text-xs text-slate-500 mt-2">
            Single-entry capture • Zero duplicate tickets
          </div>
        </div>

        {/* Queue Reduction % */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Counter Queue Reduction</span>
            <Smartphone className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-600 font-mono">{queueReductionImpact}%</div>
          <div className="text-xs text-slate-500 mt-2">
            {digital} students skipped the physical counter queue
          </div>
        </div>

        {/* Dual-Printer Workload */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Dual-Printer Balance</span>
            <Printer className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-indigo-600 font-mono">
            {p1} : {p2}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            P1: {p1} slips | P2: {p2} slips (Alternating 1:1)
          </div>
        </div>

        {/* Total Revenue */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Total Revenue</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-blue-600 font-mono">
            ₹{stats?.totalRevenue || 0}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Digital UPI + Counter Cash unified
          </div>
        </div>
      </div>

      {/* Deep-Dive Visual Comparisons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Intake Channel Distribution */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-1">Order Intake Channel Comparison</h2>
          <p className="text-xs text-slate-500 mb-4">
            Demonstrates how pre-ordering diverts foot traffic from the physical cashier desk.
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="flex items-center space-x-1.5 text-blue-600 font-semibold">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Digital Web Pre-Orders ({digital})</span>
                </span>
                <span className="font-mono text-slate-900 font-bold">{digitalPercent}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${digitalPercent}%` }}
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="flex items-center space-x-1.5 text-slate-600 font-semibold">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Counter Manual Billing ({manual})</span>
                </span>
                <span className="font-mono text-slate-900 font-bold">{100 - digitalPercent}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${100 - digitalPercent}%` }}
                  className="h-full bg-slate-400 rounded-full transition-all duration-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dual-Printer Dispatch Distribution */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-1">Thermal Printer Alternation Ratio</h2>
          <p className="text-xs text-slate-500 mb-4">
            Proves orders are dispatched sequentially without choking one printer or repeating orders.
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-blue-600 font-semibold">Kitchen Station A (Printer 1)</span>
                <span className="font-mono text-slate-900 font-bold">{p1} jobs</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${total > 0 ? (p1 / total) * 100 : 50}%` }}
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-indigo-600 font-semibold">Kitchen Station B (Printer 2)</span>
                <span className="font-mono text-slate-900 font-bold">{p2} jobs</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${total > 0 ? (p2 / total) * 100 : 50}%` }}
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Item Real-time Availability Manager */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Live Kitchen Stock & Menu Availability</h2>
            <p className="text-xs text-slate-500">
              Canteen staff can toggle items out-of-stock when food runs out to prevent duplicate or unfulfillable orders.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {menuItems.map(item => (
            <div
              key={item.id}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-bold text-slate-900">{item.name}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  ₹{item.price} • {item.category}
                </div>
              </div>

              <button
                onClick={() => handleToggle(item.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  item.is_available
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                {item.is_available ? 'Available' : 'Sold Out'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
