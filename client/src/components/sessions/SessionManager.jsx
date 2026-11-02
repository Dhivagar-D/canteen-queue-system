import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertTriangle, Coffee, UtensilsCrossed, Moon, Plus, Trash2, Edit3, X, RefreshCw, Layers } from 'lucide-react';
import {
  getSessions,
  setSessionOverride,
  getMenu,
  toggleMenuItem,
  createMenuItem,
  updateMenuItem,
  updateItemStock,
  deleteMenuItem
} from '../../services/api';

export default function SessionManager({ onSessionChange, lastMenuUpdate }) {
  const [sessionsData, setSessionsData] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedSessionFilter, setSelectedSessionFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    category: 'Breakfast',
    price: '',
    session: 'MORNING',
    stock_quantity: 50,
    prep_time_minutes: 5,
    description: ''
  });

  useEffect(() => {
    loadAll();
  }, [lastMenuUpdate]);

  async function loadAll() {
    try {
      setLoading(true);
      const [sessRes, menuRes] = await Promise.all([getSessions(), getMenu()]);
      if (sessRes.success) setSessionsData(sessRes);
      if (menuRes.success) setMenuItems(menuRes.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleOverride(sessionId) {
    try {
      const res = await setSessionOverride(sessionId);
      if (res.success) {
        notify(`Session mode updated: ${sessionId === 'AUTO' ? 'Dynamic Time-Based' : sessionId}`);
        loadAll();
        if (onSessionChange) onSessionChange();
      }
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleToggleItem(id) {
    try {
      const res = await toggleMenuItem(id);
      if (res.success) {
        setMenuItems(prev => prev.map(i => i.id === id ? res.item : i));
        notify(`Availability updated for "${res.item.name}"`);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleQuickRestock(id, delta) {
    try {
      const res = await updateItemStock(id, { delta });
      if (res.success) {
        setMenuItems(prev => prev.map(i => i.id === id ? res.item : i));
        notify(`Added +${delta} stock to "${res.item.name}". Total: ${res.item.stock_quantity}`);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSaveNewItem(e) {
    e.preventDefault();
    if (!formData.name || !formData.price) {
      alert('Please enter dish name and price');
      return;
    }

    try {
      const res = await createMenuItem(formData);
      if (res.success) {
        notify(`Added "${res.item.name}" to menu!`);
        setAddModalOpen(false);
        setFormData({
          name: '',
          category: 'Breakfast',
          price: '',
          session: 'MORNING',
          stock_quantity: 50,
          prep_time_minutes: 5,
          description: ''
        });
        loadAll();
      }
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSaveEditItem(e) {
    e.preventDefault();
    if (!editItem) return;

    try {
      const res = await updateMenuItem(editItem.id, editItem);
      if (res.success) {
        notify(`Updated "${res.item.name}"!`);
        setEditItem(null);
        loadAll();
      }
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Are you sure you want to remove "${name}" from the menu?`)) return;

    try {
      const res = await deleteMenuItem(id);
      if (res.success) {
        notify(`Removed "${name}" from menu.`);
        setMenuItems(prev => prev.filter(i => i.id !== id));
      }
    } catch (err) {
      alert(err.message);
    }
  }

  function notify(msg) {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 4000);
  }

  const activeSess = sessionsData?.activeSession;
  const isOverride = !!sessionsData?.manualOverride;

  const sessionCards = [
    {
      id: 'MORNING',
      label: 'Morning (Breakfast)',
      time: '07:00 AM - 11:30 AM',
      icon: Coffee,
      color: 'from-amber-500 to-orange-500'
    },
    {
      id: 'LUNCH',
      label: 'Afternoon (Lunch)',
      time: '11:30 AM - 04:00 PM',
      icon: UtensilsCrossed,
      color: 'from-orange-500 to-rose-500'
    },
    {
      id: 'DINING',
      label: 'Evening (Dining & Dinner)',
      time: '04:00 PM - 10:30 PM',
      icon: Moon,
      color: 'from-purple-500 to-indigo-500'
    }
  ];

  const filteredItems = selectedSessionFilter === 'ALL'
    ? menuItems
    : menuItems.filter(i => i.session === selectedSessionFilter || i.session === 'ALL_DAY');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Session Header Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                <Clock className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Dynamic Sessions & Live Inventory Manager
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Dynamic time deadlines, stock quantities, and instant menu customization.
            </p>
          </div>

          <button
            onClick={loadAll}
            className="p-2 self-start sm:self-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {statusMsg && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* 3 Session Time Windows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {sessionCards.map(s => {
            const Icon = s.icon;
            const isCurrentlyActive = activeSess?.id === s.id;
            return (
              <div
                key={s.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrentlyActive
                    ? 'bg-blue-50 border-blue-300 shadow-md shadow-blue-100'
                    : 'bg-slate-50 border-slate-200 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-2 rounded-xl bg-gradient-to-tr ${s.color} text-white`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">{s.label}</h3>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{s.time}</div>
                    </div>
                  </div>

                  {isCurrentlyActive && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      LIVE
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">
                    {isCurrentlyActive ? activeSess?.timeRemainingText : 'Scheduled'}
                  </span>
                  <button
                    onClick={() => handleOverride(s.id)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-[11px] font-semibold transition border border-slate-200"
                  >
                    Force Open
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Manual Override Reset */}
        <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs gap-2">
          <span className="text-slate-600">
            {isOverride ? (
              <span className="text-amber-600 font-semibold">⚠️ Manual session override active. Dynamic clock bypassed.</span>
            ) : (
              <span className="text-emerald-600 font-semibold">✓ Running on dynamic automatic time clock.</span>
            )}
          </span>

          <button
            onClick={() => handleOverride('AUTO')}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200"
          >
            Reset to Auto Dynamic Clock
          </button>
        </div>
      </div>

      {/* Dynamic Menu & Stock Items Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Canteen Menu & Live Stock Quantities</h2>
            <p className="text-xs text-slate-500">
              Orders automatically decrement stock. Restock on the fly or add new dishes dynamically.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {['ALL', 'MORNING', 'LUNCH', 'DINING'].map(f => (
                <button
                  key={f}
                  onClick={() => setSelectedSessionFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    selectedSessionFilter === f
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <button
              onClick={() => setAddModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-blue-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Dish</span>
            </button>
          </div>
        </div>

        {/* Dishes Grid with Live Restock */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const isOutOfStock = !item.is_available || (item.is_tracked && item.stock_quantity <= 0);
            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between shadow-sm hover:border-blue-200 hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono font-medium border border-slate-200">
                          {item.session || 'ALL_DAY'}
                        </span>
                        <span className="text-[10px] text-slate-500">{item.category}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{item.name}</h3>
                    </div>

                    <span className="text-sm font-bold text-blue-600 font-mono">
                      ₹{item.price}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                </div>

                {/* Stock Controls & Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs text-slate-600 font-semibold">Stock:</span>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                        isOutOfStock
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : item.stock_quantity <= 5
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {item.stock_quantity} left
                      </span>
                    </div>

                    {/* Quick Restock Pills */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleQuickRestock(item.id, 10)}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-[10px] font-mono font-bold transition border border-slate-200"
                        title="Add +10 portions"
                      >
                        +10
                      </button>
                      <button
                        onClick={() => handleQuickRestock(item.id, 25)}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-[10px] font-mono font-bold transition border border-slate-200"
                        title="Add +25 portions"
                      >
                        +25
                      </button>
                    </div>
                  </div>

                  {/* Actions: Toggle Status, Edit, Delete */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleToggleItem(item.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                        item.is_available
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                      }`}
                    >
                      {item.is_available ? 'Available' : 'Sold Out'}
                    </button>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setEditItem({ ...item })}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition border border-slate-200"
                        title="Edit details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition border border-slate-200"
                        title="Delete dish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Add New Dish Dynamically */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-slate-900 mb-1">Add New Menu Dish</h2>
            <p className="text-xs text-slate-500 mb-4">
              Dynamically registers item into SQLite with stock and session allocation.
            </p>

            <form onSubmit={handleSaveNewItem} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Dish Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Onion Uttapam"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    placeholder="e.g. 60"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Initial Stock *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock_quantity}
                    onChange={e => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Assigned Session</label>
                  <select
                    value={formData.session}
                    onChange={e => setFormData({ ...formData, session: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="MORNING">Morning (Breakfast)</option>
                    <option value="LUNCH">Afternoon (Lunch)</option>
                    <option value="DINING">Evening (Dining)</option>
                    <option value="ALL_DAY">All-Day Favorite</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Meals">Meals</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short appetizing description"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Add Dish to Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Existing Dish */}
      {editItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setEditItem(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-base font-bold text-slate-900 mb-1">Edit Dish Details</h2>
            <p className="text-xs text-slate-500 mb-4">
              Update dish name, price, session timing, or stock quantities.
            </p>

            <form onSubmit={handleSaveEditItem} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 font-semibold block mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={editItem.name}
                  onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editItem.price}
                    onChange={e => setEditItem({ ...editItem, price: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editItem.stock_quantity}
                    onChange={e => setEditItem({ ...editItem, stock_quantity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Session Allocation</label>
                  <select
                    value={editItem.session}
                    onChange={e => setEditItem({ ...editItem, session: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  >
                    <option value="MORNING">Morning (Breakfast)</option>
                    <option value="LUNCH">Afternoon (Lunch)</option>
                    <option value="DINING">Evening (Dining)</option>
                    <option value="ALL_DAY">All-Day Favorite</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Category</label>
                  <select
                    value={editItem.category}
                    onChange={e => setEditItem({ ...editItem, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Meals">Meals</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-1">Description</label>
                <input
                  type="text"
                  value={editItem.description || ''}
                  onChange={e => setEditItem({ ...editItem, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
