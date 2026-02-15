import React, { useMemo } from 'react';
import { 
  TrendingUp, Target, Activity, Tag, PieChart, LineChart, Timer, Gauge, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { Product } from '../types';
import { StatCard } from './ManagerComponents';
import { useSlowMoverInsights } from '../hooks/useSlowMoverInsights';

/**
 * Performance Dashboard View
 */
export const PerformanceView = ({ items }: { items: Product[] }) => {
  const theme = 'dark';

  // Include active AND archived items in performance data, but exclude deleted items
  const activeItems = useMemo(() => {
    return items.filter(i => !i.deletedAt);
  }, [items]);

  const totalRetailValue = activeItems.reduce((acc, i) => acc + (i.price * i.stockInHand), 0);
  const totalCostValue = activeItems.reduce((acc, i) => acc + (i.costPrice * i.stockInHand), 0);
  const potentialProfit = totalRetailValue - totalCostValue;
  const avgMargin = totalRetailValue > 0 ? (potentialProfit / totalCostValue) * 100 : 0; 
  
  const highValueItems = [...activeItems].sort((a, b) => (b.price * b.stockInHand) - (a.price * a.stockInHand)).slice(0, 5);
  const healthyStock = activeItems.filter(i => i.stockInHand > (i.stockToKeep * 0.25));

  // Slow Mover Insights Integration
  const { buckets, counts, totalSlowMovers } = useSlowMoverInsights(activeItems);

  // Calculate total cost value of all slow movers (3m, 6m, 9m, 12m+)
  const slowMoversCost = useMemo(() => {
    return Object.values(buckets).flat().reduce((acc, insight) => {
      return acc + (insight.product.costPrice * insight.product.stockInHand);
    }, 0);
  }, [buckets]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Inventory Value" value={`£${totalRetailValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} subValue="Retail RRP" icon={<TrendingUp size={22}/>} color="blue" theme={theme} />
        <StatCard label="Inventory Cost" value={`£${totalCostValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} subValue="Wholesale Cost" icon={<Target size={22}/>} color="blue" theme={theme} />
        <StatCard label="Potential Profit" value={`£${potentialProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} subValue="Gross Profit" icon={<Activity size={22}/>} color="blue" theme={theme} />
        <StatCard label="Overall Margin" value={`${avgMargin.toFixed(1)}%`} subValue="Markup Percentage" icon={<Tag size={22}/>} color="blue" theme={theme} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-8 rounded-[2.5rem] border shadow-xl bg-slate-900/50 border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black flex items-center gap-3">
              <PieChart className="text-blue-500" size={24} /> 
              Stock Health
            </h3>
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Site Balance (Inc. Archive)</span>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-500">
                <span>Healthy Stock Level ({'>'}25%)</span>
                <span>{((healthyStock.length / (activeItems.length || 1)) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(healthyStock.length / (activeItems.length || 1)) * 100}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-black uppercase tracking-widest text-slate-500">
                <span>Critical / Low Stock (≤25%)</span>
                <span>{(((activeItems.length - healthyStock.length) / (activeItems.length || 1)) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${((activeItems.length - healthyStock.length) / (activeItems.length || 1)) * 100}%` }} />
              </div>
            </div>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50">
              <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Items In Stock</p>
              <p className="text-2xl font-black text-blue-400">{activeItems.length}</p>
            </div>
            <div className={`p-4 rounded-2xl ${activeItems.length - healthyStock.length > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-slate-800/30 border border-slate-700/50'}`}>
              <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Restocks Needed</p>
              <p className={`text-2xl font-black ${activeItems.length - healthyStock.length > 0 ? 'text-rose-500' : ''}`}>{activeItems.length - healthyStock.length}</p>
            </div>
          </div>
        </div>

        <div className="p-8 rounded-[2.5rem] border shadow-xl bg-slate-900/50 border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black flex items-center gap-3">
              <LineChart className="text-blue-500" size={24} /> 
              Top Assets
            </h3>
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Value Contributors</span>
          </div>
          <div className="space-y-4">
            {highValueItems.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-4 justify-between p-4 rounded-2xl transition-colors bg-slate-800/30 hover:bg-slate-800/50">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-slate-500 border bg-slate-900 border-slate-800 shrink-0">{idx + 1}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-white capitalize leading-tight break-words">{item.name}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">{item.packSize} • Qty {item.stockInHand} {item.isArchived && '(Archived)'}</p>
                  </div>
                </div>
                <p className="font-black text-blue-400 shrink-0 ml-2">£{(item.price * item.stockInHand).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 p-8 rounded-[2.5rem] border shadow-xl bg-slate-900/50 border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black flex items-center gap-3">
              <Timer className="text-amber-500" size={24} /> 
              Inventory Velocity
            </h3>
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Inactivity Check</span>
          </div>
          
          <div className="space-y-4">
             {[
               { label: '3+ Months Inactive', count: counts.threeMonths, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
               { label: '6+ Months Inactive', count: counts.sixMonths, color: 'text-amber-500', bg: 'bg-amber-500/10' },
               // Fix: Corrected property access from counts.orange-500 to counts.nineMonths. 
               // 'orange' is not a valid key in the SlowMoverBucketKey type.
               { label: '9+ Months Inactive', count: counts.nineMonths, color: 'text-orange-500', bg: 'bg-orange-500/10' },
               { label: '12+ Months (Dead Stock)', count: counts.deadStock, color: 'text-rose-500', bg: 'bg-rose-500/10' }
             ].map((bucket) => (
               <div key={bucket.label} className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/30">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{bucket.label}</span>
                  <div className={`px-3 py-1 rounded-lg font-black text-sm ${bucket.bg} ${bucket.color}`}>
                    {bucket.count}
                  </div>
               </div>
             ))}
          </div>
          
          <div className="mt-8 p-6 rounded-3xl border bg-blue-500/5 border-blue-500/10 flex items-center justify-between relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                   <Gauge size={16} className="text-blue-400" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">Total Slow Movers</span>
                </div>
                <p className="text-4xl font-black text-white">{totalSlowMovers}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Items with no movement in 90+ days</p>
             </div>
             
             <div className="relative z-10 px-5 py-3 rounded-2xl border-2 border-dashed border-blue-500/30 bg-slate-900/40 flex flex-col items-end shadow-inner">
                 <span className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-0.5">Total Cost Value</span>
                 <span className="text-xl font-black text-white">£{slowMoversCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
             </div>
             
             {/* Subtle background icon for flair */}
             <Gauge className="absolute -right-6 -bottom-6 text-blue-500/5 rotate-12 z-0" size={120} />
          </div>
        </div>

        <div className="lg:col-span-2 p-8 rounded-[2.5rem] border shadow-xl bg-slate-900/50 border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black flex items-center gap-3">
              <AlertTriangle className="text-rose-500" size={24} /> 
              Dead Stock Detail (12+ Months)
            </h3>
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Action Recommended</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="border-b border-slate-800/50">
                  <tr>
                    <th className="pb-4 font-black text-[10px] uppercase text-slate-500 tracking-widest">Product</th>
                    <th className="pb-4 font-black text-[10px] uppercase text-slate-500 tracking-widest text-center">Value</th>
                    <th className="pb-4 font-black text-[10px] uppercase text-slate-500 tracking-widest text-center">Months</th>
                    <th className="pb-4 font-black text-[10px] uppercase text-slate-500 tracking-widest text-right">Last Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-800/30">
                  {buckets.deadStock.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-20 text-center opacity-30">
                        <div className="flex flex-col items-center gap-3">
                          <CheckCircle2 size={32} />
                          <p className="text-[10px] font-black uppercase tracking-widest">No dead stock detected</p>
                        </div>
                      </td>
                    </tr>
                  ) : buckets.deadStock.slice(0, 8).map((insight) => (
                    <tr key={insight.product.id} className="group transition-colors hover:bg-slate-800/20">
                      <td className="py-4">
                        <p className="text-sm font-black group-hover:text-blue-400 transition-colors text-white capitalize">
                          {insight.product.name}
                          {insight.product.isArchived && <span className="ml-2 text-[9px] text-amber-500 border border-amber-500/30 px-1 rounded">ARCHIVED</span>}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">{insight.product.packSize} • {insight.product.barcode}</p>
                      </td>
                      <td className="py-4 text-center">
                        <span className="text-sm font-black text-rose-400">£{(insight.product.price * insight.product.stockInHand).toFixed(2)}</span>
                      </td>
                      <td className="py-4 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black">{insight.monthsInactive}m</span>
                      </td>
                      <td className="py-4 text-right">
                        <p className="text-[10px] font-black uppercase text-slate-400">{insight.lastActiveDate ? new Date(insight.lastActiveDate).toLocaleDateString() : 'Unknown'}</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase">Last Order</p>
                      </td>
                    </tr>
                  ))}
               </tbody>
            </table>
          </div>
          {buckets.deadStock.length > 8 && (
            <div className="mt-6 pt-6 border-t text-center border-slate-800/50">
               <button className="text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-white">
                 + View All {buckets.deadStock.length} Dead Stock Items
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
