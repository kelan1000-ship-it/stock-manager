
import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Notebook, RotateCw, X, Archive, ArchiveRestore } from 'lucide-react';
import { CustomerRequest } from '../types';
import { useTooltip } from '../hooks/useTooltip';
import { SortHeader, Tooltip } from './ManagerComponents';

const RequestNotesIcon = ({ notes }: { notes?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!notes) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`p-1.5 rounded-lg transition-all shadow-sm border ${
          isOpen 
            ? 'bg-yellow-400 border-yellow-600 text-slate-950' 
            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20'
        }`}
        data-tooltip="View Inquiry Notes"
      >
        <Notebook size={14} />
      </button>
      
      {isOpen && (
        <div className="absolute z-[100] top-full left-0 mt-2 w-64 p-4 rounded-2xl bg-yellow-400 border-2 border-yellow-600 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in duration-200 pointer-events-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Notebook size={12} className="text-slate-900" />
              <span className="text-[10px] font-black uppercase text-slate-900 tracking-widest">Inquiry Notes</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              className="p-1 rounded hover:bg-yellow-500 transition-colors"
            >
              <X size={14} className="text-slate-900" />
            </button>
          </div>
          <p className="text-[11px] font-black text-slate-950 leading-relaxed italic pr-2">
            "{notes}"
          </p>
          {/* Visual pointer for the overlay */}
          <div className="absolute -top-1.5 left-3 w-3 h-3 bg-yellow-400 border-t-2 border-l-2 border-yellow-600 rotate-45" />
        </div>
      )}
    </div>
  );
};

interface RequestsViewProps {
  requests: CustomerRequest[];
  onEdit: (r: CustomerRequest) => void;
  onUpdate: (id: string, updates: Partial<CustomerRequest>) => void;
  onDelete: (id: string, permanent?: boolean) => void;
  onRestore: (id: string) => void;
  sortConfig: { key: string; direction: 'asc' | 'desc' }[];
  onSort: (key: string, multi: boolean) => void;
  requestTab: 'active' | 'archive' | 'bin';
}

