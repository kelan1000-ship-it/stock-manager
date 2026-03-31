
import React from 'react';
import { Notebook, X } from 'lucide-react';

interface ProductNoteWidgetProps {
  id: string;
  notes: string | undefined;
  partnerNotes?: string;
  branchLabels?: { local: string; partner: string };
  isExpanded: boolean;
  onToggle: () => void;
  stockType?: 'retail' | 'dispensary';
}

/**
 * ProductNoteWidget - A standalone UI component for managing and displaying 
 * internal product notes within inventory rows.
 * Updated: Matches specific screenshot styling (Yellow opaque box, bold type).
 */
export const ProductNoteWidget: React.FC<ProductNoteWidgetProps> = ({
  id,
  notes,
  partnerNotes,
  branchLabels,
  isExpanded,
  onToggle,
  stockType = 'retail'
}) => {
  if (!notes && !partnerNotes) return null;

  return (
    <div className="relative flex flex-col gap-1">
      {/* Trigger Button - Icon Only Representation */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`group flex items-center justify-center p-1 rounded-md transition-all w-7 h-7 shadow-md border border-[#F59E0B]/50 ${
          isExpanded
            ? 'bg-[#FFC107] text-slate-950'
            : 'bg-[#FFC107] animate-tag-flash text-slate-950 hover:bg-[#FDBA74]'
        }`}
        data-tooltip={isExpanded ? "Hide Notes" : "Show Internal Notes"}
      >
        <Notebook size={14} />
      </button>

      {/* Expandable Content Panel - High Visibility Overlay */}
      {isExpanded && (
        <div className="absolute top-0 left-9 mt-0 p-4 rounded-xl bg-[#FFC107] border-2 border-dashed border-slate-900 shadow-[0_20px_50px_rgba(0,0,0,0.8)] animate-in slide-in-from-left-2 duration-200 z-[100] w-[280px] group cursor-default">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-900/10">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-black/10">
                 <Notebook size={12} className="text-black" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-black">
                Internal Staff Briefing
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              className="p-1 rounded hover:bg-black/10 text-black transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {notes && (
              <div>
                {branchLabels && (
                  <p className="text-[9px] font-black uppercase tracking-wider text-black/70 mb-1">
                    ● {branchLabels.local}
                  </p>
                )}
                <div className="bg-white/20 p-3 rounded-lg border border-black/5">
                  <p className="text-[11px] font-bold text-black leading-relaxed italic">
                    "{notes}"
                  </p>
                </div>
              </div>
            )}
            {partnerNotes && (
              <div>
                {branchLabels && (
                  <p className="text-[9px] font-black uppercase tracking-wider text-black/70 mb-1">
                    ● {branchLabels.partner}
                  </p>
                )}
                <div className="bg-white/20 p-3 rounded-lg border border-black/5">
                  <p className="text-[11px] font-bold text-black leading-relaxed italic">
                    "{partnerNotes}"
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Visual pointer linking to the button */}
          <div className="absolute top-2 -left-2 w-4 h-4 bg-[#FFC107] border-l-2 border-t-2 border-dashed border-slate-900 rotate-[-45deg] transform translate-y-1" />
        </div>
      )}
    </div>
  );
};

export default ProductNoteWidget;
