
import React, { useMemo, useState, useEffect } from 'react';
import { CheckSquare, Square, ChevronDown, ChevronRight, ChevronLeft, Layers, Box, Package } from 'lucide-react';
import { Product, ColumnVisibility } from '../types';
import { SortHeader } from './ManagerComponents';
import { InventoryRow } from './InventoryRow';
import { StockLogicReturn } from '../hooks/useStockLogic';
import { PricingDeskReturn } from '../hooks/usePricingDesk';
import { TagStyle } from '../hooks/useInventoryTags';
import { useAuth } from '../contexts/AuthContext';

interface InventoryTableProps {
  items: Product[];
  sortConfig: { key: string; direction: 'asc' | 'desc' }[];
  onSort: (key: string, multi: boolean) => void;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleAll: (specificIds?: string[]) => void;
  isAllSelected: boolean;
  manualRestockQtys: Record<string, number>;
  onManualQtyChange: (id: string, qty: number) => void;
  onPreviewImage: (src: string, title: string) => void;
  noteLogic: {
    isNoteExpanded: (id: string) => boolean;
    toggleNote: (id: string) => void;
  };
  logic: StockLogicReturn;
  pricingLogic: PricingDeskReturn;
  tagSettings: Record<string, TagStyle>;
  onOpenEdit: (p: Product) => void;
  onOpenTransfer: (p: Product) => void;
  onOpenHistory: (p: Product) => void;
  columns: ColumnVisibility;
  isSortingDisabled?: boolean;
}

interface GroupedItem {
  type: 'group';
  id: string; // group name
  name: string;
  items: Product[];
  totalStock: number;
  avgPrice: number;
  totalValue: number;
}

interface SingleItem {
  type: 'item';
  data: Product;
}

type TableRow = GroupedItem | SingleItem;

interface ParentRowHeaderProps {
  row: GroupedItem;
  isExpanded: boolean;
  toggleGroup: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onUpdatePrice: (id: string, price: number) => void;
  columns: ColumnVisibility;
}

