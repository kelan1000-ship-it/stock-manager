
import React from 'react';
import { Handshake, CheckSquare, Square } from 'lucide-react';
import { BranchKey, Product, OrderItem } from '../types';
import { SharedInventoryRow } from './SharedInventoryRow';
import { SortHeader } from './SharedUI';
import { findMatchByKey } from '../utils/productMatching';

interface SharedInventoryTableProps {
  inventory: Product[];
  otherItems: Product[];
  currentBranch: BranchKey;
  otherBranch: BranchKey;
  orderDrafts: Record<string, { bywood: number; broom: number }>;
  orderConfirmations: Record<string, { bywood: boolean; broom: boolean }>;
  onUpdateSharedValues: (barcode: string, field: 'price' | 'costPrice', value: number, productCode?: string) => void;
  onUpdateTarget: (productId: string, branch: BranchKey, value: number) => void;
  onUpdateLooseTarget: (productId: string, branch: BranchKey, value: number) => void;
  onUpdateStock: (productId: string, branch: BranchKey, value: number) => void;
  onOrderDraftChange: (barcode: string, branch: 'bywood' | 'broom', val: string) => void;
  onSaveDraftOnBlur: (barcode: string) => void;
  onToggleConfirmation: (barcode: string, branch: 'bywood' | 'broom') => void;
  onPlaceJointOrder: (item: Product) => void;
  jointOrders: any[];
  branchOrders: OrderItem[];
  onOpenEdit?: (product: Product) => void;
  onOpenHistory?: (product: Product) => void;
  onPreviewImage?: (src: string, title: string) => void;
  tagSettings: Record<string, any>;
  noteLogic: {
    isNoteExpanded: (id: string) => boolean;
    toggleNote: (id: string) => void;
  };
  sortConfig: { key: string; direction: 'asc' | 'desc' }[];
  onSort: (key: string, multi: boolean) => void;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onToggleAll?: (specificIds?: string[]) => void;
  isAllSelected?: boolean;
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
  onUpdateLooseTarget,
  onUpdateStock,
  onOrderDraftChange,
  onSaveDraftOnBlur,
  onToggleConfirmation,
  onPlaceJointOrder,
  jointOrders,
  branchOrders,
  onOpenEdit,
  onOpenHistory,
  onPreviewImage,
  tagSettings,
  noteLogic,
  sortConfig,
  onSort,
  selectedIds = new Set(),
  onToggleSelection,
  onToggleAll,
  isAllSelected = false
}) => {
  const inViewIds = inventory.map(p => p.id);
  const isAllPageSelected = inViewIds.length > 0 && inViewIds.every(id => selectedIds?.has(id));

  const handleToggleAll = () => {
    if (onToggleAll && inViewIds.length > 0) onToggleAll(inViewIds);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-950 border-b border-slate-800">
          <tr>
            <th className="p-4 w-12 border-b border-slate-800">
                {onToggleAll && (
                  <button
                      onClick={handleToggleAll}
                      className="text-slate-500 hover:text-emerald-500 transition-colors"
                      data-tooltip={isAllPageSelected ? "Deselect All" : "Select All"}
                  >
                      {isAllPageSelected ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} />}
                  </button>
                )}
            </th>            <SortHeader label="Product Detail" sortKey="name" config={sortConfig} onSort={onSort} />
            <SortHeader label="Economics" sortKey="price" config={sortConfig} onSort={onSort} align="center" />
            <SortHeader 
              label={`Local (${currentBranch === 'bywood' ? 'Bywood' : 'Broom'})`} 
              sortKey="localStock" 
              config={sortConfig} 
              onSort={onSort} 
              align="center" 
            />
            <SortHeader 
              label={`Partner (${otherBranch === 'bywood' ? 'Bywood' : 'Broom'})`} 
              sortKey="partnerStock" 
              config={sortConfig} 
              onSort={onSort} 
              align="center" 
            />
            <SortHeader label="Network Health" sortKey="networkHealth" config={sortConfig} onSort={onSort} align="center" />
            <SortHeader label="Suggested Order" sortKey="suggestedOrder" config={sortConfig} onSort={onSort} align="center" />
            <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest text-right">Joint Order Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {inventory.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-32 text-center opacity-40">
                <Handshake size={48} className="mx-auto mb-4 text-slate-600" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-500">No shared items found</p>
              </td>
            </tr>
          ) : inventory.map(item => (
            <SharedInventoryRow
              key={item.id}
              item={item}
              isSelected={selectedIds.has(item.id)}
              onToggleSelection={onToggleSelection}
              match={findMatchByKey(otherItems, item)}
              currentBranch={currentBranch}
              otherBranch={otherBranch}
              draft={orderDrafts[item.id] || { bywood: 0, broom: 0 }}
              confirmations={orderConfirmations[item.id] || { bywood: false, broom: false }}
              onUpdateSharedValues={onUpdateSharedValues}
              onUpdateTarget={onUpdateTarget}
              onUpdateLooseTarget={onUpdateLooseTarget}
              onUpdateStock={onUpdateStock}
              onOrderDraftChange={onOrderDraftChange}
              onSaveDraftOnBlur={onSaveDraftOnBlur}
              onToggleConfirmation={onToggleConfirmation}
              onPlaceJointOrder={onPlaceJointOrder}
              jointOrders={jointOrders}
              branchOrders={branchOrders}
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
