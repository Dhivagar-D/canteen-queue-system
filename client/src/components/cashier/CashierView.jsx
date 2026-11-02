import React, { useState, useEffect } from 'react';
import { ShoppingCart, Trash2, Plus, Minus, Search, CreditCard, Banknote, QrCode, Printer, CheckCircle2, AlertCircle } from 'lucide-react';
import { getMenu, createOrder } from '../../services/api';

export default function CashierView({ onOrderPlaced, lastMenuUpdate }) {
  const [menuItems, setMenuItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cashTendered, setCashTendered] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Student');
  const [submitting, setSubmitting] = useState(false);
  const [lastIssuedOrder, setLastIssuedOrder] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const categories = ['All', 'Breakfast', 'Meals', 'Snacks', 'Beverages'];

  useEffect(() => {
    loadMenu();
  }, [lastMenuUpdate]);

  async function loadMenu() {
    try {
      const res = await getMenu();
      if (res.success) {
        setMenuItems(res.items);
      }
    } catch (err) {
      setErrorMsg('Failed to load menu');
    }
  }

  function addItem(item) {
    const existing = cart.find(i => i.id === item.id);
    const currentQty = existing ? existing.quantity : 0;
    if (item.is_tracked && item.stock_quantity !== undefined && currentQty >= item.stock_quantity) {
      setErrorMsg(`Only ${item.stock_quantity} portion(s) of "${item.name}" remaining in kitchen!`);
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    setCart(prev => {
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }

  function updateQty(itemId, delta) {
    setCart(prev => {
      return prev
        .map(i => {
          if (i.id === itemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean);
    });
  }

  function removeItem(itemId) {
    setCart(prev => prev.filter(i => i.id !== itemId));
  }

  function clearCart() {
    setCart([]);
    setCashTendered('');
  }

  const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const totalItemCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeDue = paymentMethod === 'CASH' && tenderedNum > subtotal ? tenderedNum - subtotal : 0;

  const filteredItems = menuItems.filter(item => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  async function handleCheckout() {
    if (cart.length === 0) return;

    try {
      setSubmitting(true);
      setErrorMsg('');

      const orderPayload = {
        order_source: 'MANUAL_COUNTER',
        customer_name: customerName || 'Walk-in Student',
        payment_method: paymentMethod,
        payment_status: 'PAID',
        items: cart.map(i => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity
        }))
      };

      const res = await createOrder(orderPayload);
      if (res.success) {
        setLastIssuedOrder(res.order);
        clearCart();
        if (onOrderPlaced) onOrderPlaced(res.order);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Billing failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* POS Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Counter Cashier POS Terminal</h1>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono text-xs font-semibold border border-blue-200">
              Manual Intake
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Student → Cashier → Manual Entry → Same Cloud System → Local Print Agent → Server
          </p>
        </div>

        {lastIssuedOrder && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold text-emerald-800">
                Issued Token: #{lastIssuedOrder.token_number}
              </div>
              <div className="text-slate-600 text-[11px]">
                Dispatched to {lastIssuedOrder.assigned_printer === 'PRINTER_1' ? 'Station A (P1)' : 'Station B (P2)'}
              </div>
            </div>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* POS Layout: Left = Fast Grid, Right = Clean Docket */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Menu Items (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search food items..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>

            <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Clean Touch Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredItems.map(item => {
              const isOutOfStock = !item.is_available || (item.is_tracked && item.stock_quantity <= 0);
              return (
                <button
                  key={item.id}
                  onClick={() => !isOutOfStock && addItem(item)}
                  disabled={isOutOfStock}
                  className={`p-3 rounded-2xl text-left transition-all border flex flex-col justify-between h-24 ${
                    !isOutOfStock
                      ? 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md active:scale-98 shadow-sm'
                      : 'bg-slate-50 border-slate-200/60 opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">{item.category}</span>
                      {isOutOfStock ? (
                        <span className="text-[9px] text-rose-600 font-bold">SOLD OUT</span>
                      ) : (
                        <span className={`text-[9px] font-mono ${item.stock_quantity <= 5 ? 'text-amber-600 font-bold' : 'text-slate-500'}`}>
                          {item.stock_quantity} left
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-900 line-clamp-1 mt-0.5">{item.name}</div>
                  </div>
                  <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-100">
                    <span className="text-sm font-bold text-slate-900 font-mono">₹{item.price}</span>
                    <span className="p-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                      <Plus className="w-3 h-3" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Clean Bill Docket (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-slate-900">Active Counter Bill</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                  {totalItemCount}
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-rose-500 hover:text-rose-600 flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Customer & Payment Mode */}
            <div className="grid grid-cols-2 gap-2 my-3">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-semibold">Student / Customer</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-semibold">Payment Mode</label>
                <div className="grid grid-cols-3 gap-1">
                  {['CASH', 'UPI', 'CARD'].map(m => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`py-1.5 text-[11px] font-bold rounded-xl transition-colors ${
                        paymentMethod === m
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 my-3 pr-1 scrollbar-thin">
              {cart.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Tap items to prepare counter bill.
                </div>
              ) : (
                cart.map(item => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex-1 pr-2">
                      <div className="font-bold text-slate-900 truncate">{item.name}</div>
                      <div className="text-slate-500 text-[11px] font-mono">₹{item.price} each</div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 bg-white rounded-lg p-0.5 border border-slate-200">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-100 text-slate-700"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono font-bold text-slate-900 w-5 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="w-5 h-5 rounded flex items-center justify-center hover:bg-slate-100 text-slate-700"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-mono font-bold text-blue-600 w-12 text-right">
                        ₹{item.price * item.quantity}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Summary & Print Button */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            {paymentMethod === 'CASH' && cart.length > 0 && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-semibold">Cash Given (₹)</label>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={e => setCashTendered(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Change to Return</div>
                  <div className="text-base font-bold font-mono text-emerald-600 mt-0.5">
                    ₹{changeDue.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-baseline justify-between text-sm">
              <span className="text-slate-500 font-medium">Total Bill Amount:</span>
              <span className="text-2xl font-black text-slate-900 font-mono">₹{subtotal}</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || submitting}
              className={`w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 shadow-lg transition-all ${
                cart.length > 0 && !submitting
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 active:scale-98'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>{submitting ? 'Queuing to Local Print Agent...' : 'PRINT BILL & QUEUE TO KITCHEN'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
