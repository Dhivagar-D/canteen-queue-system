import React, { useState, useEffect } from 'react';
import { ShoppingBag, Clock, Plus, Minus, Check, ArrowRight, Sparkles, AlertCircle, RefreshCw, Printer, ShieldCheck, X, CheckCircle2, FileText, BellRing } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getMenu, createOrder } from '../../services/api';
import ThermalReceiptModal from '../receipt/ThermalReceiptModal';

function playReadyChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Audio autoplay might be restricted by browser until interaction
  }
}

export default function StudentView({ lastPrintedJob, lastUpdatedOrder, activeSession, lastMenuUpdate, currentUser }) {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState({});
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [studentName, setStudentName] = useState(currentUser?.displayName || currentUser?.identifier || 'Student');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [submitting, setSubmitting] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (currentUser?.displayName || currentUser?.identifier) {
      setStudentName(currentUser.displayName || currentUser.identifier);
    }
  }, [currentUser]);

  const categories = ['All', 'Breakfast', 'Meals', 'Snacks', 'Beverages'];

  useEffect(() => {
    loadMenu();
  }, [activeSession, lastMenuUpdate]);

  // Live update if the active order is printed
  useEffect(() => {
    if (lastPrintedJob && activeOrder && lastPrintedJob.orderId === activeOrder.id) {
      setActiveOrder(prev => ({
        ...prev,
        assigned_printer: lastPrintedJob.printerId,
        print_status: 'PRINTED'
      }));
    }
  }, [lastPrintedJob]);

  // Live update when order status is marked PREPARING or READY
  useEffect(() => {
    if (lastUpdatedOrder && activeOrder && lastUpdatedOrder.id === activeOrder.id) {
      setActiveOrder(prev => ({
        ...prev,
        status: lastUpdatedOrder.status
      }));

      if (lastUpdatedOrder.status === 'READY') {
        playReadyChime();
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.5 }
        });
      }
    }
  }, [lastUpdatedOrder]);



  async function loadMenu() {
    try {
      setLoading(true);
      const res = await getMenu();
      if (res.success) {
        setMenuItems(res.items);
      }
    } catch (err) {
      setErrorMsg('Unable to load menu. Please refresh.');
    } finally {
      setLoading(false);
    }
  }

  function addToCart(item) {
    const currentQty = cart[item.id]?.quantity || 0;
    if (item.is_tracked && item.stock_quantity !== undefined && currentQty >= item.stock_quantity) {
      setErrorMsg(`Only ${item.stock_quantity} portion(s) of "${item.name}" available!`);
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    setCart(prev => ({
      ...prev,
      [item.id]: {
        ...item,
        quantity: currentQty + 1
      }
    }));
  }

  function removeFromCart(itemId) {
    setCart(prev => {
      const copy = { ...prev };
      if (!copy[itemId]) return prev;
      if (copy[itemId].quantity > 1) {
        copy[itemId].quantity -= 1;
      } else {
        delete copy[itemId];
      }
      return copy;
    });
  }

  const cartList = Object.values(cart);
  const cartItemCount = cartList.reduce((acc, i) => acc + i.quantity, 0);
  const cartTotal = cartList.reduce((acc, i) => acc + i.price * i.quantity, 0);

  const filteredItems = menuItems.filter(item => {
    if (selectedCategory === 'All') return true;
    return item.category === selectedCategory;
  });

  async function handleConfirmOrder() {
    if (cartList.length === 0) return;

    try {
      setSubmitting(true);
      setErrorMsg('');

      const orderPayload = {
        order_source: 'DIGITAL_WEB',
        customer_name: studentName.trim() || 'Student',
        payment_method: paymentMethod,
        payment_status: 'PAID',
        items: cartList.map(i => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity
        }))
      };

      const res = await createOrder(orderPayload);
      if (res.success) {
        setActiveOrder(res.order);
        setCart({});
        setCheckoutModalOpen(false);
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Order failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Friendly Session & Welcome Banner */}
      <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/30 to-white border border-blue-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900">KCT Student Pre-Order Portal</h1>
                {activeSession && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold border border-blue-200">
                    {activeSession.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {activeSession ? `${activeSession.description} • ${activeSession.timeRemainingText}` : 'Select items to bypass the billing queue.'}
              </p>
            </div>
          </div>

          <button
            onClick={loadMenu}
            className="self-end sm:self-center p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm transition"
            title="Refresh menu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Active Digital Token Card (When Order Placed) */}
      {activeOrder && (
        <div className="mb-8 p-6 rounded-3xl bg-white border border-slate-200 shadow-xl relative overflow-hidden">
          {/* Time Saved Celebration Banner */}
          <div className="mb-4 p-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-blue-800 text-xs font-bold">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Queue Skipped! You saved ~12 mins at billing counter.</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold shadow-sm">
              Zero Wait
            </span>
          </div>

          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div className="flex items-center space-x-2 text-emerald-600 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Order Sent to Local Print Agent</span>
            </div>
            <span className="text-xs font-mono text-slate-500 font-semibold">{activeOrder.order_number}</span>
          </div>

          <div className="text-center my-6">
            <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">
              Your Food Pickup Token
            </div>
            <div className="text-6xl sm:text-7xl font-black text-blue-600 tracking-tight my-2">
              #{activeOrder.token_number}
            </div>

            {/* 2-Digit Verification Claim Code */}
            <div className="my-3 inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Pickup Claim Code:</span>
              <span className="text-xl font-black font-mono text-white bg-blue-600 px-3 py-0.5 rounded-xl shadow-sm">
                {activeOrder.claim_code || '42'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto mb-3">
              Show this 2-digit code to the server when picking up your food.
            </p>

            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-700 border border-slate-200">
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>Paper slip printed at: <strong>{activeOrder.assigned_printer === 'PRINTER_1' ? 'Kitchen Station A' : 'Kitchen Station B'}</strong></span>
            </div>

            <div className="mt-3">
              <button
                onClick={() => setIsReceiptModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition shadow-sm"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>View Kitchen Thermal Slip</span>
              </button>
            </div>
          </div>

          {/* Simple 4-Step Process Bar */}
          <div className="grid grid-cols-4 gap-2 my-5 text-center">
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
              <div className="text-[11px] font-bold text-blue-700">1. Placed</div>
              <div className="text-[9px] text-slate-500">Cloud Web</div>
            </div>
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200">
              <div className="text-[11px] font-bold text-indigo-700">2. Printed</div>
              <div className="text-[9px] text-slate-500">Paper Slip</div>
            </div>
            <div className={`p-2 rounded-xl border ${
              activeOrder.status === 'READY'
                ? 'bg-slate-50 border-slate-200 text-slate-400'
                : 'bg-amber-50 border-amber-200 text-amber-800 font-bold'
            }`}>
              <div className="text-[11px] font-bold">3. Cooking</div>
              <div className="text-[9px] text-slate-500">By Servers</div>
            </div>
            <div className={`p-2 rounded-xl border ${
              activeOrder.status === 'READY'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 animate-pulse font-bold'
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <div className="text-[11px] font-bold">4. Ready!</div>
              <div className="text-[9px]">Pickup Counter</div>
            </div>
          </div>

          {/* Items Summary */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-1.5">
            <div className="font-bold text-slate-500 mb-2">Order Breakdown:</div>
            {activeOrder.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between text-slate-700">
                <span>{item.quantity}x {item.item_name || item.name}</span>
                <span className="font-mono font-semibold">₹{item.subtotal || item.unit_price * item.quantity}</span>
              </div>
            ))}
            <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
              <span>Total Paid ({activeOrder.payment_method})</span>
              <span className="font-mono text-blue-600">₹{activeOrder.total_amount}</span>
            </div>
          </div>

          <div className="mt-5 text-center">
            <button
              onClick={() => setActiveOrder(null)}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold"
            >
              + Place Another Order
            </button>
          </div>
        </div>
      )}

      {/* Category Filter Pills */}
      <div className="flex space-x-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 border border-blue-600'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-sm'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Clean Menu Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-24">
        {filteredItems.map(item => {
          const inCartQty = cart[item.id]?.quantity || 0;
          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl bg-white border transition-all flex flex-col justify-between shadow-sm ${
                item.is_available
                  ? 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                  : 'border-slate-200/60 opacity-40 cursor-not-allowed bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs">
                  {/* Veg Indicator */}
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3.5 h-3.5 rounded border border-emerald-600 flex items-center justify-center p-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">{item.category}</span>
                  </div>

                  <div className="flex items-center space-x-1 text-[11px] text-slate-500">
                    <Clock className="w-3 h-3 text-blue-600" />
                    <span>{item.prep_time_minutes}m</span>
                  </div>

                  {/* Stock Status Badge */}
                  {(!item.is_available || (item.is_tracked && item.stock_quantity <= 0)) ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-bold border border-rose-200">
                      Sold Out
                    </span>
                  ) : item.is_tracked && item.stock_quantity <= 5 ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200 animate-pulse">
                      Only {item.stock_quantity} left!
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {item.stock_quantity} available
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-2">{item.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-base font-black text-slate-900 font-mono">
                  ₹{item.price}
                </span>

                {item.is_available && (!item.is_tracked || item.stock_quantity > 0) ? (
                  inCartQty === 0 ? (
                    <button
                      onClick={() => addToCart(item)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 text-xs font-bold transition flex items-center space-x-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2 bg-slate-100 rounded-xl p-1 border border-slate-200">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 flex items-center justify-center text-slate-700 transition border border-slate-200"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-slate-900 px-1 font-mono">{inCartQty}</span>
                      <button
                        onClick={() => addToCart(item)}
                        disabled={item.is_tracked && inCartQty >= item.stock_quantity}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-white transition ${
                          item.is_tracked && inCartQty >= item.stock_quantity
                            ? 'bg-slate-300 opacity-40 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )
                ) : (
                  <span className="text-[11px] text-rose-500 font-bold">Unavailable</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40">
          <div className="p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-blue-200 shadow-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold font-mono text-sm shadow-sm">
                {cartItemCount}
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Subtotal</div>
                <div className="text-base font-bold text-slate-900 font-mono">₹{cartTotal}</div>
              </div>
            </div>

            <button
              onClick={() => setCheckoutModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-blue-500/25 transition"
            >
              <span>Review & Pay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Clean Checkout Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-slate-900">
            <button
              onClick={() => setCheckoutModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-slate-900 mb-1">Confirm Pre-Order</h2>
            <p className="text-xs text-slate-500 mb-4">
              Your order will be queued and printed to the kitchen automatically.
            </p>

            {/* Selected Items */}
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 max-h-40 overflow-y-auto space-y-2 mb-4 text-xs">
              {cartList.map(item => (
                <div key={item.id} className="flex justify-between text-slate-700">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="font-mono text-slate-900 font-semibold">₹{item.price * item.quantity}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
                <span>Total Amount</span>
                <span className="text-blue-600 font-mono">₹{cartTotal}</span>
              </div>
            </div>

            {/* Student Name */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Student Name / Roll Number</label>
              <input
                type="text"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder="e.g. Rahul Verma"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Payment Method */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'UPI', label: 'Instant UPI' },
                  { id: 'CARD', label: 'Campus Card' },
                  { id: 'CASH', label: 'Pay at Counter' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setPaymentMethod(mode.id)}
                    className={`p-2 rounded-xl text-xs font-bold border transition ${
                      paymentMethod === mode.id
                        ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleConfirmOrder}
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/25 transition disabled:opacity-60"
            >
              {submitting ? (
                <span>Generating Token...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Pay ₹{cartTotal} & Generate Token</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 58mm/80mm Thermal Receipt Slip Preview */}
      <ThermalReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receiptText={activeOrder?.receipt_text}
        order={activeOrder}
      />
    </div>
  );
}

