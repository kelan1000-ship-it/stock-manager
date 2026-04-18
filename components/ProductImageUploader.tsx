
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Loader2, Image as ImageIcon, CheckCircle2, AlertCircle, CloudUpload, Upload, X, RefreshCcw, Move, ZoomIn, ZoomOut, Link as LinkIcon, Check, Sparkles } from 'lucide-react';
import { mockDb } from '../services/mockDb';
import { SafeImage } from './SafeImage';

export const ProductPhotoCapture = ({ onCaptured, onClose }: { onCaptured: (base64: string) => void; onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        if (stream) {
          (stream as MediaStream).getTracks().forEach(t => t.stop());
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError("Camera access denied.");
      }
    };
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    setCapturedImage(null);
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext('2d');
    if (context) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      setCapturedImage(canvasRef.current.toDataURL('image/jpeg'));
    }
  };

  const confirmCrop = () => {
    if (!capturedImage) return;
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const side = Math.min(img.width, img.height);
      canvas.width = 1920; 
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const sourceSize = side / zoom;
        const sourceX = (img.width - sourceSize) * (position.x / 100);
        const sourceY = (img.height - sourceSize) * (position.y / 100);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
          img,
          sourceX, sourceY, sourceSize, sourceSize,
          0, 0, 1920, 1920
        );
        onCaptured(canvas.toDataURL('image/webp', 0.95));
        onClose();
      }
    };
    img.src = capturedImage;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !capturedImage) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPosition({ 
      x: Math.min(100, Math.max(0, x)), 
      y: Math.min(100, Math.max(0, y)) 
    });
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col select-none">
       <div className="absolute top-4 right-4 z-30 flex gap-4">
         {!capturedImage && (
           <button onClick={toggleCamera} className="p-4 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition-all"><RefreshCcw size={24}/></button>
         )}
         <button onClick={onClose} className="p-4 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-rose-600 transition-all"><X size={24}/></button>
       </div>

       <div className="flex-1 relative flex items-center justify-center overflow-hidden">
         {error ? (
           <div className="text-white text-center p-8">
             <AlertCircle size={48} className="mx-auto text-rose-500 mb-4" />
             <p>{error}</p>
           </div>
         ) : capturedImage ? (
           <div className="relative w-full h-full flex flex-col items-center justify-center p-8 gap-8">
              <div 
                className="relative w-full max-w-[500px] aspect-square rounded-3xl border-4 border-emerald-500 overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.3)] cursor-move"
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
                onMouseMove = {handleMouseMove}
              >
                 <SafeImage 
                   src={capturedImage} 
                   alt="Captured product photo preview"
                   className="absolute pointer-events-none transition-transform duration-75" 
                   style={{
                     width: 'auto',
                     height: 'auto',
                     minWidth: '100%',
                     minHeight: '100%',
                     transform: `scale(${zoom}) translate(${(50 - position.x) / zoom}%, ${(50 - position.y) / zoom}%)`,
                     transformOrigin: 'center'
                   }}
                 />
                 <div className="absolute inset-0 border-[60px] border-black/60 pointer-events-none flex items-center justify-center">
                    <div className="w-full h-full border border-white/20" />
                 </div>
                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 text-white text-[8px] font-black uppercase tracking-widest backdrop-blur-md">
                    <Move size={10} /> Drag to position
                 </div>
              </div>
              
              <div className="w-full max-w-[300px] space-y-3">
                 <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <span>Zoom Level</span>
                    <span>{zoom.toFixed(1)}x</span>
                 </div>
                 <div className="flex items-center gap-4">
                    <button onClick={() => setZoom(prev => Math.max(1, prev - 0.2))} className="p-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors"><ZoomOut size={20}/></button>
                    <input 
                      type="range" 
                      min="1" 
                      max="3" 
                      step="0.1" 
                      value={zoom} 
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 bg-slate-800 rounded-full appearance-none accent-emerald-500 cursor-pointer"
                    />
                    <button onClick={() => setZoom(prev => Math.min(3, prev + 0.2))} className="p-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors"><ZoomIn size={20}/></button>
                 </div>
              </div>
           </div>
         ) : (
           <>
             <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full max-w-[500px] aspect-square border-2 border-dashed border-white/50 rounded-3xl" />
                <div className="absolute inset-0 bg-black/20" />
             </div>
             <div className="absolute bottom-12 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full bg-black/40 text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                Align Product within Frame
             </div>
           </>
         )}
         <canvas ref={canvasRef} className="hidden" />
       </div>

       <div className="p-12 bg-black/80 flex justify-center gap-6">
          {capturedImage ? (
            <>
              <button onClick={() => setCapturedImage(null)} className="px-8 py-4 rounded-2xl bg-slate-800 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all">Retake</button>
              <button onClick={confirmCrop} className="px-12 py-4 rounded-2xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/40">Finalize & Crop</button>
            </>
          ) : (
            <button 
              onClick={takePhoto} 
              className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform group"
            >
               <div className="w-16 h-16 rounded-full bg-white group-hover:bg-slate-200 transition-colors" />
            </button>
          )}
       </div>
    </div>
  );
};

