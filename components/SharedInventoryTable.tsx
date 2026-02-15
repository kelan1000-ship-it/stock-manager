
import React from 'react';
import { Handshake } from 'lucide-react';
import { BranchKey, Product } from '../types';
import { SharedInventoryRow } from './SharedInventoryRow';

interface SharedInventoryTableProps {
  inventory: Product[];
  otherItems: Product[];
  currentBranch: BranchKey;
  otherBranch: BranchKey;
  orderDrafts: Record<string, { bywood: number; broom: number }>;
  orderConfirmations: Record<string, { bywood: boolean; broom: boolean }>;
  onUpdateSharedValues: (barcode: string, field: 'price' | 'costPrice', value: number) => void;
  onUpdateTarget: (productId: string, branch: BranchKey, value: number) => void;
  onUpdateStock: (productId: string, branch: BranchKey, value: number) => void;
  onOrderDraftChange: (id: string, branch: 'bywood' | 'broom', val: string) => void;
  onToggleConfirmation: (id: string, branch: 'bywood' | 'broom') => void;
  onPlaceJointOrder: (item: Product) => void;
  onOpenEdit?: (product: Product) => void;
  onOpenHistory?: (product: Product) => void;
  onPreviewImage?: (src: string, title: string) => void;
  tagSettings: Record<string, any>;
  noteLogic: {
    isNoteExpanded: (id: string) => boolean;
    toggleNote: (id: string) => void;
  };
}

export const SharedInventoryTable: React.FC<SharedInventoryTableProps> = ({
  inventory,
  otherItems,
  currentBranch,
  otherBranch,
  orderDrafts,
  orderConfirmations,
  onUpdateSharedValues,
  onUpdateTarget,
  onUpdateStock,
  onOrderDraftChange,
  onToggleConfirmation,
  onPlaceJointOrder,
  onOpenEdit,
  onOpenHistory,
  onPreviewImage,
  tagSettings,
  noteLogic
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-900 border-b border-slate-800">
          <tr>
            <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">Product Detail</th>
            <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Economics</th>
            <th className="p-6 text-[10px] font-black uppercase text-indigo-400 tracking-widest text-center bg-indigo-900/10 border-r border-indigo-500/10 w-48">
              Local ({currentBranch === 'bywood' ? 'Bywood' : 'Broom'})
            </th>
            <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center w-48">
              Partner ({otherBranch === 'bywood' ? 'Bywood' : 'Broom'})
            </th>
            <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-center">Network Health</th>
            <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Joint Order Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {inventory.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-32 text-center opacity-40">
                <Handshake size={48} className="mx-auto mb-4 text-slate-600" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-500">No shared items found</p>
              </td>
            </tr>
          ) : inventory.map(item => (
            <SharedInventoryRow
              key={item.id}
              item={item}
              match={otherItems.find(p => p.barcode === item.barcode && !p.deletedAt)}
              currentBranch={currentBranch}
              otherBranch={otherBranch}
              draft={orderDrafts[item.id] || { bywood: 0, broom: 0 }}
              confirmations={orderConfirmations[item.id] || { bywood: false, broom: false }}
              onUpdateSharedValues={onUpdateSharedValues}
              onUpdateTarget={onUpdateTarget}
              onUpdateStock={onUpdateStock}
              onOrderDraftChange={onOrderDraftChange}
              onToggleConfirmation={onToggleConfirmation}
              onPlaceJointOrder={onPlaceJointOrder}
              onOpenEdit={onOpenEdit}
              onOpenHistory={onOpenHistory}
              onPreviewImage={onPreviewImage}
              tagSettings={tagSettings}
              isNoteExpanded={noteLogic.isNoteExpanded(item.id)}
              onToggleNote={() => noteLogic.toggleNote(item.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
