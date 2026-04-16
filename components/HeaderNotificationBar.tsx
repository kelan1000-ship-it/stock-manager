import React, { useMemo, useEffect } from 'react';
import { MessageSquare, ArrowRightLeft, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { BranchKey } from '../types';
import { StockState, setLastSeenMessages } from './stockSlice';

interface HeaderNotificationBarProps {
  currentBranch: BranchKey;
  syncStatus?: 'connected' | 'reconnecting' | 'offline' | 'error';
  onOpenChat?: () => void;
}

export const HeaderNotificationBar: React.FC<HeaderNotificationBarProps> = ({
  syncStatus,
  onOpenChat
}) => {
  const dispatch = useDispatch();
  const unreadCounts = useSelector((state: { stock: StockState }) => state.stock.unreadCounts);

  const handleClearMessages = () => {
    if (onOpenChat) onOpenChat();
  };

  useEffect(() => {
    const totalNotifications = unreadCounts.messages + unreadCounts.transfers;

    if (totalNotifications > 0) {
      document.title = `(${totalNotifications}) Stock Manager`;
    } else {
      document.title = 'Stock Manager';
    }

    const updateFavicon = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = "https://i.postimg.cc/9F0JcWHq/Greenchem-Logo-Official.png";

      img.onload = () => {
        ctx.clearRect(0, 0, 32, 32);
        
        // Draw the logo (scaled to fit)
        const scale = Math.min(32 / img.width, 32 / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (32 - w) / 2;
        const y = (32 - h) / 2;
        ctx.drawImage(img, x, y, w, h);

        if (totalNotifications > 0) {
          // Draw badge background
          ctx.beginPath();
          ctx.arc(24, 8, 8, 0, 2 * Math.PI);
          ctx.fillStyle = '#ef4444'; // red-500
          ctx.fill();

          // Draw badge text
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const text = totalNotifications > 9 ? '9+' : totalNotifications.toString();
          ctx.fillText(text, 24, 8);
        }

        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = canvas.toDataURL('image/png');
      };

      img.onerror = () => {
        ctx.clearRect(0, 0, 32, 32);
        
        if (totalNotifications > 0) {
          ctx.beginPath();
          ctx.arc(16, 16, 12, 0, 2 * Math.PI);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 14px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const text = totalNotifications > 9 ? '9+' : totalNotifications.toString();
          ctx.fillText(text, 16, 16);
        }

        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = canvas.toDataURL('image/png');
      };
    };

    updateFavicon();

  }, [unreadCounts]);

  const syncPill = syncStatus && syncStatus !== 'connected' ? (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
      syncStatus === 'offline' ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400' :
      syncStatus === 'reconnecting' ? 'bg-blue-500/15 border border-blue-500/30 text-blue-400' :
      'bg-rose-500/15 border border-rose-500/30 text-rose-400'
    }`}>
      {syncStatus === 'offline' && <><WifiOff size={10} /> Offline — Showing Last Known Data</>}
      {syncStatus === 'reconnecting' && <><RefreshCw size={10} className="animate-spin" /> Reconnecting...</>}
      {syncStatus === 'error' && <><AlertTriangle size={10} /> Sync Error — Data May Be Stale</>}
    </div>
  ) : null;

  if (unreadCounts.messages === 0 && unreadCounts.transfers === 0) {
    return (
      <div className="hidden md:flex items-center gap-2">
        {syncPill}
        {!syncPill && (
          <div className="px-4 py-2 rounded-2xl bg-slate-900/40 border border-slate-800/50 opacity-60">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest whitespace-nowrap">No Notifications</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner">
      {syncPill}
      {syncPill && (unreadCounts.messages > 0 || unreadCounts.transfers > 0) && (
        <div className="w-1 h-1 rounded-full bg-slate-700" />
      )}
      {unreadCounts.messages > 0 && (
        <div 
          onClick={handleClearMessages}
          className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 cursor-pointer hover:bg-white/5 px-2 py-1 rounded-lg transition-colors"
        >
          <MessageSquare size={12} className="text-indigo-400" />
          <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest whitespace-nowrap">
            {unreadCounts.messages} New Message{unreadCounts.messages !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      
      {unreadCounts.messages > 0 && unreadCounts.transfers > 0 && (
        <div className="w-1 h-1 rounded-full bg-slate-700" />
      )}

      {unreadCounts.transfers > 0 && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
          <ArrowRightLeft size={12} className="text-amber-500" />
          <span className="text-[9px] font-black uppercase text-amber-500 tracking-widest whitespace-nowrap">
            {unreadCounts.transfers} Pending Transfer{unreadCounts.transfers !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
};