interface ProductImageUploaderProps {
  productId: string;
  productName: string;
  currentImageUrl?: string | null;
  onUploadComplete?: (newUrl: string) => void;
}

const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({ 
  productId, 
  productName, 
  currentImageUrl,
  onUploadComplete 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error' | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const browseInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreview(currentImageUrl || null);
  }, [currentImageUrl]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 1920;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas rendering context failed'));
            return;
          }
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/webp', 0.95);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    
    // Handle dropped files only
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setIsUploading(true);
      setStatusMessage('Optimizing dropped asset...');
      try {
        const compressedBase64 = await compressImage(file);
        setPreview(compressedBase64);
        await uploadImage(compressedBase64);
      } catch (err: any) {
        setStatusMessage(`Sync Error: ${err.message}`);
        setStatusType('error');
        setIsUploading(false);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setStatusMessage('Optimizing for secure vault...');
    setStatusType(null);

    try {
      const compressedBase64 = await compressImage(file);
      setPreview(compressedBase64); 
      await uploadImage(compressedBase64);
    } catch (err: any) {
      console.error('Processing error:', err);
      setStatusMessage(`Sync Error: ${err.message}`);
      setStatusType('error');
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (browseInputRef.current) browseInputRef.current.value = '';
    }
  };

  const uploadImage = async (base64OrUrl: string) => {
    setIsUploading(true);
    setStatusMessage('Pushing to Cloud Storage...');
    setStatusType(null);
    
    try {
      const { uploadProductImage } = await import('../services/storageService');
      
      // Convert data URL or remote URL to Blob for Firebase Storage
      const response = await fetch(base64OrUrl);
      const blob = await response.blob();
      
      const safeProductId = (productId && productId !== 'new_mode' && productId !== 'edit_mode') ? productId : 'temp';
      const finalUrl = await uploadProductImage(blob, safeProductId);

      // Safe update: Only update master DB if we have a real product ID (not creating new or editing pending)
      if (productId && productId !== 'new_mode' && productId !== 'edit_mode') {
        await mockDb.updateMasterProductImage(productId, finalUrl);
      }

      setStatusMessage('Visual Asset Synced Successfully');
      setStatusType('success');
      setPreview(finalUrl);
      
      if (onUploadComplete) {
        onUploadComplete(finalUrl);
      }

    } catch (error: any) {
      console.error('Cloud Sync failed:', error);
      setStatusMessage(`Sync Bridge failure: ${error.message || 'Check network'}`);
      setStatusType('error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (browseInputRef.current) browseInputRef.current.value = '';
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-full flex flex-col gap-3 p-6 rounded-[2.5rem] bg-slate-900 border transition-all duration-300 shadow-2xl relative overflow-hidden ${
        isDraggingOver ? 'border-emerald-500 scale-[1.01] bg-emerald-500/5 ring-8 ring-emerald-500/10' : 'border-slate-800'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
         <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <CloudUpload size={14} className="text-emerald-500" />
         </div>
         <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
           PRODUCT VISUAL ENGINE
         </h3>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative w-24 h-24 rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden flex-shrink-0 group shadow-inner flex items-center justify-center">
          {preview ? (
            <SafeImage src={preview} alt={productName} className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-110' />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-800">
              <ImageIcon size={32} />
            </div>
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center backdrop-blur-sm z-10">
              <Loader2 className="animate-spin text-emerald-500" size={24} />
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div className="space-y-0.5">
            <p className="text-lg font-black text-white truncate pr-2 capitalize leading-none tracking-tight">{productName || 'Unnamed Item'}</p>
            <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">ID: {productId === 'new_mode' || productId === 'edit_mode' ? 'DIT_MODE' : productId.toUpperCase()}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
             <button 
               onClick={() => setIsCameraOpen(true)}
               disabled={isUploading}
               className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg ${
                 isUploading 
                   ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed' 
                   : 'bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-500 shadow-emerald-900/40'
               }`}
             >
               <Camera size={14} strokeWidth={3} />
               RETAKE
             </button>
             <button 
               onClick={() => browseInputRef.current?.click()}
               disabled={isUploading}
               className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 border ${
                 isUploading 
                   ? 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed' 
                   : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700 hover:border-slate-600 shadow-md'
               }`}
             >
               <Upload size={14} strokeWidth={3} />
               UPLOAD
             </button>
             <input type="file" accept="image/*" ref={browseInputRef} onChange={handleFileChange} className="hidden" />
          </div>

          <div className="flex items-start gap-2 p-2 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
             <Sparkles size={12} className="text-indigo-400 shrink-0 mt-0.5" />
             <p className="text-[9px] font-bold text-slate-500 leading-relaxed">
               <span className="text-indigo-400 font-black uppercase tracking-wider mr-1">Pro-Tip</span> 
               You can drag & drop image urls directly from google or your supplier's website here
             </p>
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.15em]">IMAGE SOURCE URL</label>
            {preview && !isUploading && (
               <div className="flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">ACTIVE ASSET LINK</span>
               </div>
            )}
          </div>
          <div className="relative group/url">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within/url:text-indigo-500 transition-colors pointer-events-none">
              <LinkIcon size={14} />
            </div>
            <input 
              type="text"
              value={preview || ''}
              onChange={(e) => {
                const val = e.target.value;
                setPreview(val);
                if (onUploadComplete) onUploadComplete(val);
              }}
              onBlur={() => {
                // Manually trigger upload if a URL is pasted and it differs from the current drive link
                if (preview && preview.startsWith('http') && preview !== currentImageUrl && !preview.includes('googleusercontent.com')) {
                  uploadImage(preview);
                }
              }}
              placeholder="Paste product reference URL or data URI..."
              className="w-full pl-11 pr-4 py-4 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-indigo-400/80 outline-none focus:border-indigo-500/50 focus:text-indigo-300 transition-all placeholder-slate-800 shadow-inner"
            />
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className={`mt-2 p-3 rounded-2xl border flex items-center gap-3 animate-in fade-in duration-300 ${
          statusType === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
          statusType === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 
          'bg-slate-800/80 border-slate-700 text-slate-300'
        }`}>
          <div className="shrink-0">
            {statusType === 'success' ? <CheckCircle2 size={14} /> : 
             statusType === 'error' ? <AlertCircle size={14} /> : 
             <Loader2 size={14} className="animate-spin" />}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest leading-none truncate">{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="ml-auto p-1 hover:bg-white/5 rounded-lg transition-colors"><X size={14}/></button>
        </div>
      )}

      {isCameraOpen && (
        <ProductPhotoCapture 
          onCaptured={async (base64) => {
            setPreview(base64);
            setIsCameraOpen(false);
            await uploadImage(base64);
          }}
          onClose={() => setIsCameraOpen(false)}
        />
      )}
    </div>
  );
};

export default ProductImageUploader;
