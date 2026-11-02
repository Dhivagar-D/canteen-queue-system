import React, { useState, useEffect } from 'react';
import { ChefHat, Bell, Check, Clock, Sparkles } from 'lucide-react';
import { getOrders, updateOrderStatus } from '../../services/api';

export default function PublicTvBoard({ lastUpdatedOrder }) {
  const [orders, setOrders] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadOrders();
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Update on SSE event
  useEffect(() => {
    loadOrders();
  }, [lastUpdatedOrder]);

  async function loadOrders() {
    try {
      const res = await getOrders('', 40);
      if (res.success) {
        setOrders(res.orders);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleStatusAdvance(orderId, nextStatus) {
    try {
      await updateOrderStatus(orderId, nextStatus);
      loadOrders();
    } catch (err) {
      console.error(err);
    }
  }

  const preparingOrders = orders.filter(o => o.status === 'PREPARING');
  const readyOrders = orders.filter(o => o.status === 'READY');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* TV Screen Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-3xl bg-blue-700 border border-blue-800 shadow-2xl mb-6">
        <div className="flex items-center space-x-4 mb-3 sm:mb-0">
          <div className="bg-white w-12 h-12 flex items-center justify-center rounded-2xl shadow-md border border-blue-100 shrink-0">
            <ChefHat className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                DINING HALL PICKUP
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-bold border border-white/30 font-mono">
                LIVE TOKENS
              </span>
            </div>
            <p className="text-xs text-blue-100">
              Present your 2-digit claim code to collect meals
            </p>
          </div>
        </div>

        <div className="text-right flex items-center space-x-6">
          <div className="hidden md:block">
            <div className="text-xs text-blue-200 font-mono">
              {currentTime.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* Two Prominent Columns: PREPARING vs READY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PREPARING COLUMN */}
        <div className="p-6 rounded-3xl bg-white border border-amber-200 shadow-xl flex flex-col justify-between min-h-[500px]">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div className="flex items-center space-x-3">
                <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                <h2 className="text-xl font-extrabold text-amber-600 tracking-wider">
                  PREPARING IN KITCHEN
                </h2>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-mono font-bold border border-amber-200">
                {preparingOrders.length} In Prep
              </span>
            </div>

            {/* Token Numbers Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {preparingOrders.length === 0 ? (
                <div className="col-span-full text-center py-20 text-slate-400 text-sm">
                  Kitchen is all caught up! No orders currently in preparation.
                </div>
              ) : (
                preparingOrders.map(order => (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col items-center justify-between shadow-sm relative group"
                  >
                    <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between w-full">
                      <span>{order.assigned_printer === 'PRINTER_1' ? 'Station A' : 'Station B'}</span>
                      <span className="text-blue-600">{order.order_source === 'DIGITAL_WEB' ? 'App' : 'Counter'}</span>
                    </div>

                    <div className="text-4xl font-black text-amber-700 font-mono my-2 tracking-tight">
                      #{order.token_number}
                    </div>

                    <div className="text-[11px] text-slate-500 truncate max-w-full text-center">
                      {order.items?.map(i => `${i.quantity}x ${i.item_name}`).join(', ')}
                    </div>

                    {/* Server Quick Action to advance order */}
                    <button
                      onClick={() => handleStatusAdvance(order.id, 'READY')}
                      className="mt-3 w-full py-1.5 rounded-xl bg-amber-100 hover:bg-amber-500 text-amber-700 hover:text-white text-xs font-bold transition flex items-center justify-center space-x-1 border border-amber-200"
                      title="Food ready! Move to pickup counter"
                    >
                      <Check className="w-3 h-3" />
                      <span>Mark Ready</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center pt-4 border-t border-slate-200">
            Slips printed automatically across Kitchen Station A & B
          </div>
        </div>

        {/* READY FOR PICKUP COLUMN */}
        <div className="p-6 rounded-3xl bg-white border border-emerald-200 shadow-xl flex flex-col justify-between min-h-[500px]">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div className="flex items-center space-x-3">
                <Bell className="w-6 h-6 text-emerald-600 animate-bounce" />
                <h2 className="text-xl font-extrabold text-emerald-600 tracking-wider">
                  READY FOR PICKUP
                </h2>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-mono font-bold border border-emerald-200">
                {readyOrders.length} Ready
              </span>
            </div>

            {/* Token Numbers Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {readyOrders.length === 0 ? (
                <div className="col-span-full text-center py-20 text-slate-400 text-sm">
                  Orders will appear here as soon as kitchen servers plate them.
                </div>
              ) : (
                readyOrders.map(order => (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col items-center justify-between shadow-sm relative"
                  >
                    <span className="text-[10px] text-emerald-700 font-mono">
                      Tray Ready at Counter
                    </span>

                    <div className="text-4xl font-black text-emerald-700 font-mono my-2 tracking-tight">
                      #{order.token_number}
                    </div>

                    <div className="text-[11px] text-slate-600 truncate max-w-full text-center">
                      {order.customer_name}
                    </div>

                    {/* Counter server marks as collected */}
                    <button
                      onClick={() => handleStatusAdvance(order.id, 'COMPLETED')}
                      className="mt-3 w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center space-x-1 shadow-md shadow-emerald-600/20"
                      title="Food tray collected by student"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Collected</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 text-center pt-4 border-t border-slate-200">
            Please show your digital token or physical slip at the serving counter
          </div>
        </div>
      </div>
    </div>
  );
}
