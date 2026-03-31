import React, { useState } from 'react';
import { FileText, TrendingUp, ShoppingBag, CreditCard, Banknote, Blend, BarChart3, RotateCcw, Pencil, Trash2, X, Check } from 'lucide-react';
import { EposZRead } from '../types';

interface EposZReadViewProps {
  currentDaySummary: {
    transactionCount: number;
    voidedCount: number;
    totalSales: number;
    totalCash: number;
    totalCard: number;
    totalMixed: number;
    itemsSold: number;
    topItems: { name: string; quantity: number; total: number }[];
    totalRefunded: number;
    refundCount: number;
  };
  pastZReads: EposZRead[];
  onGenerateZRead: () => void;
  isAdmin?: boolean;
  onDeleteZRead?: (id: string) => void;
  onEditZRead?: (zRead: EposZRead) => void;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className={color} />
        <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-gray-900 text-2xl font-black">{value}</p>
    </div>
  );
}

function EditZReadForm({ zRead, onSave, onCancel }: { zRead: EposZRead; onSave: (z: EposZRead) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    totalSales: zRead.totalSales,
    totalCash: zRead.totalCash,
    totalCard: zRead.totalCard,
    totalMixed: zRead.totalMixed,
    itemsSold: zRead.itemsSold,
    operator: zRead.operator,
  });

  const handleSave = () => {
    onSave({
      ...zRead,
      totalSales: form.totalSales,
      totalCash: form.totalCash,
      totalCard: form.totalCard,
      totalMixed: form.totalMixed,
      itemsSold: form.itemsSold,
      operator: form.operator,
    });
  };

  const fields: { key: keyof typeof form; label: string; type: 'number' | 'text' }[] = [
    { key: 'totalSales', label: 'Total Sales (£)', type: 'number' },
    { key: 'totalCash', label: 'Cash (£)', type: 'number' },
    { key: 'totalCard', label: 'Card (£)', type: 'number' },
    { key: 'totalMixed', label: 'Mixed (£)', type: 'number' },
    { key: 'itemsSold', label: 'Items Sold', type: 'number' },
    { key: 'operator', label: 'Operator', type: 'text' },
  ];

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-2 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.key}>
            <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{f.label}</label>
            <input
              type={f.type}
              step={f.type === 'number' ? '0.01' : undefined}
              value={form[f.key]}
              onChange={(e) => setForm(prev => ({
                ...prev,
                [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
              }))}
              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors">
          <Check size={12} /> Save
        </button>
        <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-300 transition-colors">
          <X size={12} /> Cancel
        </button>
      </div>
    </div>
  );
}

