
import React, { useRef, useEffect, useState } from 'react';
import { X, AlertTriangle, Loader2, RefreshCw, Zap } from 'lucide-react';
import { extractBarcodeOnly } from '../services/geminiService';

export const LiveVisionScanner = ({ theme, onDetected, onClose }: { theme: string; onDetected: (code: string) => void; onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasNativeSupport, setHasNativeSupport] = useState(false);

  // Check for native BarcodeDetector support
  useEffect(() => {
    // @ts-ignore
    if ('BarcodeDetector' in window) {
      setHasNativeSupport(true);
    }
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        // Stop existing tracks if any
        if (videoRef.current && videoRef.current.srcObject) {
          const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
          tracks.forEach(t => t.stop());
        }

        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error(err);
        setError("Camera access denied or unavailable.");
      }
    };
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [facingMode]);

  // Auto-scan loop
  useEffect(() => {
    const scanInterval = setInterval(async () => {
        if (isScanning || !videoRef.current || !canvasRef.current) return;
        if (videoRef.current.readyState !== 4) return;

        setIsScanning(true);
        
        try {
            // Priority 1: Native BarcodeDetector (Fastest)
            // @ts-ignore
            if (window.BarcodeDetector) {
                try {
                    // @ts-ignore
                    const barcodeDetector = new BarcodeDetector({ 
                        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code', 'data_matrix'] 
                    });
                    const barcodes = await barcodeDetector.detect(videoRef.current);
                    if (barcodes.length > 0) {
                        const raw = barcodes[0].rawValue;
                        onDetected(raw);
                        onClose();
                        return;
                    }
                } catch (e) {
                    // Native detection silent fail -> continue to fallback check
                }
            } 
            
            // Priority 2: Cloud Vision (Gemini) - Fallback
            // Only run if native failed or is unavailable
            // We limit cloud calls to keep API usage reasonable while still feeling "auto"
            if (!hasNativeSupport) {
                 const context = canvasRef.current.getContext('2d');
                 if (context) {
                    canvasRef.current.width = videoRef.current.videoWidth;
                    canvasRef.current.height = videoRef.current.videoHeight;
                    context.drawImage(videoRef.current, 0, 0);
                    
                    // Reduce quality for speed
                    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.6);
                    const base64 = dataUrl.split(',')[1];
                    
                    const barcode = await extractBarcodeOnly(base64, 'image/jpeg');
                    if (barcode) {
                        onDetected(barcode);
                        onClose();
                    }
                 }
            }

        } catch (e) {
            console.error("Scan iteration error", e);
        } finally {
            setIsScanning(false);
        }
    }, hasNativeSupport ? 250 : 1500); // 250ms for native (very snappy), 1.5s for cloud (throttled)

    return () => clearInterval(scanInterval);
  }, [isScanning, hasNativeSupport, onDetected, onClose]);

  const toggleCamera = () => {
      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
       {/* Header Controls */}
       <div className="absolute top-6 right-6 z-30 flex gap-4">
         <button 
            onClick={toggleCamera} 
            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-95"
         >
            <RefreshCw size={20} />
         </button>
         <button 
            onClick={onClose} 
            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-rose-500/80 hover:border-rose-500 transition-all active:scale-95"
         >
            <X size={24}/>
         </button>
       </div>

       {/* Camera Viewport */}
       <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
         {error ? (
           <div className="text-white text-center px-8 animate-in zoom-in duration-300">
             <div className="w-20 h-20 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={40} className="text-rose-500" />
             </div>
             <p className="font-black text-lg uppercase tracking-widest mb-2">Scanner Offline</p>
             <p className="text-sm text-slate-400 font-medium">{error}</p>
           </div>
         ) : (
           <>
             <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="absolute inset-0 w-full h-full object-cover opacity-90 transition-opacity duration-500" 
             />
             
             {/* Target Overlay */}
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
                {/* Darken outer area */}
                <div className="absolute inset-0 bg-black/40 mask-image-center" />
                
                <div className="w-72 h-48 border-2 border-white/40 rounded-3xl relative overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-scan-fast" />
                    
                    {/* Corner Guides */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-emerald-500 rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-emerald-500 rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-emerald-500 rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-emerald-500 rounded-br-xl" />
                </div>

                <div className="mt-10 px-6 py-2.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-2xl">
                    {isScanning ? (
                        <Loader2 size={12} className="animate-spin text-emerald-400" />
                    ) : (
                        <Zap size={12} className="text-emerald-400 fill-emerald-400" />
                    )}
                    {hasNativeSupport ? "Rapid Laser Scan Active" : "AI Vision Processing..."}
                </div>
             </div>
           </>
         )}
         <canvas ref={canvasRef} className="hidden" />
       </div>

       <style>{`
         @keyframes scan-fast {
           0% { transform: translateY(0); opacity: 0.8; }
           50% { opacity: 1; }
           100% { transform: translateY(192px); opacity: 0.8; }
         }
         .animate-scan-fast { animation: scan-fast 1.2s infinite linear; }
         .mask-image-center {
            mask-image: radial-gradient(circle at center, transparent 35%, black 60%);
            -webkit-mask-image: radial-gradient(circle at center, transparent 35%, black 60%);
         }
       `}</style>
    </div>
  );
};
