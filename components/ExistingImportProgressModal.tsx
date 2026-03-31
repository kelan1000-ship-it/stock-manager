import React, { useState, useEffect } from 'react';
import { X, FileUp, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { MasterProduct } from '../types';
import { parseMasterImportData } from '../utils/masterImportParser';

interface ExistingImportProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  masterInventory: MasterProduct[];
  onComplete: (processed: MasterProduct[], deletedIds: Set<string>) => void;
}

export const ExistingImportProgressModal: React.FC<ExistingImportProgressModalProps> = ({
  isOpen,
  onClose,
  file,
  masterInventory,
  onComplete,
}) => {
  const [status, setStatus] = useState<'idle' | 'parsing' | 'processing' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [currentAction, setCurrentAction] = useState('');
  const [stats, setStats] = useState({ updated: 0, new: 0, deleted: 0, errors: [] as string[] });
  const [processedData, setProcessedData] = useState<MasterProduct[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && file && status === 'idle') {
      handleImport();
    }
  }, [isOpen, file, status]);

  const handleImport = () => {
    setStatus('parsing');
    setCurrentAction('Reading file...');
    setProgress(10);
    setStats({ updated: 0, new: 0, deleted: 0, errors: [] });
    setDeletedIds(new Set());
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result as string;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];
        
        if (data.length > 0) {
          processDataInChunks(data);
        } else {
          setStatus('error');
          setStats(s => ({ ...s, errors: ['File is empty or invalid format.'] }));
        }
      } catch (err) {
        setStatus('error');
        setStats(s => ({ ...s, errors: ['Failed to parse file. Ensure it is a valid Excel or CSV.'] }));
      }
    };
    reader.onerror = () => {
      setStatus('error');
      setStats(s => ({ ...s, errors: ['Failed to read file.'] }));
    };
    reader.readAsBinaryString(file!);
  };

  const processDataInChunks = (data: any[]) => {
    setStatus('processing');
    setCurrentAction('Validating and updating records...');
    
    const CHUNK_SIZE = 200;
    let currentIndex = 0;
    
    const allProcessed: MasterProduct[] = [];
    const allDeletedIds = new Set<string>();
    let totalUpdated = 0;
    let totalNew = 0;
    let totalDeleted = 0;
    let allErrors: string[] = [];

    const processNextChunk = () => {
      const chunk = data.slice(currentIndex, currentIndex + CHUNK_SIZE);
      const result = parseMasterImportData(chunk, masterInventory);

      // Merge results
      result.processed.forEach(p => allProcessed.push(p));
      result.deletedIds.forEach(id => allDeletedIds.add(id));
      totalUpdated += result.stats.updated;
      totalNew += result.stats.new;
      totalDeleted += result.stats.deleted;
      allErrors = [...allErrors, ...result.errors];

      currentIndex += CHUNK_SIZE;
      
      // Update progress
      const currentProgress = Math.min(10 + Math.floor((currentIndex / data.length) * 90), 99);
      setProgress(currentProgress);
      setStats({ updated: totalUpdated, new: totalNew, deleted: totalDeleted, errors: allErrors });
      setDeletedIds(new Set(allDeletedIds));

      if (currentIndex < data.length) {
        requestAnimationFrame(() => {
            setTimeout(processNextChunk, 10);
        });
      } else {
        // Finished
        setProcessedData(allProcessed);
        setProgress(100);
        setCurrentAction('Complete');
        if (allProcessed.length > 0 || allDeletedIds.size > 0) {
          setStatus('success');
        } else {
          setStatus('error');
          if (allErrors.length === 0) {
              setStats(s => ({ ...s, errors: ['No valid records found in the uploaded file.'] }));
          }
        }
      }
    };

    setTimeout(processNextChunk, 50);
  };

  const handleFinish = () => {
    onComplete(processedData, deletedIds);
    setStatus('idle');
    setProgress(0);
    setCurrentAction('');
    setStats({ updated: 0, new: 0, deleted: 0, errors: [] });
    setProcessedData([]);
    setDeletedIds(new Set());
  };

  const handleModalClose = () => {
    if (status === 'processing' || status === 'parsing') {
        if (!confirm("Import is still in progress. Are you sure you want to cancel?")) {
            return;
        }
    }
    // Reset state before closing
    setStatus('idle');
    setProgress(0);
    setCurrentAction('');
    setStats({ updated: 0, new: 0, errors: [] });
    setProcessedData([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-[2.5rem] border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col text-white animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                status === 'error' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                status === 'success' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                'bg-blue-500/10 text-blue-500 border-blue-500/20'
              }`}>
                 {status === 'error' ? <AlertCircle size={24} /> :
                  status === 'success' ? <CheckCircle size={24} /> :
                  <FileUp size={24} />}
              </div>
              <div>
                 <h3 className="text-xl font-black">Import Existing Data</h3>
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                    {status === 'idle' ? 'Ready' : 
                     status === 'error' ? 'Import Failed' :
                     status === 'success' ? 'Import Complete' : 'Processing...'}
                 </p>
              </div>
           </div>
           {(status === 'success' || status === 'error' || status === 'idle') && (
             <button onClick={handleModalClose} className="p-2 rounded-xl hover:bg-slate-800 transition-colors text-slate-500 hover:text-white">
                <X size={20}/>
             </button>
           )}
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
            {(status === 'parsing' || status === 'processing') && (
                <div className="space-y-4">
                    <div className="flex justify-between text-xs font-bold">
                        <span className="text-blue-400 flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin" /> {currentAction}
                        </span>
                        <span className="text-white">{progress}%</span>
                    </div>
                    <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-300 ease-out relative overflow-hidden" 
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        </div>
                    </div>
                    {status === 'processing' && (
                        <div className="flex gap-4 justify-center mt-4 text-[10px] font-black uppercase tracking-widest">
                            <span className="text-emerald-400">{stats.updated} Updated</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-amber-400">{stats.new} New</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-rose-400">{stats.deleted} Deleted</span>
                            <span className="text-slate-600">•</span>
                            <span className={stats.errors.length > 0 ? 'text-rose-400' : 'text-slate-500'}>{stats.errors.length} Errors</span>
                        </div>
                    )}
                </div>
            )}

            {status === 'success' && (
                <div className="space-y-6">
                    <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center text-center">
                        <CheckCircle size={32} className="text-emerald-500 mb-3" />
                        <p className="text-sm font-black text-emerald-400">Successfully validated and parsed {processedData.length} records.</p>
                        
                        <div className="flex gap-6 justify-center mt-4 pt-4 border-t border-emerald-500/20 w-full text-xs font-black uppercase tracking-widest">
                            <div className="flex flex-col items-center gap-1"><span className="text-2xl text-white">{stats.updated}</span><span className="text-emerald-500/70">Updated</span></div>
                            <div className="flex flex-col items-center gap-1"><span className="text-2xl text-white">{stats.new}</span><span className="text-emerald-500/70">New</span></div>
                            <div className="flex flex-col items-center gap-1"><span className="text-2xl text-white">{stats.deleted}</span><span className="text-rose-500/70">Deleted</span></div>
                        </div>
                    </div>
                </div>
            )}

            {status === 'error' && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold">
                    <p className="mb-2 font-black uppercase tracking-widest text-[10px]">Import Errors:</p>
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                        {stats.errors.slice(0, 5).map((err, i) => (
                            <li key={i}>{err}</li>
                        ))}
                        {stats.errors.length > 5 && (
                            <li className="text-rose-500/70 italic">...and {stats.errors.length - 5} more.</li>
                        )}
                    </ul>
                </div>
            )}

            {/* Minor errors during a successful run */}
            {status === 'success' && stats.errors.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold max-h-32 overflow-y-auto scrollbar-hide">
                    <p className="mb-2 font-black uppercase tracking-widest text-[10px] text-amber-500">Warnings ({stats.errors.length}):</p>
                    <ul className="list-disc pl-5 space-y-1">
                        {stats.errors.slice(0, 5).map((err, i) => (
                            <li key={i}>{err}</li>
                        ))}
                        {stats.errors.length > 5 && (
                            <li className="text-amber-500/70 italic">...and {stats.errors.length - 5} more warnings.</li>
                        )}
                    </ul>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800/50 flex justify-end gap-3 bg-slate-950/50">
           {(status === 'success' || status === 'error') && (
               <button 
                  onClick={handleModalClose}
                  className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
               >
                  {status === 'success' ? 'Cancel' : 'Close'}
               </button>
           )}
           {status === 'success' && (
               <button 
                  onClick={handleFinish}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-900/40 flex items-center gap-2 font-black text-xs uppercase tracking-widest"
               >
                  <CheckCircle size={16} /> Apply {processedData.length} Updates
               </button>
           )}
        </div>
      </div>
    </div>
  );
};
