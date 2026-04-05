import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2, Ban, Calendar, RotateCcw, Mail, Search, Printer, FileText } from 'lucide-react';
import { EposTransaction } from '../types';

interface EposTransactionHistoryProps {
  transactions: EposTransaction[];
  dateFilter: { start: string; end: string };
  setDateFilter: (f: { start: string; end: string }) => void;
  onVoid: (id: string, reason: string) => void;
  onDelete: (id: string) => void;
  onRefundItems: (txId: string, itemIds: string[], method: 'cash' | 'card') => void;
  onEmailReceipt?: (tx: EposTransaction) => void;
  onReprintReceipt?: (tx: EposTransaction) => void;
  onPrintVatReceipt?: (tx: EposTransaction) => void;
  isAdmin: boolean;
}

export function EposTransactionHistory({ transactions, dateFilter, setDateFilter, onVoid, onDelete, onRefundItems, onEmailReceipt, onReprintReceipt, onPrintVatReceipt, isAdmin }: EposTransactionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refundingTxId, setRefundingTxId] = useState<string | null>(null);
  const [selectedRefundItems, setSelectedRefundItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const handleVoid = (id: string) => {
    if (confirm('Are you sure you want to void this transaction?')) {
      const reason = prompt('Reason for voiding this transaction:');
      if (reason !== null) onVoid(id, reason);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Permanently delete this transaction? This cannot be undone.')) {
      onDelete(id);
    }
  };

  const startRefundMode = (txId: string) => {
    setRefundingTxId(txId);
    setSelectedRefundItems(new Set());
  };

  const cancelRefundMode = () => {
    setRefundingTxId(null);
    setSelectedRefundItems(new Set());
  };

  const toggleRefundItem = (itemId: string) => {
    setSelectedRefundItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const confirmRefund = (txId: string, method: 'cash' | 'card') => {
    if (selectedRefundItems.size === 0) return;
    onRefundItems(txId, Array.from(selectedRefundItems), method);
    cancelRefundMode();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
        <Search size={16} className="text-gray-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by product name or amount..."
          className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 text-xs font-bold">Clear</button>
        )}
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
        <Calendar size={16} className="text-gray-400" />
        <label className="text-gray-500 text-xs font-bold uppercase">From</label>
        <input
          type="date"
          value={dateFilter.start}
          onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 text-sm focus:outline-none focus:border-blue-500"
        />
        <label className="text-gray-500 text-xs font-bold uppercase">To</label>
        <input
          type="date"
          value={dateFilter.end}
          onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
          className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {(() => {
        const query = searchQuery.toLowerCase().trim();
        const filteredTransactions = query
          ? transactions.filter(tx =>
              tx.items.some(i => i.name.toLowerCase().includes(query)) ||
              tx.total.toFixed(2).includes(query)
            )
          : transactions;
        return filteredTransactions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm font-medium">No transactions found</p>
          <p className="text-xs mt-1">Adjust the date range or complete a sale</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredTransactions.map(tx => {
            const isExpanded = expandedId === tx.id;
            const isRefunding = refundingTxId === tx.id;
            const timestamp = new Date(tx.timestamp).toLocaleString('en-GB', { 
              day: '2-digit', 
              month: '2-digit', 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            const itemsSummary = tx.items.length === 1
              ? tx.items[0].name
              : `${tx.items[0].name} +${tx.items.length - 1} more`;
            const hasNonRefundedItems = tx.items.some(i => !i.refunded);

            return (
              <div key={tx.id} className={`border rounded-xl overflow-hidden ${tx.voided ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
                <button
                  onClick={() => {
                    setExpandedId(isExpanded ? null : tx.id);
                    if (isExpanded) cancelRefundMode();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                  <span className="text-gray-400 text-xs font-mono">{timestamp}</span>
                  <span className="text-gray-900 text-sm flex-1 truncate">{itemsSummary}</span>
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-lg ${
                    tx.paymentMethod === 'cash' ? 'bg-emerald-100 text-emerald-600' :
                    tx.paymentMethod === 'card' ? 'bg-blue-100 text-blue-600' :
                    'bg-violet-100 text-violet-600'
                  }`}>{tx.paymentMethod}</span>
                  {(() => {
                    const totalRefunded = (tx.refunds || []).reduce((s, r) => s + r.amount, 0);
                    const isFullRefund = totalRefunded > 0 && !tx.items.some(i => !i.refunded);
                    const isPartRefund = totalRefunded > 0 && tx.items.some(i => !i.refunded);
                    const isRefundTx = tx.type === 'refund';
                    const netTotal = tx.total - totalRefunded;
                    return (
                      <>
                        {(totalRefunded > 0 && !tx.voided) ? (
                          <span className="flex items-center gap-1.5">
                            <span className="text-gray-400 text-sm line-through">£{tx.total.toFixed(2)}</span>
                            <span className="text-gray-900 font-bold text-sm">(£{netTotal.toFixed(2)})</span>
                          </span>
                        ) : (
                          <span className={`font-bold text-sm ${tx.voided ? 'text-red-500 line-through' : isRefundTx ? 'text-orange-600' : 'text-gray-900'}`}>
                            {isRefundTx ? '-' : ''}£{tx.total.toFixed(2)}
                          </span>
                        )}
                      </>
                    );
                  })()}
                  {tx.voided && <span className="text-red-500 text-xs font-bold">VOID</span>}
                  {tx.type === 'refund' && !tx.voided && (
                    <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-lg">REFUND</span>
                  )}
                  {!tx.voided && tx.type !== 'refund' && (() => {
                    const totalRefunded = (tx.refunds || []).reduce((s, r) => s + r.amount, 0);
                    if (totalRefunded <= 0) return null;
                    const isPartial = tx.items.some(i => !i.refunded);
                    return (
                      <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-lg">
                        {isPartial ? 'PART REFUND' : 'REFUNDED'} £{totalRefunded.toFixed(2)}
                      </span>
                    );
                  })()}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100">
                    <div className="space-y-2 mb-3">
                      {tx.items.map(item => (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 text-sm ${item.refunded ? 'opacity-60' : ''}`}
                        >
                          {isRefunding && !item.refunded && (
                            <input
                              type="checkbox"
                              checked={selectedRefundItems.has(item.id)}
                              onChange={() => toggleRefundItem(item.id)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                            />
                          )}
                          <span className={`flex-1 text-gray-600 ${item.refunded ? 'line-through' : ''}`} style={{ fontSize: 'var(--product-title-size, 14px)' }}>
                            {item.name}
                          </span>
                          <span className="text-gray-400 text-xs w-10 text-center">×{item.quantity}</span>
                          <span className="text-gray-400 text-xs w-16 text-right">@ £{item.unitPrice.toFixed(2)}</span>
                          <span className={`font-medium w-16 text-right ${item.refunded ? 'text-red-400 line-through' : 'text-gray-900'}`}>
                            £{item.lineTotal.toFixed(2)}
                          </span>
                          {item.refunded ? (
                            <span className="text-red-500 text-[10px] font-bold uppercase bg-red-50 px-1.5 py-0.5 rounded w-24 text-center">
                              Refunded{item.refundMethod ? ` (${item.refundMethod})` : ''}
                            </span>
                          ) : (
                            !isRefunding && <span className="w-24" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Discount display */}
                    {(tx.discountPercent ?? 0) > 0 && (
                      <div className="flex justify-between text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-1.5 mb-3">
                        <span>Discount ({tx.discountPercent}%)</span>
                        <span>-£{(tx.discountAmount ?? 0).toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                      <span>ID: {tx.id.slice(0, 8)}</span>
                      <span>{tx.operator}</span>
                    </div>
                    {tx.voided && tx.voidReason && (
                      <p className="text-red-500 text-xs mb-3">Void reason: {tx.voidReason}</p>
                    )}

                    {/* Refund selection mode controls */}
                    {isRefunding ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmRefund(tx.id, 'cash')}
                          disabled={selectedRefundItems.size === 0}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Cash Refund
                        </button>
                        <button
                          onClick={() => confirmRefund(tx.id, 'card')}
                          disabled={selectedRefundItems.size === 0}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Card Refund
                        </button>
                        <button
                          onClick={cancelRefundMode}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-bold hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {!tx.voided && hasNonRefundedItems && (
                          <button
                            onClick={() => startRefundMode(tx.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 text-xs font-bold hover:bg-orange-100 transition-colors"
                          >
                            <RotateCcw size={12} /> Refund
                          </button>
                        )}
                        {!tx.voided && (
                          <button onClick={() => handleVoid(tx.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-xs font-bold hover:bg-amber-100 transition-colors">
                            <Ban size={12} /> Void
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleDelete(tx.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100 transition-colors">
                            <Trash2 size={12} /> Delete
                          </button>
                        )}
                        {onReprintReceipt && (
                          <button onClick={() => onReprintReceipt(tx)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold hover:bg-emerald-100 transition-colors ml-auto">
                            <Printer size={14} /> Reprint
                          </button>
                        )}
                        {onPrintVatReceipt && (
                          <button onClick={() => onPrintVatReceipt(tx)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 text-xs font-bold hover:bg-violet-100 transition-colors">
                            <FileText size={14} /> VAT Receipt
                          </button>
                        )}
                        {onEmailReceipt && (
                          <button onClick={() => onEmailReceipt(tx)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors ${!onReprintReceipt ? 'ml-auto' : ''}`}>
                            <Mail size={12} /> Email Receipt
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
      })()}
    </div>
  );
}
