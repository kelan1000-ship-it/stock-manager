import React, { useState, useEffect } from 'react';
import { Check, Printer, Mail, X, AlertCircle, Globe, Undo2 } from 'lucide-react';
import { EposTransaction } from '../types';

interface EposReceiptPromptProps {
  transaction: EposTransaction;
  printerStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  onNoPrint: () => void;
  onPrintReceipt: () => void;
  onBrowserPrint: () => void;
  onEmailReceipt: () => void;
  onResumeCart?: () => void;
}

export function EposReceiptPrompt({
  transaction,
  printerStatus,
  onNoPrint,
  onPrintReceipt,
  onBrowserPrint,
  onEmailReceipt,
  onResumeCart,
}: EposReceiptPromptProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRefund = transaction.type === 'refund';
  const printerConnected = printerStatus === 'connected';

  // Auto-dismiss after 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onNoPrint();
    }, 30000);
    return () => clearTimeout(timer);
  }, [onNoPrint]);

  const handleAction = async (action: () => void | Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e: any) {
      setError(e?.message || 'An error occurred');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onNoPrint}>
      <div className="bg-white border border-gray-200 rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200 relative" onClick={(e) => e.stopPropagation()}>
        {/* Resume Button */}
        {onResumeCart && (
           <button 
              onClick={() => handleAction(onResumeCart)}
              disabled={busy}
              className="absolute top-6 left-6 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-900 hover:bg-white hover:border-gray-300 transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
              data-tooltip="Return to cart and add more items"
           >
              <Undo2 size={14} />
              Resume
           </button>
        )}

        {/* Status icon */}
        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
          isRefund ? 'bg-orange-100' : 'bg-emerald-100'
        }`}>
          <Check size={32} className={isRefund ? 'text-orange-500' : 'text-emerald-500'} />
        </div>

        {/* Title */}
        <h3 className={`text-center font-black text-lg mb-1 ${
          isRefund ? 'text-orange-600' : 'text-emerald-600'
        }`}>
          {isRefund ? 'REFUND COMPLETE' : 'SALE COMPLETE'}
        </h3>

        {/* Total */}
        <p className="text-center text-gray-900 text-3xl font-black">
          £{transaction.total.toFixed(2)}
        </p>

        {/* Change due */}
        {transaction.changeDue > 0 && (
          <p className="text-center text-amber-600 text-lg font-bold mt-1">
            Change: £{transaction.changeDue.toFixed(2)}
          </p>
        )}

        {/* Payment method */}
        <p className="text-center text-gray-400 text-xs mt-2">
          {transaction.paymentMethod.toUpperCase()} · {transaction.items.length} item{transaction.items.length !== 1 ? 's' : ''}
        </p>

        {/* Printer status indicator */}
        <div className="flex items-center justify-center gap-1.5 mt-3 mb-5">
          <div className={`w-2 h-2 rounded-full ${
            printerConnected ? 'bg-emerald-500' :
            printerStatus === 'connecting' ? 'bg-amber-400 animate-pulse' :
            'bg-gray-300'
          }`} />
          <span className="text-gray-400 text-[10px] font-medium">
            Printer {printerConnected ? 'connected' : printerStatus === 'connecting' ? 'connecting...' : 'not connected'}
          </span>
        </div>

        {/* Error display */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-4">
            <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-red-600 text-xs">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2">
          {/* Print Receipt (serial) */}
          {printerConnected && (
            <button
              onClick={() => handleAction(onPrintReceipt)}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Printer size={16} />
              Print Receipt
            </button>
          )}

          {/* Browser Print — always available, primary when no serial */}
          <button
            onClick={() => handleAction(onBrowserPrint)}
            disabled={busy}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 ${
              printerConnected
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-[0.98]'
                : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.98]'
            }`}
          >
            <Globe size={16} />
            {printerConnected ? 'Browser Print' : 'Print Receipt'}
          </button>

          {/* Email Receipt */}
          <button
            onClick={() => handleAction(onEmailReceipt)}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-500 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Mail size={16} />
            Email Receipt
          </button>

          {/* No Receipt */}
          <button
            onClick={() => handleAction(onNoPrint)}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <X size={16} />
            No Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