export const RequestsView: React.FC<RequestsViewProps> = ({ 
  requests, 
  onEdit, 
  onUpdate,
  onDelete,
  onRestore,
  sortConfig,
  onSort,
  requestTab
}) => {
  const urgencyColors = {
    low: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
    medium: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    high: 'text-rose-500 bg-rose-500/10 border-rose-500/20'
  };

  const statusColors = {
    pending: 'bg-amber-500/10 text-amber-500',
    ordered: 'bg-indigo-500/10 text-indigo-500',
    ready: 'bg-emerald-500/10 text-emerald-500',
    completed: 'bg-slate-500/10 text-slate-500'
  };

  return (
    <div className="rounded-[2.5rem] border shadow-2xl overflow-visible animate-in fade-in slide-in-from-bottom-4 duration-500 bg-slate-950 border-slate-800">
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full text-left">
          <thead className="border-b bg-slate-950 border-slate-800">
            <tr>
              <SortHeader label="Customer / Contact" sortKey="customerName" config={sortConfig} onSort={onSort} />
              <SortHeader label="Item Details" sortKey="itemName" config={sortConfig} onSort={onSort} />
              <SortHeader label="Qty" sortKey="quantity" config={sortConfig} onSort={onSort} align="center" />
              <SortHeader label="Payment" sortKey="priceToPay" config={sortConfig} onSort={onSort} align="center" />
              <SortHeader label="Urgency" sortKey="urgency" config={sortConfig} onSort={onSort} align="center" />
              <SortHeader label="Status" sortKey="status" config={sortConfig} onSort={onSort} align="center" />
              <th className="p-6 text-right">
                <span className="font-black text-[10px] uppercase text-slate-500 tracking-wider">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-20 text-center text-slate-500 font-black uppercase text-xs tracking-widest">
                  No customer requests found
                </td>
              </tr>
            ) : requests.map(req => {
              const isCompleted = req.status === 'completed';
              return (
                <tr key={req.id} className={`transition-colors group hover:bg-slate-800/20 ${isCompleted ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => onEdit(req)} 
                        className={`font-black text-sm hover:text-emerald-500 transition-colors text-left ${isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}
                      >
                        {req.customerName}
                      </button>
                      <RequestNotesIcon notes={req.notes} />
                    </div>
                    <p className="text-[10px] font-bold mt-1 uppercase text-slate-500">{req.contactNumber}</p>
                  </td>
                  <td className="p-6">
                    <p className={`font-black text-sm ${isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}>{req.itemName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {req.supplier && <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">{req.supplier}</span>}
                      {req.barcode && <span className="text-[9px] font-mono text-slate-600">{req.barcode}</span>}
                      {req.productCode && <span className="text-[9px] font-mono text-indigo-500/70">PIP: {req.productCode}</span>}
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <span className={`font-black text-sm ${isCompleted ? 'text-slate-500' : 'text-white'}`}>{req.quantity}</span>
                  </td>
                  <td className="p-6 text-center">
                    <div className="flex flex-col items-center">
                      <span className={`font-black text-sm ${isCompleted ? 'text-slate-500' : 'text-white'}`}>£{req.priceToPay.toFixed(2)}</span>
                      <span className={`text-[8px] font-black uppercase tracking-tighter mt-1 ${req.isPaid ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {req.isPaid ? 'PAID' : 'DUE'}
                      </span>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <select
                      value={req.urgency}
                      onChange={(e) => onUpdate(req.id, { urgency: e.target.value as any })}
                      className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border outline-none cursor-pointer appearance-none text-center ${urgencyColors[req.urgency]}`}
                      disabled={requestTab !== 'active'}
                    >
                      <option value="low" className="bg-slate-900 text-slate-300">Low</option>
                      <option value="medium" className="bg-slate-900 text-amber-500">Medium</option>
                      <option value="high" className="bg-slate-900 text-rose-500">High</option>
                    </select>
                  </td>
                  <td className="p-6 text-center">
                    <select
                      value={req.status}
                      onChange={(e) => onUpdate(req.id, { status: e.target.value as any })}
                      className={`px-2 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest outline-none cursor-pointer appearance-none text-center ${statusColors[req.status]}`}
                      disabled={requestTab !== 'active'}
                    >
                      <option value="pending" className="bg-slate-900 text-amber-500">Pending</option>
                      <option value="ordered" className="bg-slate-900 text-indigo-500">Ordered</option>
                      <option value="ready" className="bg-slate-900 text-emerald-500">Ready</option>
                      <option value="completed" className="bg-slate-900 text-slate-500">Completed</option>
                    </select>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end items-center gap-2">
                      {requestTab === 'bin' ? (
                        <>
                          <button 
                            onClick={() => onRestore(req.id)} 
                            className="p-2.5 rounded-xl transition-all bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white"
                            data-tooltip="Restore Request"
                          >
                            <RotateCw size={18}/>
                          </button>
                          <button 
                            onClick={() => onDelete(req.id, true)} 
                            className="p-2.5 rounded-xl transition-all bg-slate-800 text-slate-400 hover:text-rose-500"
                            data-tooltip="Delete Permanently"
                          >
                            <Trash2 size={18}/>
                          </button>
                        </>
                      ) : requestTab === 'archive' ? (
                        <button 
                          onClick={() => onUpdate(req.id, { isArchived: false })} 
                          className="p-2.5 rounded-xl transition-all bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white"
                          data-tooltip="Restore to Active"
                        >
                          <ArchiveRestore size={18}/>
                        </button>
                      ) : (
                        <>
                          {isCompleted && (
                            <button 
                              onClick={() => onUpdate(req.id, { isArchived: true })} 
                              className="p-2.5 rounded-xl transition-all bg-amber-600/10 text-amber-500 hover:bg-amber-600 hover:text-white"
                              data-tooltip="Archive Completed Order"
                            >
                              <Archive size={18}/>
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              if (window.confirm('Are you sure you want to move this request to the bin?')) {
                                onDelete(req.id, false);
                              }
                            }} 
                            className="p-2.5 rounded-xl transition-all bg-slate-800 text-slate-400 hover:text-rose-500"
                            data-tooltip="Move to Bin"
                          >
                            <Trash2 size={18}/>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
