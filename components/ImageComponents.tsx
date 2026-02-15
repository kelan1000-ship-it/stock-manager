
import React, { useState, useEffect } from 'react';
import { Package, ZoomIn, ZoomOut, X, ScanEye } from 'lucide-react';
import { SafeImage } from './SafeImage';

// Product Thumbnail Component
export const ProductThumbnail = ({ src, alt, onClick }: { src?: string | null, alt: string, onClick?: () => void }) => {
  const [error, setError] = useState(false);
  
  useEffect(() => {
    setError(false);
  }, [src]);

  if (!src || error) {
    return (
      <button 
        onClick={onClick}
        className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-700 hover:text-slate-400 transition-colors shrink-0"
        title="No image available"
      >
        <Package size={20} />
      </button>
    );
  }

  const validSrc = src;

  return (
    <button 
      onClick={onClick} 
      className="w-10 h-10 rounded-lg border border-slate-700 overflow-hidden relative group shrink-0 bg-white"
      title={`View ${alt}`}
    >
       <SafeImage src={validSrc} alt={alt} onError={() => setError(true)} className='w-full h-full object-cover transition-transform duration-300 group-hover:scale-110' />
       <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
    </button>
  );
};

// Product Preview Modal (formerly ImageLightbox)
export const ProductPreviewModal = ({ 
  src, 
  isOpen, 
  onClose, 
  title,
  actions
}: { 
  src: string; 
  isOpen: boolean; 
  onClose: () => void; 
  title?: string;
  actions?: { label: string; onClick: () => void; primary?: boolean; icon?: React.ReactNode }[];
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    if (!isOpen) setIsZoomed(false);
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setMousePos({ x, y });
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
      <div className="absolute top-8 right-8 z-10 flex gap-4">
        <button 
          onClick={() => setIsZoomed(!isZoomed)}
          className="p-4 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10 backdrop-blur-md"
          title={isZoomed ? "Actual Size" : "Toggle Detailed Zoom"}
        >
          {isZoomed ? <ZoomOut size={24} /> : <ZoomIn size={24} />}
        </button>
        <button 
          onClick={onClose}
          className="p-4 rounded-2xl bg-rose-600 text-white hover:bg-rose-500 transition-all shadow-xl shadow-rose-900/40"
        >
          <X size={24} />
        </button>
      </div>

      <div 
        className={`relative w-full h-full flex flex-col items-center justify-center overflow-hidden rounded-[3rem] ${isZoomed ? 'cursor-move' : 'cursor-zoom-in'}`}
      >
        <div 
          className="relative w-full h-full flex items-center justify-center"
          onClick={() => setIsZoomed(!isZoomed)}
          onMouseMove={handleMouseMove}
        >
          <SafeImage 
            src={src} 
            alt='Product Detail' 
            className={`max-w-full max-h-full transition-transform duration-100 ease-out select-none ${isZoomed ? 'scale-[2.5]' : 'object-contain'}`} 
            style={{
                transformOrigin: `${mousePos.x}% ${mousePos.y}%`
            }}
          />
        </div>
        
        <div 
            className={`absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 transition-opacity duration-300 ${isZoomed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
             {title && (
               <div className="px-6 py-3 rounded-2xl bg-slate-900/90 border border-slate-700/50 text-white shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-2">
                 <h3 className="font-bold text-sm tracking-wide">{title}</h3>
               </div>
             )}
             
             {actions && actions.length > 0 ? (
               <div className="flex items-center gap-3 animate-in slide-in-from-bottom-4 delay-75">
                 {actions.map((action, idx) => (
                   <button
                     key={idx}
                     onClick={(e) => { e.stopPropagation(); action.onClick(); }}
                     className={`px-8 py-3 rounded-full font-black uppercase text-[10px] tracking-[0.2em] shadow-xl backdrop-blur-md flex items-center gap-2 transition-all active:scale-95 ${
                       action.primary 
                         ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/40' 
                         : 'bg-slate-800/90 border border-white/10 text-white hover:bg-slate-700'
                     }`}
                   >
                     {action.icon}
                     {action.label}
                   </button>
                 ))}
               </div>
             ) : (
                <div className="px-8 py-3 rounded-full bg-slate-800/90 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.25em] shadow-xl backdrop-blur-md flex items-center gap-3 animate-in slide-in-from-bottom-4 delay-75 group pointer-events-none">
                    <ScanEye size={14} className="text-emerald-400" />
                    <span>Click Image to Inspect</span>
                </div>
             )}
        </div>
      </div>
    </div>
  );
};
