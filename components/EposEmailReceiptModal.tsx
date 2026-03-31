import React, { useState } from 'react';
import { X, Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { EposTransaction } from '../types';
import { BranchId } from '../types/auth';
import { sendReceiptEmail } from '../services/emailService';

interface EposEmailReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: EposTransaction | null;
  branchId: BranchId;
}

export function EposEmailReceiptModal({ isOpen, onClose, transaction, branchId }: EposEmailReceiptModalProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !transaction) return null;

  const handleSend = async () => {
    if (!email.trim()) return;
    setStatus('sending');
    setErrorMsg('');
    try {
      await sendReceiptEmail(email.trim(), transaction, branchId);
      setStatus('success');
      setTimeout(() => { onClose(); setStatus('idle'); setEmail(''); }, 2000);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.message || 'Failed to send email');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest">Email Receipt</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        {status === 'success' ? (
          <div className="text-center py-6">
            <CheckCircle size={40} className="mx-auto text-emerald-500 mb-2" />
            <p className="text-emerald-600 font-bold text-sm">Receipt sent!</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="text-gray-500 text-xs font-bold uppercase block mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                autoFocus
              />
            </div>

            {status === 'error' && (
              <div className="flex items-center gap-2 text-red-500 text-xs mb-3">
                <AlertCircle size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={!email.trim() || status === 'sending'}
              className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                !email.trim() || status === 'sending'
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
            >
              {status === 'sending' ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Mail size={16} /> Send Receipt</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
