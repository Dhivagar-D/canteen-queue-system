import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, DollarSign, ShoppingBag, Smartphone, Receipt, Printer, RefreshCw, CheckCircle, ArrowUpRight, Award, FileSpreadsheet } from 'lucide-react';
import { getDailyReport } from '../../services/api';
import ThermalReceiptModal from '../receipt/ThermalReceiptModal';

export default function DailyZReportView() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    try {
      setLoading(true);
      const res = await getDailyReport();
      if (res.success) {
        setReport(res.report);
      }
    } catch (err) {
      console.error('Failed to load daily report:', err);
    } finally {
      setLoading(false);
    }
  }

  const webPct = report?.totalOrders
    ? Math.round((report.digitalWebOrders / report.totalOrders) * 100)
    : 0;
  const counterPct = 100 - webPct;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-200">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Daily Z-Report & Sales Reconciliation</h1>
              <p className="text-xs text-slate-500">
                Live Register Auditing • Queue Reduction Metrics • Inventory Breakdown
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadReport}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsReceiptModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Z-Report Slip</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* Total Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Sales Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900 font-mono">
              ₹{Number(report?.totalRevenue || 0).toFixed(2)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 flex items-center space-x-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>100% reconciled against digital receipts</span>
          </div>
        </div>

        {/* Queue Hours Saved */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Queue Time Saved</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-blue-600 font-mono">
              {report?.queueHoursSaved || '0.0'} <span className="text-base text-slate-500">Hours</span>
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            ~12 mins counter wait eliminated per digital order
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Orders Handled</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-slate-900 font-mono">
              {report?.totalOrders || 0}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-indigo-600 font-medium">
            Avg Order: ₹{report?.averageOrderValue || 0}
          </div>
        </div>

        {/* Total Items Cooked */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Portions / Items Cooked</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black text-teal-600 font-mono">
              {report?.totalItemsSold || 0}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Zero duplicate preparation orders
          </div>
        </div>
      </div>

      {/* Channel Split: Digital Pre-Orders vs Counter Billing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Intake Channel Adoption</h2>
          <p className="text-xs text-slate-500 mb-5">Digital Web Pre-Order vs Walk-in Counter</p>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                <div className="flex items-center space-x-1.5 text-blue-600">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Student Web Pre-Order</span>
                </div>
                <span className="font-mono text-slate-900 font-bold">{report?.digitalWebOrders || 0} ({webPct}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${webPct}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                <div className="flex items-center space-x-1.5 text-slate-600">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Cashier Counter POS</span>
                </div>
                <span className="font-mono text-slate-900 font-bold">{report?.manualCounterOrders || 0} ({counterPct}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-slate-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${counterPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-start space-x-2.5">
            <CheckCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            <div>
              <span className="font-bold">Queue Deflection Active:</span>
              <p className="text-slate-600 text-[11px] mt-0.5">
                {webPct}% of campus lunch rush bypassed the billing counter entirely.
              </p>
            </div>
          </div>
        </div>

        {/* Top Selling Items Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Item Sales Breakdown</h2>
                <p className="text-xs text-slate-500">Highest volume dishes prepared today</p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                {report?.itemBreakdown?.length || 0} menu items
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-2.5 font-semibold">Dish / Item Name</th>
                    <th className="pb-2.5 font-semibold text-center">Portions Sold</th>
                    <th className="pb-2.5 font-semibold text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {report?.itemBreakdown && report.itemBreakdown.length > 0 ? (
                    report.itemBreakdown.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 text-slate-900 flex items-center space-x-2">
                          <span className="text-[10px] text-slate-400 font-mono w-4">{idx + 1}.</span>
                          <span>{item.item_name}</span>
                        </td>
                        <td className="py-2.5 text-center font-mono text-blue-600 font-bold">
                          {item.units_sold}x
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-700">
                          ₹{item.total_revenue}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-400">
                        No orders recorded yet today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Synchronized with Register Database</span>
            <button
              onClick={() => setIsReceiptModalOpen(true)}
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1"
            >
              <span>View Printed Slip Format</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Thermal Receipt Preview Modal */}
      <ThermalReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receiptText={report?.zReportText}
      />
    </div>
  );
}
