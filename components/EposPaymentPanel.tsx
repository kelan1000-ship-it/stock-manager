import React, { useCallback } from 'react';
import { CreditCard, Banknote, Blend } from 'lucide-react';

interface EposPaymentPanelProps {
  total: number;
  paymentMethod: 'cash' | 'card' | 'mixed';
  setPaymentMethod: (m: 'cash' | 'card' | 'mixed') => void;
  amountTendered: string;
  setAmountTendered: (v: string) => void;
  changeDue: number;
  canCompleteSale: boolean;
  onCompleteSale: () => void;
  isRefundMode?: boolean;
  onCompleteRefund?: () => void;
}

export function EposPaymentPanel({
  total, paymentMethod, setPaymentMethod,
  amountTendered, setAmountTendered,
  changeDue, canCompleteSale, onCompleteSale,
  isRefundMode, onCompleteRefund,
}: EposPaymentPanelProps) {

  const handleNumpad = useCallback((val: string) => {
    if (val === 'C') {
      setAmountTendered('');
      return;
    }

    // Treat as sequence of digits for rolling decimal input
    const currentDigits = amountTendered.replace(/[^0-9]/g, '');
    let nextDigits = '';

    if (val === '⌫') {
      nextDigits = currentDigits.slice(0, -1);
    } else if (val === '00') {
      nextDigits = currentDigits + '00';
    } else if (/[0-9]/.test(val)) {
      nextDigits = currentDigits + val;
    } else {
      // Ignore '.' or other non-digit keys in rolling mode
      return;
    }

    if (!nextDigits || parseInt(nextDigits) === 0) {
      setAmountTendered('');
    } else {
      const numericValue = parseInt(nextDigits) / 100;
      setAmountTendered(numericValue.toFixed(2));
    }
  }, [amountTendered, setAmountTendered]);

  const handleMethodChange = useCallback((method: 'cash' | 'card' | 'mixed') => {
    setPaymentMethod(method);
    if (method === 'card') {
      setAmountTendered(total.toFixed(2));
    } else {
      setAmountTendered('');
    }
  }, [setPaymentMethod, setAmountTendered, total]);

  // Quick cash amounts
  const quickAmounts = [5, 10, 20, 50].filter(v => v >= total);

  return (
    <div className="space-y-4">
      {/* Payment Method Toggle */}
      <div className="flex p-1 rounded-xl bg-gray-100 border border-gray-200">
        {([
          { key: 'cash' as const, icon: Banknote, label: 'Cash' },
          { key: 'card' as const, icon: CreditCard, label: 'Card' },
          { key: 'mixed' as const, icon: Blend, label: 'Mixed' },
        ]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => handleMethodChange(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              paymentMethod === key
                ? key === 'cash' ? 'bg-emerald-600 text-white' : key === 'card' ? 'bg-blue-600 text-white' : 'bg-violet-600 text-white'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Amount / Numpad for cash or mixed */}
      {paymentMethod !== 'card' && (
        <>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <label className="text-gray-400 text-xs font-bold uppercase tracking-widest">
              {paymentMethod === 'mixed' ? 'Cash Portion' : 'Amount Tendered'}
            </label>
            <div className="text-gray-900 text-3xl font-black mt-1">
              £{amountTendered || '0.00'}
            </div>
          </div>

          {paymentMethod === 'mixed' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex justify-between items-center animate-in slide-in-from-top-2 duration-300">
               <span className="text-blue-600 text-[10px] font-black uppercase tracking-widest">Remaining (Card)</span>
               <span className="text-xl font-black text-blue-700">
                  £{Math.max(0, total - (parseFloat(amountTendered) || 0)).toFixed(2)}
               </span>
            </div>
          )}

          {/* Quick amounts */}
          {quickAmounts.length > 0 && (
            <div className="flex gap-2">
              {quickAmounts.map(amt => (
                <button
                  key={amt}
                  onClick={() => setAmountTendered(amt.toFixed(2))}
                  className="flex-1 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 font-bold text-sm hover:bg-indigo-100 transition-colors"
                >
                  £{amt.toFixed(2)}
                </button>
              ))}
              <button
                onClick={() => setAmountTendered(total.toFixed(2))}
                className="flex-1 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 font-bold text-sm hover:bg-blue-100 transition-colors"
              >
                Exact
              </button>
            </div>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-4 gap-1.5">
            {['7','8','9','⌫','4','5','6','C','1','2','3','00','0'].map(key => (
              <button
                key={key}
                onClick={() => handleNumpad(key)}
                className={`py-3 rounded-xl font-bold text-lg transition-colors ${
                  key === 'C' ? 'bg-red-50 text-red-500 hover:bg-red-100' :
                  key === '⌫' ? 'bg-amber-50 text-amber-500 hover:bg-amber-100' :
                  key === '0' ? 'col-span-2 bg-gray-50 border border-gray-200 text-gray-900 hover:bg-gray-100' :
                  'bg-gray-50 border border-gray-200 text-gray-900 hover:bg-gray-100'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          {/* Change Due */}
          <div className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <span className="text-gray-500 text-sm font-bold">Change Due</span>
            <span className={`text-xl font-black ${changeDue > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
              £{changeDue.toFixed(2)}
            </span>
          </div>
        </>
      )}

      {paymentMethod === 'card' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <CreditCard size={32} className="mx-auto text-blue-500 mb-2" />
          <p className="text-blue-600 font-bold text-sm">Card Payment</p>
          <p className="text-gray-900 text-2xl font-black mt-1">£{total.toFixed(2)}</p>
          <p className="text-gray-400 text-xs mt-2">Amount will be charged exactly</p>
        </div>
      )}

      {/* Complete Sale / Refund */}
      <button
        onClick={isRefundMode ? onCompleteRefund : onCompleteSale}
        disabled={!canCompleteSale}
        className={`w-full py-5 rounded-2xl font-black text-lg uppercase tracking-widest transition-all ${
          canCompleteSale
            ? isRefundMode
              ? 'bg-orange-600 text-white hover:bg-orange-500 shadow-lg shadow-orange-200 active:scale-[0.98]'
              : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-200 active:scale-[0.98]'
            : 'bg-gray-100 text-gray-300 cursor-not-allowed'
        }`}
      >
        {isRefundMode ? 'Process Refund' : (
          paymentMethod === 'mixed' && parseFloat(amountTendered) < total && parseFloat(amountTendered) > 0
            ? `Complete Sale (£${(total - parseFloat(amountTendered)).toFixed(2)} on Card)`
            : 'Complete Sale'
        )}
      </button>
    </div>
  );
}