export function EposZReadView({ currentDaySummary, pastZReads, onGenerateZRead, isAdmin, onDeleteZRead, onEditZRead }: EposZReadViewProps) {
  const s = currentDaySummary;
  const avgTransaction = s.transactionCount > 0 ? s.totalSales / s.transactionCount : 0;
  const [editingZReadId, setEditingZReadId] = useState<string | null>(null);
  const [deletingZReadId, setDeletingZReadId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Current Period Stats */}
      <div>
        <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest mb-4">Current Period</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Net Sales" value={`£${s.totalSales.toFixed(2)}`} icon={TrendingUp} color="text-emerald-500" />
          <StatCard label="Transactions" value={String(s.transactionCount)} icon={FileText} color="text-blue-500" />
          <StatCard label="Items Sold" value={String(s.itemsSold)} icon={ShoppingBag} color="text-violet-500" />
          <StatCard label="Avg Transaction" value={`£${avgTransaction.toFixed(2)}`} icon={BarChart3} color="text-amber-500" />
        </div>
      </div>

      {/* Payment Breakdown */}
      <div>
        <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest mb-4">Payment Breakdown</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
            <Banknote size={20} className="mx-auto text-emerald-500 mb-2" />
            <p className="text-emerald-600 text-xs font-bold uppercase">Cash</p>
            <p className="text-gray-900 text-xl font-black">£{s.totalCash.toFixed(2)}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
            <CreditCard size={20} className="mx-auto text-blue-500 mb-2" />
            <p className="text-blue-600 text-xs font-bold uppercase">Card</p>
            <p className="text-gray-900 text-xl font-black">£{s.totalCard.toFixed(2)}</p>
          </div>
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 text-center">
            <Blend size={20} className="mx-auto text-violet-500 mb-2" />
            <p className="text-violet-600 text-xs font-bold uppercase">Mixed</p>
            <p className="text-gray-900 text-xl font-black">£{s.totalMixed.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {s.totalRefunded > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <RotateCcw size={14} className="text-orange-500" />
            <span className="text-orange-600 text-sm font-bold">Refunds ({s.refundCount})</span>
          </div>
          <span className="text-orange-600 text-lg font-black">-£{s.totalRefunded.toFixed(2)}</span>
        </div>
      )}

      {s.voidedCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex justify-between items-center">
          <span className="text-red-600 text-sm font-bold">Voided Transactions</span>
          <span className="text-red-600 text-lg font-black">{s.voidedCount}</span>
        </div>
      )}

      {/* Top Sellers */}
      {s.topItems.length > 0 && (
        <div>
          <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest mb-4">Top Sellers</h3>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            {s.topItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0">
                <span className="text-gray-300 text-xs font-mono w-5">{i + 1}.</span>
                <span className="text-gray-900 text-sm flex-1">{item.name}</span>
                <span className="text-gray-400 text-xs">×{item.quantity}</span>
                <span className="text-gray-900 font-bold text-sm">£{item.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate Z-Read */}
      <button
        onClick={onGenerateZRead}
        disabled={s.transactionCount === 0 && s.voidedCount === 0 && s.refundCount === 0}
        className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-sm uppercase tracking-widest hover:bg-blue-500 transition-colors disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed shadow-lg"
      >
        Generate Z-Read Snapshot
      </button>

      {/* Past Z-Reads */}
      {pastZReads.length > 0 && (
        <div>
          <h3 className="text-gray-900 font-black text-sm uppercase tracking-widest mb-4">Past Z-Reads</h3>
          <div className="space-y-2">
            {pastZReads.map(z => (
              <div key={z.id}>
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-4 shadow-sm">
                  <FileText size={14} className="text-gray-400" />
                  <div className="flex-1">
                    <p className="text-gray-900 text-sm font-medium">
                      {new Date(z.timestamp).toLocaleDateString('en-GB')} · {new Date(z.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {z.transactionCount} transactions · {z.itemsSold} items · {z.operator}
                      {(z.totalRefunded ?? 0) > 0 && ` · ${z.refundCount} refund${z.refundCount !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-600 font-black text-lg">£{z.totalSales.toFixed(2)}</span>
                    {(z.totalRefunded ?? 0) > 0 && (
                      <p className="text-orange-500 text-xs font-bold">-£{z.totalRefunded.toFixed(2)} refunded</p>
                    )}
                  </div>
                  {isAdmin && onEditZRead && onDeleteZRead && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingZReadId(editingZReadId === z.id ? null : z.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                        data-tooltip="Edit Z-Read"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeletingZReadId(z.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        data-tooltip="Delete Z-Read"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Delete confirmation */}
                {deletingZReadId === z.id && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-2 flex items-center justify-between">
                    <p className="text-red-700 text-sm font-medium">Are you sure you want to delete this Z-Read? This cannot be undone.</p>
                    <div className="flex gap-2 shrink-0 ml-4">
                      <button
                        onClick={() => { onDeleteZRead!(z.id); setDeletingZReadId(null); }}
                        className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500 transition-colors"
                      >Delete</button>
                      <button
                        onClick={() => setDeletingZReadId(null)}
                        className="px-4 py-2 rounded-xl bg-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-300 transition-colors"
                      >Cancel</button>
                    </div>
                  </div>
                )}

                {/* Edit form */}
                {editingZReadId === z.id && onEditZRead && (
                  <EditZReadForm
                    zRead={z}
                    onSave={(updated) => { onEditZRead(updated); setEditingZReadId(null); }}
                    onCancel={() => setEditingZReadId(null)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