const ParentRowHeader: React.FC<ParentRowHeaderProps> = ({ row, isExpanded, toggleGroup, selectedIds, onToggleSelection, onUpdatePrice, columns }) => {
  const { checkPermission } = useAuth();
  const canEdit = checkPermission('inventory.edit');
  const [price, setPrice] = useState(row.avgPrice.toFixed(2));

  // Sync local state when prop updates (e.g. child update propagated back)
  useEffect(() => {
    setPrice(row.avgPrice.toFixed(2));
  }, [row.avgPrice]);

  const handleCommit = () => {
    if (!canEdit) return;
    const val = parseFloat(price);
    if (!isNaN(val) && Math.abs(val - row.avgPrice) > 0.001) {
       // Update the first item in group, logic hook propagates to all sharing parentGroup
       if (row.items.length > 0) {
         onUpdatePrice(row.items[0].id, val);
       }
    } else {
       setPrice(row.avgPrice.toFixed(2));
    }
  };

  // Selection Logic
  const isGroupSelected = row.items.length > 0 && row.items.every(i => selectedIds.has(i.id));
  const isGroupPartiallySelected = !isGroupSelected && row.items.some(i => selectedIds.has(i.id));

  const handleSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    const allSelected = row.items.length > 0 && row.items.every(i => selectedIds.has(i.id));
    row.items.forEach(i => {
        if (allSelected) {
            if (selectedIds.has(i.id)) onToggleSelection(i.id);
        } else {
            if (!selectedIds.has(i.id)) onToggleSelection(i.id);
        }
    });
  };

  // Calculate dynamic colspan for the filler cell
  let visibleCols = 0;
  if (columns.order) visibleCols++;
  if (columns.status) visibleCols++;
  // Actions is always visible (1)
  const fillerColSpan = visibleCols + 1; 

  return (
    <tr 
        className={`cursor-pointer transition-all ${isExpanded ? 'bg-slate-900/40' : 'hover:bg-slate-800/30'}`}
        onClick={() => toggleGroup(row.id)}
    >
        {/* Checkbox */}
        <td className="p-4 align-middle relative">
            <button 
                onClick={handleSelection} 
                className={`transition-colors relative z-20 ${isGroupSelected || isGroupPartiallySelected ? 'text-indigo-500' : 'text-slate-600 hover:text-slate-400'}`}
            >
                {isGroupSelected ? <CheckSquare size={18} /> : isGroupPartiallySelected ? <div className="w-[18px] h-[18px] border-2 border-indigo-500 rounded flex items-center justify-center"><div className="w-2.5 h-2.5 bg-indigo-500 rounded-sm"/></div> : <Square size={18} />}
            </button>
        </td>

        {/* Identity - Always Visible */}
        <td className="p-4">
            <div className="flex items-center gap-4">
                <button className="text-slate-500 hover:text-white transition-colors p-1 rounded hover:bg-slate-800">
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-sm relative group-hover:border-indigo-500/40 transition-colors">
                    <Layers size={20} />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center text-[9px] font-black text-white border border-slate-900">
                        {row.items.length}
                    </div>
                </div>
                
                <div>
                    <span className="text-sm font-black text-white uppercase tracking-tight block mb-1">{row.name}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest bg-slate-500 px-2 py-0.5 rounded-full">{row.items.length} Variants</span>
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Product Group</span>
                    </div>
                </div>
            </div>
        </td>

        {/* Price (Editable) */}
        {columns.rrp && (
          <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
               <div className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-500 px-3 py-2 rounded-xl border border-emerald-500/20 shadow-inner hover:bg-emerald-500/20 transition-colors group/input focus-within:ring-2 focus-within:ring-emerald-500/30">
                  <span className="text-sm font-black text-emerald-500 opacity-70">£</span>
                  <input 
                      type="number"
                      step="0.01"
                      value={price}
                      disabled={!canEdit}
                      onChange={e => setPrice(e.target.value)}
                      onBlur={handleCommit}
                      onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                      onFocus={e => !canEdit ? e.currentTarget.blur() : e.target.select()}
                      className={`w-16 bg-transparent text-sm font-black text-emerald-500 outline-none text-center ${!canEdit ? 'opacity-70 cursor-not-allowed' : ''}`}
                      placeholder="0.00"
                  />
               </div>
          </td>
        )}

        {/* Margin */}
        {columns.margin && (
          <td className="p-4 text-center">
              <span className="text-slate-700 font-bold text-xs">-</span>
          </td>
        )}

        {/* Stock */}
        {columns.stock && (
          <td className="p-4 text-center">
              <div className="flex flex-col items-center">
              <div className="flex items-center justify-center gap-2 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 shadow-inner">
                  <Package size={14} className="text-slate-500" />
                  <span className="font-black text-white text-lg">{row.totalStock}</span>
              </div>
              </div>
          </td>
        )}

        {/* Others Filler */}
        <td colSpan={fillerColSpan} />
    </tr>
  );
};

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  sortConfig,
  onSort,
  selectedIds,
  onToggleSelection,
  onToggleAll,
  isAllSelected,
  manualRestockQtys,
  onManualQtyChange,
  onPreviewImage,
  noteLogic,
  logic,
  pricingLogic,
  tagSettings,
  onOpenEdit,
  onOpenTransfer,
  onOpenHistory,
  columns,
  isSortingDisabled = false
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to first page when data or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [items, sortConfig]);

  // 1. Process items into Groups and Singles
  const processedRows = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    const singles: Product[] = [];

    // First pass: Group items
    items.forEach(item => {
      if (item.parentGroup && item.parentGroup.trim() !== '') {
        const key = item.parentGroup.trim();
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      } else {
        singles.push(item);
      }
    });

    const rows: TableRow[] = [];

    // Convert groups to TableRows
    Object.entries(groups).forEach(([groupName, groupItems]) => {
      const totalStock = groupItems.reduce((acc, i) => acc + i.stockInHand, 0);
      const totalValue = groupItems.reduce((acc, i) => acc + (i.price * i.stockInHand), 0);
      // Determine a representative price (should be same, but take max just in case)
      const avgPrice = Math.max(...groupItems.map(i => i.price));

      rows.push({
        type: 'group',
        id: groupName,
        name: groupName,
        items: groupItems,
        totalStock,
        avgPrice,
        totalValue
      });
    });

    // Add singles
    singles.forEach(item => {
      rows.push({ type: 'item', data: item });
    });

    // 2. Sort the combined list
    if (sortConfig.length > 0) {
      rows.sort((a, b) => {
        for (const { key, direction } of sortConfig) {
          let valA, valB;

          // Extract comparable values based on sort key
          if (key === 'name') {
            valA = a.type === 'group' ? a.name : a.data.name;
            valB = b.type === 'group' ? b.name : b.data.name;
          } else if (key === 'stockInHand') {
            valA = a.type === 'group' ? a.totalStock : a.data.stockInHand;
            valB = b.type === 'group' ? b.totalStock : b.data.stockInHand;
          } else if (key === 'price') {
            valA = a.type === 'group' ? a.avgPrice : a.data.price;
            valB = b.type === 'group' ? b.avgPrice : b.data.price;
          } else if (key === 'createdAt' || key === 'dateAdded') {
            valA = a.type === 'group' ? Math.max(...a.items.map(i => new Date(i.createdAt || 0).getTime())) : new Date(a.data.createdAt || 0).getTime();
            valB = b.type === 'group' ? Math.max(...b.items.map(i => new Date(i.createdAt || 0).getTime())) : new Date(b.data.createdAt || 0).getTime();
          } else {
            // Default string sort on Name/ID if key doesn't match specific logic
            valA = a.type === 'group' ? a.name : (a.data as any)[key] || '';
            valB = b.type === 'group' ? b.name : (b.data as any)[key] || '';
          }

          if (typeof valA === 'string') valA = valA.toLowerCase();
          if (typeof valB === 'string') valB = valB.toLowerCase();

          if (valA < valB) return direction === 'asc' ? -1 : 1;
          if (valA > valB) return direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return rows;
  }, [items, sortConfig]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  const totalPages = Math.ceil(processedRows.length / pageSize);
  const paginatedRows = useMemo(() => {
    return processedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [processedRows, currentPage, pageSize]);

  const inViewIds = useMemo(() => {
    const ids: string[] = [];
    paginatedRows.forEach(row => {
      if (row.type === 'group') {
        row.items.forEach(i => ids.push(i.id));
      } else {
        ids.push(row.data.id);
      }
    });
    return ids;
  }, [paginatedRows]);

  const isAllPageSelected = inViewIds.length > 0 && inViewIds.every(id => selectedIds.has(id));

  const handleToggleAll = () => {
    if (inViewIds.length > 0) onToggleAll(inViewIds);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[2.5rem] border shadow-2xl overflow-hidden bg-slate-950 border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-950 border-b border-slate-800">
              <tr>
                <th className="p-4 w-12 border-b border-slate-800">
                  <button onClick={handleToggleAll} className="text-slate-500 hover:text-emerald-500 transition-colors">
                    {isAllPageSelected ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} />}
                  </button>
                </th>
                <SortHeader label="Product Identity" sortKey="name" config={sortConfig} onSort={onSort} disabled={isSortingDisabled} />
                
                {columns.rrp && <SortHeader label="RRP" sortKey="price" config={sortConfig} onSort={onSort} align="center" disabled={isSortingDisabled} />}
                {columns.margin && <SortHeader label="Margin" sortKey="margin" config={sortConfig} onSort={onSort} align="center" disabled={isSortingDisabled} />}
                {columns.stock && <SortHeader label="Stock Level" sortKey="stockInHand" config={sortConfig} onSort={onSort} align="center" disabled={isSortingDisabled} />}
                {columns.order && <SortHeader label="To Order" sortKey="restockQty" config={sortConfig} onSort={onSort} align="center" disabled={isSortingDisabled} />}
                {columns.status && <SortHeader label="Status" sortKey="status" config={sortConfig} onSort={onSort} align="center" disabled={isSortingDisabled} />}
                
                <th className="p-4 text-right border-b border-slate-800">
                  <span className="font-black text-[10px] uppercase text-slate-500 tracking-wider">Actions</span>
                </th>
              </tr>
            </thead>
            
            {paginatedRows.length === 0 ? (
              <tbody>
                <tr><td colSpan={8} className="p-20 text-center text-slate-500 font-black uppercase text-xs tracking-widest">No matching products found</td></tr>
              </tbody>
            ) : (
              paginatedRows.map((row, idx) => {
                if (row.type === 'group') {
                  const isExpanded = expandedGroups.has(row.id);
                  
                  return (
                    <tbody key={`group-${row.id}`} className="relative border-b border-slate-800/50 transition-colors bg-orange-500/[0.02]">
                      {/* Visual Group Marker Line */}
                      <tr className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/40 z-10" />
                      
                      <ParentRowHeader 
                        row={row} 
                        isExpanded={isExpanded} 
                        toggleGroup={toggleGroup} 
                        selectedIds={selectedIds} 
                        onToggleSelection={onToggleSelection} 
                        onUpdatePrice={logic.updateProductPrice}
                        columns={columns}
                      />
                      
                      {/* Child Rows - Flattened to share table columns for alignment */}
                      {isExpanded && row.items.map((item, i) => (
                        <InventoryRow 
                          key={item.id}
                          item={item} 
                          logic={logic} 
                          pricingLogic={pricingLogic}
                          tagSettings={tagSettings}
                          onOpenEdit={onOpenEdit}
                          onOpenTransfer={onOpenTransfer}
                          onOpenHistory={onOpenHistory}
                          isSelected={selectedIds.has(item.id)}
                          onToggleSelection={() => onToggleSelection(item.id)}
                          manualQty={manualRestockQtys[item.id]}
                          onManualQtyChange={onManualQtyChange}
                          onPreviewImage={onPreviewImage}
                          isNoteExpanded={noteLogic.isNoteExpanded(item.id)}
                          onToggleNote={() => noteLogic.toggleNote(item.id)}
                          isGroupChild={true}
                          columns={columns}
                        />
                      ))}
                    </tbody>
                  );
                } else {
                  // Single Item (Non-grouped)
                  return (
                    <tbody key={row.data.id} className="border-b border-slate-800/50">
                      <InventoryRow 
                        item={row.data} 
                        logic={logic} 
                        pricingLogic={pricingLogic}
                        tagSettings={tagSettings}
                        onOpenEdit={onOpenEdit}
                        onOpenTransfer={onOpenTransfer}
                        onOpenHistory={onOpenHistory}
                        isSelected={selectedIds.has(row.data.id)}
                        onToggleSelection={() => onToggleSelection(row.data.id)}
                        manualQty={manualRestockQtys[row.data.id]}
                        onManualQtyChange={onManualQtyChange}
                        onPreviewImage={onPreviewImage}
                        isNoteExpanded={noteLogic.isNoteExpanded(row.data.id)}
                        onToggleNote={() => noteLogic.toggleNote(row.data.id)}
                        columns={columns}
                      />
                    </tbody>
                  );
                }
              })
            )}
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {processedRows.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-[2rem] bg-slate-950 border border-slate-800 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Rows per page:</span>
              <select 
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-emerald-500 transition-colors"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
            </div>
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
              Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, processedRows.length)} of {processedRows.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <ChevronLeft size={18} />
            </button>
            
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 shadow-inner">
                Page {currentPage} <span className="text-slate-500 mx-1">of</span> {totalPages}
              </span>
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
