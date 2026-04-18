
import React, { useMemo, useState, useEffect } from 'react';
import { History, Truck, TrendingUp, Package, Star, AlertCircle, X, RefreshCw, Copy, GripHorizontal, ListChecks } from 'lucide-react';
import { Product, BranchKey } from '../types';
import { useAppSelector } from './store';
import { StockLogicReturn } from '../hooks/useStockLogic';
import { useSlowMoverInsights } from '../hooks/useSlowMoverInsights';
import { useInventoryReconciliation } from '../hooks/useInventoryReconciliation';
import { DashboardCard } from './DashboardCard';

interface DashboardWidgetsProps {
  logic: StockLogicReturn;
  pricingAlertCount: number;
  onOpenReconciliation: () => void;
  onOpenDuplicates: () => void;
  currentBranch: string;
}

type WidgetType = 'restock' | 'ordered' | 'slow-movers' | 'expiring' | 'clearance' | 'alerts' | 'reconciliation' | 'duplicates' | 'stock-check';

export const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({
  logic,
  pricingAlertCount,
  onOpenReconciliation,
  onOpenDuplicates,
  currentBranch
}) => {
  const items = useAppSelector((state) => state.stock[currentBranch as BranchKey] ?? []);

  const activeMainInventory = useMemo(() => {
    return items.filter((p: Product) => !p.isArchived && !p.deletedAt);
  }, [items]);

  const activeOrders = useAppSelector((state) => {
    const orderKey = currentBranch === 'bywood' ? 'bywoodOrders' : 'broomOrders';
    return state.stock[orderKey] ?? [];
  });

  const activeOrdersCount = useMemo(() => {
    const orderedProductIds = new Set(
      activeOrders.filter(o => o.status === 'ordered').map(o => o.productId)
    );
    return activeMainInventory.filter(p => orderedProductIds.has(p.id)).length;
  }, [activeOrders, activeMainInventory]);

  const { totalSlowMovers } = useSlowMoverInsights(activeMainInventory);
  
  // Reconciliation Logic for Widget Stats
  const { mismatches } = useInventoryReconciliation(logic.branchData, logic.setBranchData, logic.currentBranch);

  // Duplicates Logic for Widget Stats
  const duplicateCount = useMemo(() => {
    let count = 0;
    const byBarcode: Record<string, number> = {};
    activeMainInventory.forEach(p => {
      if (p.barcode) {
        const b = p.barcode.trim();
        byBarcode[b] = (byBarcode[b] || 0) + 1;
      }
    });
    // Count groups that have duplicates
    Object.values(byBarcode).forEach(c => {
        if (c > 1) count++;
    });
    return count;
  }, [activeMainInventory]);

  // State for the 4 grid slots. Null means empty/placeholder.
  const STORAGE_KEY_PREFIX = 'greenchem-dashboard-slots-';
  const DEFAULT_SLOTS: (WidgetType | null)[] = ['restock', 'ordered', 'stock-check', 'expiring'];

  const [activeSlots, setActiveSlots] = useState<(WidgetType | null)[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + currentBranch);
      return saved ? JSON.parse(saved) : DEFAULT_SLOTS;
    } catch {
      return DEFAULT_SLOTS;
    }
  });

  // Persist on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + currentBranch, JSON.stringify(activeSlots));
  }, [activeSlots, currentBranch]);

  // Re-load when branch changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + currentBranch);
      setActiveSlots(saved ? JSON.parse(saved) : DEFAULT_SLOTS);
    } catch {
      setActiveSlots(DEFAULT_SLOTS);
    }
  }, [currentBranch]);
  
  const [addingToIndex, setAddingToIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const stats = useMemo(() => {
    const now = new Date().getTime();

    const orderKey = logic.currentBranch === 'bywood' ? 'bywoodOrders' : 'broomOrders';
    const activeOrders = logic.branchData[orderKey] || [];

    const restockCount = activeMainInventory.filter((i: Product) => {
      if (i.isDiscontinued) return false;

      const type = i.thresholdType || 'percentage';
      const val = i.thresholdValue !== undefined ? i.thresholdValue : 25;
      const isBelowThreshold = type === 'percentage'
        ? i.stockInHand <= (i.stockToKeep * (val / 100))
        : i.stockInHand <= val;
      const hasSmartAlert = !!i.enableThresholdAlert;

      const isPending = activeOrders.some((o: any) => o.productId === i.id && o.status === 'pending');
      const isOnOrder = activeOrders.some((o: any) => o.productId === i.id && (o.status === 'ordered' || o.status === 'backorder'));

      if (isOnOrder) return false;
      return isPending || (hasSmartAlert && isBelowThreshold);
    }).length;

    const expiringCount = activeMainInventory.filter(i => {
      if (!i.expiryDate) return false;
      const exp = new Date(i.expiryDate).getTime();
      const diffDays = Math.ceil((exp - now) / (1000 * 3600 * 24));
      return diffDays <= 90;
    }).length;

    const clearanceCount = activeMainInventory.filter(i => i.isReducedToClear).length;
    const stockCheckCount = activeMainInventory.filter(i => i.needsStockCheck).length;

    return { restockCount, expiringCount, clearanceCount, stockCheckCount };
  }, [activeMainInventory, logic.branchData, logic.currentBranch]);
  // Widget Definitions
  const widgetDefinitions: Record<WidgetType, any> = {
    'restock': {
      label: 'Restocks',
      value: stats.restockCount,
      subValue: 'Active Smart Alerts',
      icon: History,
      color: 'emerald',
      filterKey: 'restock'
    },
    'ordered': {
      label: 'On Order',
      value: activeOrdersCount,
      subValue: 'Active Shipments',
      icon: Truck,
      color: 'indigo',
      filterKey: 'ordered'
    },
    'slow-movers': {
      label: 'Slow Movers',
      value: totalSlowMovers,
      subValue: '> 90 Days Inactive',
      icon: TrendingUp,
      color: 'amber',
      filterKey: 'slow-movers'
    },
    'expiring': {
      label: 'Expiring Stock',
      value: stats.expiringCount,
      subValue: 'Within 90 Days',
      icon: Package,
      color: 'rose',
      filterKey: 'expiring'
    },
    'clearance': {
      label: 'Clearance',
      value: stats.clearanceCount,
      subValue: 'Reduced to Clear',
      icon: Star,
      color: 'amber',
      filterKey: 'clearance'
    },
    'alerts': {
      label: 'Price Alerts',
      value: pricingAlertCount,
      subValue: 'Pricing Issues',
      icon: AlertCircle,
      color: 'blue',
      filterKey: 'alerts'
    },
    'reconciliation': {
      label: 'Reconciliation',
      value: mismatches.length,
      subValue: 'Catalog Mismatches',
      icon: RefreshCw,
      color: 'amber',
      filterKey: 'reconciliation'
    },
    'duplicates': {
      label: 'Duplicate SKUs',
      value: duplicateCount,
      subValue: 'Conflicts Detected',
      icon: Copy,
      color: 'rose',
      filterKey: 'duplicates'
    },
    'stock-check': {
      label: 'Stock Check',
      value: stats.stockCheckCount,
      subValue: 'Pending Verification',
      icon: ListChecks,
      color: 'orange',
      filterKey: 'stock-check'
    }
  };

  const handleRemove = (index: number) => {
    const newSlots = [...activeSlots];
    newSlots[index] = null;
    setActiveSlots(newSlots);
  };

  const handleAdd = (widgetKey: WidgetType) => {
    if (addingToIndex === null) return;
    const newSlots = [...activeSlots];
    newSlots[addingToIndex] = widgetKey;
    setActiveSlots(newSlots);
    setAddingToIndex(null);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Make the drag ghost slightly transparent
    if (e.currentTarget instanceof HTMLElement) {
       e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedIndex(null);
    if (e.currentTarget instanceof HTMLElement) {
       e.currentTarget.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const newSlots = [...activeSlots];
    const sourceItem = newSlots[draggedIndex];
    const targetItem = newSlots[targetIndex];

    // Swap items
    newSlots[draggedIndex] = targetItem;
    newSlots[targetIndex] = sourceItem;

    setActiveSlots(newSlots);
    setDraggedIndex(null);
  };

  const availableWidgets = Object.keys(widgetDefinitions).filter(
    key => !activeSlots.includes(key as WidgetType)
  ) as WidgetType[];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeSlots.map((slotKey, index) => {
          return (
            <div 
                key={index}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                className={`transition-all duration-300 relative group/slot ${
                    draggedIndex === index ? 'opacity-20 scale-95' : 'opacity-100'
                } ${draggedIndex !== null && draggedIndex !== index ? 'scale-[0.98]' : ''}`}
            >
                {/* Visual Grip Handle hint on hover */}
                {slotKey && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 text-slate-700 opacity-0 group-hover/slot:opacity-50 transition-opacity pointer-events-none">
                        <GripHorizontal size={20} />
                    </div>
                )}

                {!slotKey ? (
                    <DashboardCard 
                        label="" value="" subValue="" icon={Package} color="slate"
                        isPlaceholder
                        onClick={() => setAddingToIndex(index)}
                    />
                ) : (
                    (() => {
                        const widget = widgetDefinitions[slotKey];
                        return (
                            <DashboardCard
                                label={widget.label}
                                value={widget.value}
                                subValue={widget.subValue}
                                icon={widget.icon}
                                color={widget.color}
                                isActive={logic.subFilter === widget.filterKey}
                                onClick={() => {
                                    if (widget.filterKey === 'reconciliation') onOpenReconciliation();
                                    else if (widget.filterKey === 'duplicates') onOpenDuplicates();
                                    else {
                                        logic.setSubFilter(widget.filterKey);
                                        if (widget.filterKey === 'ordered') {
                                            logic.setOrderTab('active');
                                        }
                                    }
                                }}
                                onRemove={() => handleRemove(index)}
                            />
                        );
                    })()
                )}
            </div>
          );
        })}
      </div>

      {/* Add Widget Modal */}
      {addingToIndex !== null && (
        <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
           <div className="w-full max-w-lg bg-slate-950 border border-slate-800 rounded-[2.5rem] shadow-2xl p-8 relative">
              <button 
                onClick={() => setAddingToIndex(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="mb-6">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Add Dashboard Widget</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Select a metric to display in this slot</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
                 {availableWidgets.map(key => {
                    const w = widgetDefinitions[key];
                    const Icon = w.icon;
                    return (
                      <button 
                        key={key}
                        onClick={() => handleAdd(key)}
                        className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800 transition-all text-left group flex items-center gap-4"
                      >
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                            w.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                            w.color === 'orange' ? 'bg-orange-500/10 border-orange-500/20 text-orange-500' :
                            w.color === 'indigo' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500' :
                            w.color === 'blue' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                            w.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                            'bg-rose-500/10 border-rose-500/20 text-rose-500'
                         }`}>
                            <Icon size={20} />
                         </div>
                         <div>
                            <span className="block text-[10px] font-black uppercase text-slate-400 group-hover:text-white transition-colors tracking-widest">{w.label}</span>
                            <span className="block text-lg font-black text-white">{w.value}</span>
                         </div>
                      </button>
                    );
                 })}
                 {availableWidgets.length === 0 && (
                    <div className="col-span-full py-10 text-center opacity-50">
                       <p className="text-xs font-bold text-slate-500">All available widgets are currently active.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </>
  );
};
