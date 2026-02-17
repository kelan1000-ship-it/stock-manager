import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Upload, Circle, MailOpen, Mail, Check, FileDown, FileText } from 'lucide-react';
import { Message, BranchKey } from '../types';

export const ChatWindow = ({ 
  isOpen, 
  onClose, 
  messages, 
  onSend, 
  onToggleReadStatus,
  currentBranch, 
  theme 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  messages: Message[]; 
  onSend: (text: string, file?: { fileName: string; fileSize: number; fileType: string; fileData: string }) => void;
  onToggleReadStatus?: (id: string) => void;
  currentBranch: BranchKey; 
  theme: 'dark' 
}) => {
  const [inputText, setInputText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [textPreviewId, setTextPreviewId] = useState<string | null>(null);
  const dragCounter = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    onSend(inputText);
    setInputText('');
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files) as File[];
    files.forEach(file => {
      if (file.size > 500 * 1024) {
        onSend(`📎 Shared file: ${file.name} (${(file.size / 1024).toFixed(1)} KB) — too large to embed`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        onSend(`📎 ${file.name}`, {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          fileData: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const downloadFile = (msg: Message) => {
    if (!msg.fileData) return;
    const a = document.createElement('a');
    a.href = msg.fileData;
    a.download = msg.fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const viewText = (msgId: string) => {
    setTextPreviewId(prev => prev === msgId ? null : msgId);
  };

  const decodeFileText = (fileData: string): string => {
    try {
      const base64 = fileData.split(',')[1] || '';
      return atob(base64);
    } catch {
      return '[Unable to decode file content]';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Click-out Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      <div 
        className="relative w-full max-w-md h-full flex flex-col bg-slate-900 border-l border-slate-800 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-300 overflow-hidden"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay hint */}
        {isDragging && (
          <div className="absolute inset-0 z-[110] bg-indigo-600/20 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-dashed border-indigo-500 m-6 rounded-[2.5rem] pointer-events-none animate-in fade-in duration-200">
             <Upload className="text-white mb-4 animate-bounce" size={48} />
             <p className="text-white font-black uppercase tracking-widest text-sm">Release to share files</p>
          </div>
        )}

        <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">Branch Communication</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{currentBranch === 'bywood' ? 'Broom Road' : 'Bywood Ave'} Comms</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 rounded-2xl hover:bg-slate-800 text-slate-400 transition-colors"><X size={20} /></button>
        </div>
        
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/30"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-8">
              <MessageSquare size={64} className="mb-4 text-indigo-400" />
              <p className="text-sm font-black uppercase tracking-widest text-slate-500">No active communication logs</p>
            </div>
          ) : messages.map((msg: Message) => {
            const isMe = msg.sender === currentBranch;
            const isUnread = !isMe && !msg.isRead;
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group/msg animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`relative max-w-[85%] p-4 rounded-[1.5rem] text-sm font-bold leading-relaxed shadow-lg transition-all ${
                  isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 
                  (isUnread ? 'bg-slate-800 text-white rounded-tl-none border border-indigo-500/30 ring-1 ring-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-slate-800 text-slate-300 rounded-tl-none border border-slate-700')
                }`}>
                  {msg.fileData ? (
                    <div>
                      <div className="flex items-center gap-3">
                        <FileDown size={18} className="shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{msg.fileName}</p>
                          <p className="text-[9px] opacity-60">{((msg.fileSize || 0) / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          onClick={() => viewText(msg.id)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                            textPreviewId === msg.id ? 'bg-indigo-500/30 hover:bg-indigo-500/40' : 'bg-white/10 hover:bg-white/20'
                          }`}
                        >
                          Text
                        </button>
                        <button
                          onClick={() => downloadFile(msg)}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase tracking-wider transition-colors"
                        >
                          Download
                        </button>
                      </div>
                      {textPreviewId === msg.id && (
                        <pre className="mt-3 p-3 rounded-lg bg-slate-950/60 border border-slate-700/50 text-[11px] font-mono text-slate-300 leading-relaxed max-h-60 overflow-auto" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {decodeFileText(msg.fileData)}
                        </pre>
                      )}
                    </div>
                  ) : msg.text}

                  {isUnread && (
                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-slate-900 shadow-md animate-pulse" title="New Message" />
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-2 px-1">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    
                    {!isMe && onToggleReadStatus && (
                        <button 
                            onClick={() => onToggleReadStatus(msg.id)}
                            className={`p-1 rounded-md transition-all opacity-0 group-hover/msg:opacity-100 flex items-center gap-1.5 ${isUnread ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-slate-800 text-slate-500 hover:bg-indigo-600/10 hover:text-indigo-400'}`}
                            title={isUnread ? "Mark as Read" : "Mark as Unread"}
                        >
                            {/* Fixed: Use the 'Check' icon which is now correctly imported */}
                            {isUnread ? <Check size={10} strokeWidth={4} /> : <Mail size={10} />}
                            <span className="text-[8px] font-black uppercase tracking-tighter">
                                {isUnread ? 'Read' : 'Mark Unread'}
                            </span>
                        </button>
                    )}
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSend} className="p-8 bg-slate-900 border-t border-slate-800">
          <div className="relative group">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type or drop files..." 
              className="w-full pl-6 pr-14 py-4 rounded-2xl bg-slate-950 border border-slate-800 font-bold text-sm outline-none focus:border-indigo-500 focus:ring-4 ring-indigo-500/10 transition-all text-white placeholder-slate-700 shadow-inner"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/40">
              <Send size={18} />
            </button>
          </div>
          <p className="mt-4 text-[9px] font-bold text-slate-600 text-center uppercase tracking-[0.2em] opacity-60">Asset Sharing Enabled • Drop Files Anywhere</p>
        </form>
      </div>
    </div>
  );
};