import React, { useState, useEffect } from 'react';
import { Printer, RotateCw, Volume2, VolumeX, ShieldAlert, FileText, Cpu, ArrowLeftRight, CheckCircle2, AlertTriangle, Radio } from 'lucide-react';
import { getPrinterStatus, setPrinterStatus, reprintOrder } from '../../services/api';

export default function DualPrinterMonitor({ lastPrintedJob }) {
  const [printersData, setPrintersData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [reprintModalOpen, setReprintModalOpen] = useState(false);
  const [selectedOrderForReprint, setSelectedOrderForReprint] = useState(null);
  const [reprintReason, setReprintReason] = useState('Paper tear / Lost in kitchen');
  const [reprinting, setReprinting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (lastPrintedJob) {
      if (soundEnabled) playPrintChime();
      loadStatus();
    }
  }, [lastPrintedJob]);

  function playPrintChime() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {}
  }

  async function loadStatus() {
    try {
      const res = await getPrinterStatus();
      if (res.success) setPrintersData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusToggle(printerId, currentStatus) {
    const nextStatus = currentStatus === 'ONLINE' ? 'PAPER_OUT' : 'ONLINE';
    try {
      await setPrinterStatus(printerId, nextStatus);
      loadStatus();
      setFeedbackMsg(`${printerId} status changed to ${nextStatus}. System will automatically reroute if needed.`);
      setTimeout(() => setFeedbackMsg(''), 4000);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleReprintSubmit() {
    if (!selectedOrderForReprint) return;
    try {
      setReprinting(true);
      const res = await reprintOrder(selectedOrderForReprint.orderId, reprintReason);
      if (res.success) {
        setFeedbackMsg(`Reprinted slip for Token #${selectedOrderForReprint.tokenNumber} stamped as DUPLICATE.`);
        setReprintModalOpen(false);
        loadStatus();
        setTimeout(() => setFeedbackMsg(''), 5000);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setReprinting(false);
    }
  }

  const p1 = printersData?.printers?.PRINTER_1;
  const p2 = printersData?.printers?.PRINTER_2;
  const totalJobs = (p1?.printCount || 0) + (p2?.printCount || 0);
  const p1Ratio = totalJobs > 0 ? Math.round(((p1?.printCount || 0) / totalJobs) * 100) : 50;
  const p2Ratio = totalJobs > 0 ? 100 - p1Ratio : 50;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Top Architecture Banner */}
      <div className="mb-6 p-5 rounded-3xl bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Local Print Agent & Dual-Printer Monitor
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Cloud Queue ➔ Local Print Agent ➔ PRINTER 1 (Station A) & PRINTER 2 (Station B) ➔ Physical Paper Bill
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Balance Ratio Pill */}
            <div className="bg-slate-50 px-3.5 py-1.5 rounded-2xl border border-slate-200 flex items-center space-x-2.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
              <div className="text-xs font-mono">
                <span className="text-blue-600 font-bold">{p1Ratio}%</span>
                <span className="text-slate-400 mx-1">|</span>
                <span className="text-indigo-600 font-bold">{p2Ratio}%</span>
              </div>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border text-xs transition ${
                soundEnabled
                  ? 'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
              title={soundEnabled ? 'Print Chime Enabled' : 'Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={loadStatus}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition"
              title="Refresh"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1:1 Progress Split */}
        <div className="mt-4 pt-3 border-t border-slate-200">
          <div className="flex justify-between text-[11px] font-mono text-slate-500 mb-1">
            <span>Station A - Printer 1 ({p1?.printCount || 0} Slips)</span>
            <span>Station B - Printer 2 ({p2?.printCount || 0} Slips)</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
            <div style={{ width: `${p1Ratio}%` }} className="h-full bg-blue-500 transition-all duration-500" />
            <div style={{ width: `${p2Ratio}%` }} className="h-full bg-indigo-400 transition-all duration-500" />
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Split Columns for Printer 1 and Printer 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PrinterStationCard
          printerKey="PRINTER_1"
          printer={p1}
          stationLabel="Kitchen Station A (Dosa / Meals)"
          accentColor="orange"
          onToggleStatus={() => handleStatusToggle('PRINTER_1', p1?.status)}
          onSelectReprint={(job) => {
            setSelectedOrderForReprint(job);
            setReprintModalOpen(true);
          }}
        />

        <PrinterStationCard
          printerKey="PRINTER_2"
          printer={p2}
          stationLabel="Kitchen Station B (Snacks / Drinks)"
          accentColor="amber"
          onToggleStatus={() => handleStatusToggle('PRINTER_2', p2?.status)}
          onSelectReprint={(job) => {
            setSelectedOrderForReprint(job);
            setReprintModalOpen(true);
          }}
        />
      </div>

      {/* Supervisor Reprint Modal */}
      {reprintModalOpen && selectedOrderForReprint && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center space-x-3 text-blue-600 mb-3">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Supervisor Authorized Reprint</h3>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Standard duplicate printing is strictly rejected to prevent kitchen staff from preparing food twice. Authorized reprints are watermarked with <strong>*** DUPLICATE ***</strong>.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono mb-4 text-slate-700">
              <div>Order: {selectedOrderForReprint.orderNumber}</div>
              <div>Token: #{selectedOrderForReprint.tokenNumber}</div>
              <div>Station: {selectedOrderForReprint.printerName}</div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-600 block mb-1">Reason for Reprint</label>
              <input
                type="text"
                value={reprintReason}
                onChange={e => setReprintReason(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setReprintModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleReprintSubmit}
                disabled={reprinting}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/20"
              >
                {reprinting ? 'Printing...' : 'Print Watermarked Duplicate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PrinterStationCard({ printerKey, printer, stationLabel, accentColor, onToggleStatus, onSelectReprint }) {
  const isOnline = printer?.status === 'ONLINE';
  const recentJobs = printer?.recentJobs || [];
  const latestJob = recentJobs[0];

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl ${accentColor === 'orange' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'}`}>
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{printer?.name || stationLabel}</h2>
              <div className="text-[11px] text-slate-500 font-mono">
                Workload: Alternating Round-Robin (1:1)
              </div>
            </div>
          </div>

          <button
            onClick={onToggleStatus}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition flex items-center space-x-1.5 ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
            title="Toggle to simulate Paper Out / Disconnect for failover testing"
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span>{printer?.status || 'ONLINE'}</span>
          </button>
        </div>

        {/* Physical Paper Slot & Slip */}
        <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Thermal Receipt Slip (Paper Copy)</span>
            </span>
            <span className="font-mono text-[10px]">ESC/POS Format</span>
          </div>

          <div className="w-full h-1.5 bg-slate-300 rounded-full shadow-inner border border-slate-200 mb-3" />

          <div className="flex justify-center">
            {latestJob ? (
              <div className="w-full max-w-sm thermal-slip p-4 rounded text-[11px] leading-snug animate-print-roll shadow-xl">
                <pre className="whitespace-pre-wrap font-mono font-medium select-all">
                  {latestJob.receiptText}
                </pre>
                <div className="mt-2 pt-2 border-t border-dashed border-slate-400/40 flex justify-between items-center text-[10px] text-slate-600">
                  <span>Tear & place on kitchen food rail</span>
                  <button
                    onClick={() => onSelectReprint(latestJob)}
                    className="text-blue-600 hover:text-blue-800 font-bold underline"
                  >
                    Reprint
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                <Printer className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Waiting for next incoming order in turn...
              </div>
            )}
          </div>
        </div>

        {/* Recent Printed History */}
        <div className="mt-4">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Recent Slips Dispatched ({recentJobs.length})</span>
            <span className="text-[10px] font-mono text-slate-400">No Duplicates</span>
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
            {recentJobs.slice(1, 6).map((job, idx) => (
              <div
                key={idx}
                className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <span className="font-bold text-slate-900">Token #{job.tokenNumber}</span>
                  <span className="text-slate-400 ml-1.5">({job.orderNumber})</span>
                  <span className={`text-[10px] ml-2 px-1.5 py-0.5 rounded ${
                    job.orderSource === 'DIGITAL_WEB' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {job.orderSource === 'DIGITAL_WEB' ? 'WEB' : 'POS'}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-slate-500 text-[11px]">
                  <span>₹{job.totalAmount}</span>
                  <button
                    onClick={() => onSelectReprint(job)}
                    className="text-slate-400 hover:text-blue-600"
                    title="Reprint"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
