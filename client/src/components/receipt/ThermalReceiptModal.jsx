import React, { useState } from 'react';
import { X, Printer, Copy, Check, Sparkles, Send, FileText } from 'lucide-react';
import { triggerTestPrint } from '../../services/api';

export default function ThermalReceiptModal({ isOpen, onClose, receiptText, order }) {
  const [copied, setCopied] = useState(false);
  const [printingStation, setPrintingStation] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  function handleCopy() {
    if (!receiptText && !order?.receipt_text) return;
    const textToCopy = receiptText || order?.receipt_text || '';
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleBrowserPrint() {
    window.print();
  }

  async function handleSendToPrinter(printerId) {
    try {
      setPrintingStation(printerId);
      setStatusMsg('');
      const res = await triggerTestPrint(printerId);
      if (res.success) {
        setStatusMsg(`Dispatched test slip to ${printerId}!`);
        setTimeout(() => setStatusMsg(''), 3500);
      }
    } catch (err) {
      setStatusMsg(`Failed to print: ${err.message}`);
    } finally {
      setPrintingStation(null);
    }
  }

  const rawText = receiptText || order?.receipt_text || `====================================
      COLLEGE CANTEEN EXPRESS       
    FOOD PREPARATION ORDER SLIP     
====================================

       *** TOKEN #101 ***           
    >> VERIFY CLAIM CODE: [ 42 ] << 
      [ ONLINE PRE-ORDER ]          

====================================
Date: 20 Sep 2026     Time: 12:30 PM
Order: ORD-101        Paid: UPI
Customer: Student (21CS045)
------------------------------------
Dispatched To:  PRINTER 1 [Station A]
Load Balance:   Alternating (1:1)
------------------------------------
QTY  ITEM DESCRIPTION         AMOUNT
------------------------------------
1x   Masala Dosa              Rs.45
2x   Filter Coffee            Rs.40
------------------------------------
Total Items: 3        TOTAL: Rs.85.00
====================================
      >> SERVER INSTRUCTIONS <<     
   Prepare items & call Token #101  
 Match Customer Code [ 42 ] to Handover
   No duplicate billing. Single print.
====================================`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">58mm / 80mm Thermal Slip Preview</h2>
              <p className="text-xs text-slate-500">High-contrast thermal printer layout</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center justify-between">
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Paper Receipt Display Body */}
        <div className="my-4 flex-1 overflow-y-auto pr-1 flex justify-center">
          <div className="w-full max-w-[340px] bg-[#fbfbfa] text-slate-900 rounded-lg shadow-xl p-5 font-mono text-[11px] leading-relaxed border border-slate-300 relative select-all">
            {/* Serrated Top Edge */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 opacity-60" />

            <pre className="whitespace-pre-wrap font-mono font-medium text-slate-900 overflow-x-hidden">
              {rawText}
            </pre>

            {/* Serrated Bottom Edge */}
            <div className="mt-4 pt-3 border-t-2 border-dashed border-slate-400 text-center text-[9px] text-slate-600 font-mono">
              ★ ESC/POS 203 DPI • PAPER TEAR LINE ★
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row gap-2.5 shrink-0 justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
            <button
              onClick={handleBrowserPrint}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Browser Print</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleSendToPrinter('PRINTER_1')}
              disabled={printingStation !== null}
              className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
            >
              <Send className="w-3 h-3" />
              <span>{printingStation === 'PRINTER_1' ? 'Printing...' : 'Station A'}</span>
            </button>
            <button
              onClick={() => handleSendToPrinter('PRINTER_2')}
              disabled={printingStation !== null}
              className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all"
            >
              <Send className="w-3 h-3" />
              <span>{printingStation === 'PRINTER_2' ? 'Printing...' : 'Station B'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
