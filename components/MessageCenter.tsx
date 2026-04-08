import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MessageSquare, X, Send, Upload, Check, 
  FileDown, Trash2, Settings, Volume2, Copy, Bell,
  Mail, ClipboardList, Camera, History, ExternalLink,
  AlertTriangle, Loader2, CornerUpLeft
} from 'lucide-react';
import { Message, BranchKey, BranchTask, ScreenshotPersistenceMethod } from '../types';
import { TooltipWrapper } from './SharedUI';
import { TaskManager } from './TaskManager';
import { 
  saveScreenshot, getScreenshots, deleteScreenshotFromDB, clearScreenshotsFromDB, ScreenshotEntry 
} from '../services/screenshotService';
import { uploadImage, uploadFileResumable } from '../services/storageService';
import { formatFileSize } from '../utils/stringUtils';

export const ChatWindow = ({ 
  isOpen, 
  onClose, 
  messages, 
  onSend, 
  onSendNudge,
  onToggleReadStatus,
  onDeleteMessage,
  onClearAllMessages,
  onToggleReaction,
  currentBranch, 
  theme,
  messageTone,
  setMessageTone,
  playNotification,
  tasks = [],
  onAddTask,
  onUpdateTask,
  onDeleteTask
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  messages: Message[]; 
  onSend: (
    text: string, 
    file?: { fileName: string; fileSize: number; fileType: string; fileData: string }, 
    taskId?: string,
    reply?: { id: string; text: string; sender: BranchKey }
  ) => void;
  onSendNudge?: (text: string) => void;
  onToggleReadStatus?: (id: string) => void;
  onDeleteMessage?: (id: string) => void;
  onClearAllMessages?: () => void;
  onToggleReaction?: (id: string, emoji: string) => void;
  currentBranch: BranchKey; 
  theme: 'dark';
  messageTone?: string;
  setMessageTone?: (tone: string) => void;
  playNotification?: (tone: string) => void;
  tasks?: BranchTask[];
  onAddTask?: (task: Omit<BranchTask, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void;
  onUpdateTask?: (id: string, updates: Partial<BranchTask>) => void;
  onDeleteTask?: (id: string) => void;
}) => {
  const [inputText, setInputText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [textPreviewId, setTextPreviewId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks' | 'history'>('chat');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [persistenceMethod, setPersistenceMethod] = useState<ScreenshotPersistenceMethod>(
    () => (localStorage.getItem('screenshot_persistence_method') as ScreenshotPersistenceMethod) || 'history'
  );
  const [screenshotHistory, setScreenshotHistory] = useState<ScreenshotEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<Record<string, { name: string, progress: number }>>({});
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  
  const [width, setWidth] = useState(() => Number(localStorage.getItem('chat-window-width')) || 448);
  const [isResizing, setIsResizing] = useState(false);

  const dragCounter = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastIsOpen = useRef(false);
  const lastActiveTab = useRef(activeTab);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const scrollToMessage = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(id);
      setTimeout(() => setHighlightedMsgId(null), 2000);
    }
  }, []);

  const TONES = [
    { id: 'message_default', name: 'Default Chime' },
    { id: 'message_bell', name: 'Crystal Bell' },
    { id: 'message_pop', name: 'Soft Pop' },
    { id: 'message_alert', name: 'Digital Alert' },
    { id: 'message_echo', name: 'Echo Triplet' }
  ];

  const PERSISTENCE_METHODS: { id: ScreenshotPersistenceMethod; name: string; description: string }[] = [
    { id: 'history', name: 'History List', description: 'Save to a local history tab' },
    { id: 'modal', name: 'Modal Display', description: 'Show immediately in a popup' },
    { id: 'temp_file', name: 'Temp File', description: 'Download as a temporary file' }
  ];

  useEffect(() => {
    localStorage.setItem('screenshot_persistence_method', persistenceMethod);
  }, [persistenceMethod]);

  // Load screenshots from IndexedDB
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await getScreenshots();
        setScreenshotHistory(data);
        
        if (localStorage.getItem('screenshot_history')) {
          localStorage.removeItem('screenshot_history');
        }
      } catch (e) {
        console.error("Failed to load screenshot history from IndexedDB", e);
      }
    };
    if (isOpen) loadHistory();
  }, [isOpen]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      const justOpened = !lastIsOpen.current;
      const tabSwitched = lastActiveTab.current !== 'chat';

      if (justOpened || tabSwitched) {
        setTimeout(() => scrollToBottom("auto"), 50);
      } else {
        scrollToBottom("smooth");
      }
    }
    lastIsOpen.current = isOpen;
    lastActiveTab.current = activeTab;
  }, [messages, isOpen, activeTab]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 320 && newWidth < 800) {
        setWidth(newWidth);
        localStorage.setItem('chat-window-width', String(newWidth));
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
    } else {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    
    const replyData = replyingTo ? {
      id: replyingTo.id,
      text: replyingTo.text || replyingTo.fileName || 'Attachment',
      sender: replyingTo.sender
    } : undefined;

    onSend(inputText, undefined, undefined, replyData);
    setInputText('');
    setReplyingTo(null);
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

  const performResumableUpload = async (file: File, prefix: string = 'msg') => {
    const taskId = `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const storagePath = `branch_communications/${currentBranch}/${taskId}_${file.name}`;
    
    setUploadProgress(prev => ({ ...prev, [taskId]: { name: file.name, progress: 0 } }));

    try {
      const downloadUrl = await uploadFileResumable(file, storagePath, (progress) => {
        setUploadProgress(prev => ({ ...prev, [taskId]: { ...prev[taskId], progress } }));
      });

      onSend(`📎 ${file.name}`, {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileData: downloadUrl
      });
      
      setTimeout(() => {
        setUploadProgress(prev => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
      }, 3000);
    } catch (err) {
      console.error("Resumable upload failed", err);
      setErrorMsg(`Upload failed: ${file.name}`);
      setUploadProgress(prev => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files) as File[];
    files.forEach(file => {
      if (file.size > 100 * 1024 * 1024) {
        setErrorMsg(`File too large: ${file.name} (${formatFileSize(file.size)}) - Max 100MB`);
        return;
      }
      performResumableUpload(file, 'drop');
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

  const save_to_temp = (data: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = data;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const display_modal = (data: string, fileName: string) => {
    const tempMsgId = `temp_${Date.now()}`;
    setTextPreviewId(tempMsgId);
  };

  const add_to_history = async (data: string, fileName: string) => {
    const newItem: ScreenshotEntry = {
      id: `scr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      data,
      fileName,
      timestamp: new Date().toISOString()
    };
    try {
      await saveScreenshot(newItem);
      const updated = await getScreenshots();
      setScreenshotHistory(updated);
    } catch (e) {
      console.error("Failed to save screenshot to history", e);
      setErrorMsg("Failed to save to local history database.");
    }
  };

  const handleDeleteHistory = async (id: string) => {
    try {
      await deleteScreenshotFromDB(id);
      setScreenshotHistory(prev => prev.filter(h => h.id !== id));
    } catch (e) {
      console.error("Failed to delete screenshot", e);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Clear screenshot history?")) return;
    try {
      await clearScreenshotsFromDB();
      setScreenshotHistory([]);
    } catch (e) {
      console.error("Failed to clear history", e);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    items.forEach(item => {
      if ((item as any).type.indexOf('image') !== -1) {
        const file = (item as any).getAsFile();
        if (file) {
          if (file.size > 100 * 1024 * 1024) {
            setErrorMsg("Pasted file exceeds 100MB limit.");
            return;
          }

          const reader = new FileReader();
          reader.onload = async () => {
            const base64Data = reader.result as string;
            const fileName = `pasted-image-${Date.now()}.png`;
            
            try {
              const fileToUpload = new File([file], fileName, { type: file.type });
              await performResumableUpload(fileToUpload, 'paste');

              switch (persistenceMethod) {
                case 'temp_file':
                  save_to_temp(base64Data, fileName);
                  break;
                case 'modal':
                  display_modal(base64Data, fileName);
                  break;
                case 'history':
                  add_to_history(base64Data, fileName);
                  break;
              }
            } catch (err) {
              console.error("Paste upload failed", err);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    });
  };

  const visibleMessages = messages.filter(m => !(m.deletedBy || []).includes(currentBranch));

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex justify-end ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
        onClick={onClose} 
      />

      {errorMsg && (
        <div className="fixed top-24 right-8 z-[200] bg-rose-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300">
           <AlertTriangle size={20} />
           <p className="font-black text-xs uppercase tracking-widest">{errorMsg}</p>
           <button onClick={() => setErrorMsg(null)} className="ml-4 p-1 hover:bg-white/20 rounded-lg transition-colors"><X size={16} /></button>
        </div>
      )}
      
      <div 
        className={`relative h-full flex flex-col bg-slate-900 border-l border-slate-800 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-right duration-300 ${isResizing ? '' : 'transition-[width]'}`}
        style={{ width: `${width}px` }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div 
          onMouseDown={startResizing}
          className="absolute top-0 bottom-0 -left-1 w-2 cursor-col-resize z-[120] group"
        >
          <div className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 transition-colors ${isResizing ? 'bg-indigo-500' : 'bg-transparent group-hover:bg-indigo-500/30'}`} />
        </div>

        {isDragging && (
          <div className="absolute inset-0 z-[110] bg-indigo-600/20 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-dashed border-indigo-500 m-6 rounded-[2.5rem] pointer-events-none animate-in fade-in duration-200">
             <Upload className="text-white mb-4 animate-bounce" size={48} />
             <p className="text-white font-black uppercase tracking-widest text-sm">Release to share files</p>
          </div>
        )}

        <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${currentBranch === 'bywood' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'}`}>
               <MessageSquare size={24} />
             </div>
             <div>
               <div className="flex items-center gap-2">
                 <h3 className="font-black text-lg text-white">Messaging {currentBranch === 'bywood' ? 'Broom Road' : 'Bywood Ave'}</h3>
                 <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${currentBranch === 'bywood' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                   TO {currentBranch === 'bywood' ? 'BROOM' : 'BYWOOD'}
                 </span>
               </div>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">From {currentBranch === 'bywood' ? 'Bywood Ave' : 'Broom Road'}</p>
             </div>
          </div>
          <div className="flex items-center gap-2 relative">
            {setMessageTone && messageTone && (
              <div className="relative">
                <button 
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`p-3 rounded-2xl hover:bg-slate-800 transition-colors ${isSettingsOpen ? 'text-indigo-400 bg-slate-800' : 'text-slate-400'}`}
                  data-tooltip="Communication Settings"
                >
                  <Settings size={20} />
                </button>
                {isSettingsOpen && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-[120] animate-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-slate-800 bg-slate-950/50">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <Volume2 size={12} /> Notification Tone
                      </p>
                    </div>
                    <div className="p-2 border-b border-slate-800">
                      {TONES.map(tone => (
                        <button
                          key={tone.id}
                          onClick={() => {
                            setMessageTone(tone.id);
                            if (playNotification) playNotification(tone.id);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all ${
                            messageTone === tone.id 
                              ? 'bg-indigo-500/20 text-indigo-300' 
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {tone.name}
                          {messageTone === tone.id && <Check size={14} className="text-indigo-400" />}
                        </button>
                      ))}
                    </div>

                    <div className="p-4 border-b border-slate-800 bg-slate-950/50">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <Camera size={12} /> Screenshot Persistence
                      </p>
                    </div>
                    <div className="p-2">
                      {PERSISTENCE_METHODS.map(method => (
                        <button
                          key={method.id}
                          onClick={() => setPersistenceMethod(method.id)}
                          className={`w-full flex flex-col p-2.5 rounded-xl transition-all ${
                            persistenceMethod === method.id 
                              ? 'bg-emerald-500/20 text-emerald-300' 
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-0.5">
                             <span className="text-xs font-bold">{method.name}</span>
                             {persistenceMethod === method.id && <Check size={14} className="text-emerald-400" />}
                          </div>
                          <span className="text-[9px] font-medium text-slate-500 text-left">{method.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {onClearAllMessages && visibleMessages.length > 0 && (
              <button 
                onClick={() => {
                  if (window.confirm("Are you sure you want to clear all messages for this branch?")) {
                    onClearAllMessages();
                  }
                }}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-transparent text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all group"
                data-tooltip="Clear All Messages"
              >
                <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Clear All</span>
              </button>
            )}
            <button onClick={onClose} className="p-3 rounded-2xl hover:bg-slate-800 text-slate-400 transition-colors"><X size={20} /></button>
          </div>
        </div>

        <div className="px-8 py-3 border-b border-slate-800 bg-slate-950/20 flex items-center justify-between shrink-0">
           <div className="flex p-1 rounded-2xl bg-slate-800 border border-slate-700">
              <button 
               onClick={() => setActiveTab('chat')}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <MessageSquare size={14} /> Messages
              </button>
              <button 
               onClick={() => setActiveTab('tasks')}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'tasks' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <ClipboardList size={14} /> Task Manager
              </button>
              <button 
               onClick={() => setActiveTab('history')}
               className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <History size={14} /> Local History
              </button>
           </div>
           {activeTab === 'history' && screenshotHistory.length > 0 && (
             <button 
              onClick={handleClearHistory}
              className="text-[9px] font-black uppercase text-slate-500 hover:text-rose-400 transition-colors"
             >
               Clear History
             </button>
           )}
        </div>
        
        {activeTab === 'chat' ? (
          <>
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950/30 scrollbar-hide"
            >
              {visibleMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-8">
                  <MessageSquare size={64} className="mb-4 text-indigo-400" />
                  <p className="text-sm font-black uppercase tracking-widest text-slate-500">No active communication logs</p>
                </div>
              ) : visibleMessages.map((msg: Message) => {
                const isMe = msg.sender === currentBranch;
                const isUnread = !isMe && !msg.isRead;
                
                return (
                  <div 
                    id={msg.id}
                    key={msg.id} 
                    className={`relative flex flex-col ${isMe ? 'items-end' : 'items-start'} group/msg animate-in fade-in slide-in-from-bottom-2 duration-300 transition-all ${
                      highlightedMsgId === msg.id ? 'ring-2 ring-indigo-500 ring-offset-4 ring-offset-slate-900 rounded-2xl scale-[1.02] z-10' : ''
                    }`}
                  >
                    
                    <div className={`absolute -top-4 ${isMe ? 'right-2' : 'left-2'} opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 bg-slate-800 p-1 rounded-xl shadow-xl border border-slate-700 z-20`}>
                      {onToggleReaction && ['👍', '❤️', '😂', '😮', '😢', '❌'].map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => onToggleReaction(msg.id, emoji)}
                          className="w-7 h-7 flex items-center justify-center text-sm hover:scale-125 transition-transform hover:bg-slate-700 rounded-full"
                        >
                          {emoji}
                        </button>
                      ))}
                      <div className="w-[1px] h-4 bg-slate-700 mx-1" />
                      <button
                        onClick={() => {
                          setReplyingTo(msg);
                          textInputRef.current?.focus();
                        }}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        data-tooltip="Reply"
                      >
                        <CornerUpLeft size={14} />
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(msg.text || msg.fileName || '')}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Copy size={14} />
                      </button>
                      {onDeleteMessage && (
                        <button
                          onClick={() => {
                            if (window.confirm("Delete this message?")) {
                              onDeleteMessage(msg.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div className={`relative max-w-[85%] p-4 rounded-[1.5rem] text-sm font-bold leading-relaxed shadow-lg transition-all ${
                      msg.isNudge ? (isMe ? 'bg-amber-600 text-white rounded-tr-none border-2 border-amber-400 animate-pulse' : 'bg-amber-500/20 text-amber-200 rounded-tl-none border-2 border-amber-500/50 animate-pulse') :
                      (isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 
                      (isUnread ? 'bg-slate-800 text-white rounded-tl-none border border-indigo-500/30 ring-1 ring-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-slate-800 text-slate-300 rounded-tl-none border border-slate-700'))
                    }`}>
                      {msg.replyToId && (
                        <div 
                          onClick={() => scrollToMessage(msg.replyToId!)}
                          className={`mb-3 p-3 rounded-xl border-l-4 bg-black/20 flex flex-col gap-1 cursor-pointer hover:bg-black/30 transition-all active:scale-[0.98] group/reply-preview ${isMe ? 'border-indigo-400' : 'border-slate-500'}`}
                          data-tooltip="Jump to original message"
                        >
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/60 flex items-center gap-2 group-hover/reply-preview:text-indigo-400 transition-colors">
                             <CornerUpLeft size={10} /> {msg.replyToSender === 'bywood' ? 'Bywood Ave' : 'Broom Road'}
                          </p>
                          <p className="text-xs italic line-clamp-2 text-white/80">{msg.replyToText}</p>
                        </div>
                      )}
                      {msg.isNudge && (
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/20">
                          <Bell size={14} className="animate-shake" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Urgent Nudge</span>
                        </div>
                      )}
                      {msg.fileData ? (
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                              <FileDown size={20} className="text-white" />
                            </div>
                                                    <div className="flex-1 min-w-0">
                                                      <p className="text-xs font-bold truncate text-white">{msg.fileName}</p>
                                                      <p className="text-[10px] text-white/50">{formatFileSize(msg.fileSize || 0)}</p>
                                                    </div>                            <button
                              onClick={() => downloadFile(msg)}
                              className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider hover:bg-indigo-400 transition-colors shadow-lg shadow-indigo-500/20"
                            >
                              Download
                            </button>
                          </div>
                          {(msg.fileType?.startsWith('image/') || msg.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) && (
                            <div 
                              className="mt-3 rounded-xl overflow-hidden border border-white/10 cursor-pointer group/img-preview relative"
                              onClick={() => viewText(msg.id)}
                            >
                              <img src={msg.fileData} alt={msg.fileName} className="w-full h-auto max-h-64 object-cover transition-transform group-hover/img-preview:scale-105" />
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img-preview:opacity-100 transition-opacity flex items-center justify-center">
                                 <span className="bg-slate-900/80 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">Click to Preview</span>
                              </div>
                            </div>
                          )}
                          {textPreviewId === msg.id && (
                            <div className="fixed inset-0 z-[150] flex items-center justify-center p-8 bg-slate-950/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200" onClick={() => setTextPreviewId(null)}>
                               <div className="relative max-w-5xl w-full max-h-[90vh] bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                                  <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                                     <h4 className="font-black uppercase tracking-widest text-slate-400 text-xs flex items-center gap-3">
                                       <FileDown size={16} /> {msg.fileName || (screenshotHistory.find(h => h.id === textPreviewId)?.fileName)}
                                     </h4>
                                     <div className="flex items-center gap-2">
                                        <button onClick={() => {
                                          const data = msg.fileData || (screenshotHistory.find(h => h.id === textPreviewId)?.data);
                                          const name = msg.fileName || (screenshotHistory.find(h => h.id === textPreviewId)?.fileName);
                                          if (data) save_to_temp(data, name || 'download');
                                        }} className="p-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"><FileDown size={20} /></button>
                                        <button onClick={() => setTextPreviewId(null)} className="p-3 rounded-2xl bg-slate-800 text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
                                     </div>
                                  </div>
                                  <div className="flex-1 overflow-auto p-8">
                                    {msg.fileType?.startsWith('image/') || msg.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i) || msg.id.startsWith('temp_') || msg.id.startsWith('scr_') ? (
                                      <img src={msg.fileData || (screenshotHistory.find(h => h.id === textPreviewId)?.data)} alt={msg.fileName} className="max-w-full h-auto mx-auto rounded-xl shadow-2xl" />
                                    ) : (
                                      <pre 
                                        className="p-6 rounded-2xl bg-slate-950/50 border border-slate-800 text-sm font-mono text-slate-300 leading-relaxed" 
                                        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                                      >
                                        {decodeFileText(msg.fileData || '')}
                                      </pre>
                                    )}
                                  </div>
                               </div>
                            </div>
                          )}
                        </div>
                      ) : msg.taskId ? (
                        <div 
                          className="mt-1 p-3 bg-slate-900/50 border border-indigo-500/30 rounded-xl cursor-pointer hover:bg-slate-900 transition-colors flex items-center gap-3"
                          onClick={() => { setActiveTab('tasks'); setActiveTaskId(msg.taskId!); }}
                        >
                          <ClipboardList className="text-indigo-400" size={20} />
                          <div>
                            <p className="text-xs font-black text-white uppercase tracking-widest">{tasks?.find(t => t.id === msg.taskId)?.title || 'Unknown Task'}</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase">Click to view details</p>
                          </div>
                        </div>
                      ) : (
                        <span>{msg.text}</span>
                      )}
                    </div>
                    
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1.5 px-1 w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={() => onToggleReaction?.(msg.id, emoji)}
                            className={`px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-1 border transition-colors ${
                              users.includes(currentBranch) 
                                ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' 
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            <span>{emoji}</span>
                            {users.length > 1 && <span className="font-bold">{users.length}</span>}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-1 px-1">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                            {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        
                        {!isMe && onToggleReadStatus && (
                            <button 
                                onClick={() => onToggleReadStatus(msg.id)}
                                className={`p-1 rounded-md transition-all opacity-0 group-hover/msg:opacity-100 flex items-center gap-1.5 ${isUnread ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-slate-800 text-slate-500 hover:bg-indigo-600/10 hover:text-indigo-400'}`}
                            >
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

            <div className="p-6 bg-slate-900 border-t border-slate-800 shrink-0">
              {replyingTo && (
                <div className="mb-4 bg-slate-950/50 rounded-2xl p-4 border border-indigo-500/30 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-1.5 h-10 bg-indigo-500 rounded-full shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest flex items-center gap-2">
                        <CornerUpLeft size={12} /> Replying to {replyingTo.sender === 'bywood' ? 'Bywood Ave' : 'Broom Road'}
                      </p>
                      <p className="text-xs text-slate-400 font-bold truncate mt-1 italic">
                        {replyingTo.text || replyingTo.fileName || 'Attachment'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setReplyingTo(null)}
                    className="p-2 rounded-xl hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
              {Object.entries(uploadProgress).length > 0 && (
                <div className="mb-4 space-y-2">
                  {Object.entries(uploadProgress).map(([id, data]) => (
                    <div key={id} className="bg-slate-950 rounded-xl p-3 border border-slate-800 animate-in slide-in-from-bottom-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 truncate max-w-[80%]">
                          <Loader2 size={12} className="animate-spin shrink-0" /> Uploading {(data as any).name}
                        </span>
                        <span className="text-[10px] font-black text-white">{(data as any).progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                          style={{ width: `${(data as any).progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <form 
                onSubmit={handleSend} 
                className="flex items-center gap-3"
              >
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all shrink-0"
                  data-tooltip="Upload File (up to 100MB)"
                >
                  <Upload size={20} />
                </button>
                <input 
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 100 * 1024 * 1024) {
                         setErrorMsg(`File too large: ${file.name} (${formatFileSize(file.size)}) - Max 100MB`);
                      } else {
                         performResumableUpload(file, 'select');
                      }
                    }
                  }}
                />
                <div className="relative flex-1 group">
                  <input 
                    type="text" 
                    ref={textInputRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onPaste={handlePaste}
                    placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
                    className="w-full pl-6 pr-12 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-bold text-sm outline-none focus:border-indigo-500 focus:ring-4 ring-indigo-500/10 transition-all text-white placeholder-slate-700 shadow-inner"
                  />
                  <button 
                    type="submit" 
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/40 disabled:opacity-30"
                    disabled={!inputText.trim()}
                  >
                    <Send size={18} />
                  </button>
                </div>
                {onSendNudge && (
                  <button 
                    type="button"
                    onClick={() => {
                      console.log("[ChatWindow] Nudge button triggered");
                      try {
                        onSendNudge(inputText || "🔔 Attention required! (Manual Nudge)");
                        setInputText('');
                      } catch (e) {
                        console.error("[ChatWindow] Nudge execution failed:", e);
                      }
                    }}
                    className="p-2.5 rounded-xl bg-slate-800/50 text-slate-500 hover:bg-amber-500 hover:text-slate-950 hover:shadow-amber-500/20 transition-all active:scale-95 group/nudge-btn shrink-0"
                    data-tooltip="Send Immediate Nudge"
                  >
                    <Bell size={18} className="group-hover/nudge-btn:animate-shake" />
                  </button>
                )}
              </form>
              <p className="mt-4 text-[9px] font-bold text-slate-600 text-center uppercase tracking-[0.2em] opacity-60">Asset Sharing Enabled • Drop Files Anywhere</p>
            </div>
          </>
        ) : activeTab === 'tasks' ? (
          <div className="flex-1 overflow-hidden">
             <TaskManager 
                tasks={tasks}
                onAddTask={onAddTask!}
                onUpdateTask={onUpdateTask!}
                onDeleteTask={onDeleteTask!}
                currentBranch={currentBranch}
                theme={theme}
                activeTaskId={activeTaskId}
                onShareTask={(taskId) => {
                  const task = tasks.find(t => t.id === taskId);
                  onSend(`📌 Shared Task: ${task?.title || 'Unknown Task'}`, undefined, taskId);
                  setActiveTab('chat');
                }}
             />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-950/30 scrollbar-hide">
            <div className="flex items-center gap-3 mb-4">
              <History size={24} className="text-amber-500" />
              <h4 className="font-black text-white uppercase tracking-widest text-sm">Screenshot History</h4>
            </div>
            {screenshotHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30 py-20 text-center">
                <Camera size={48} className="mb-4 text-slate-500" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-500">No locally saved screenshots</p>
                <p className="text-[10px] font-bold text-slate-600 mt-2">Paste screenshots in chat to populate history</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {screenshotHistory.map(item => (
                  <div key={item.id} className="group bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-amber-500/30 transition-all">
                    <div className="relative aspect-video overflow-hidden">
                       <img src={item.data} alt={item.fileName} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                       <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img-preview:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <button 
                            onClick={() => setTextPreviewId(item.id)}
                            className="p-3 rounded-2xl bg-white text-slate-950 hover:bg-amber-500 transition-colors shadow-xl"
                          >
                            <ExternalLink size={20} />
                          </button>
                          <button 
                            onClick={() => save_to_temp(item.data, item.fileName)}
                            className="p-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-xl"
                          >
                            <FileDown size={20} />
                          </button>
                       </div>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                       <div>
                          <p className="text-xs font-bold text-slate-200 truncate max-w-[200px]">{item.fileName}</p>
                          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">
                            {new Date(item.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                       </div>
                       <button 
                        onClick={() => handleDeleteHistory(item.id)}
                        className="p-2 rounded-xl text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

