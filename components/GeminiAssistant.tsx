
import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, X, Send, Bot, User, Loader2, 
  BarChart3, Search, AlertCircle, ArrowRightLeft, 
  MessageSquare, Trash2, Maximize2, Minimize2,
  Home
} from 'lucide-react';
import { ChatMessage } from '../hooks/useGeminiAssistant';
import { TooltipWrapper } from './SharedUI';

interface GeminiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isLoading: boolean;
  onClear: () => void;
}

export const GeminiAssistant: React.FC<GeminiAssistantProps> = ({
  isOpen,
  onClose,
  messages,
  onSend,
  isLoading,
  onClear
}) => {
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSend(inputText);
    setInputText('');
  };

  const quickActions = [
    { label: 'Branch Snapshot', icon: BarChart3, text: 'Generate a branch snapshot' },
    { label: 'Price Alerts', icon: AlertCircle, text: 'Are there any price alerts I should know about?' },
    { label: 'Pending Requests', icon: Search, text: 'What are the pending requests?' },
    { label: 'Branch Comms', icon: MessageSquare, text: 'Send a message to the other branch saying ' },
  ];

  return (
    <div className={`fixed inset-y-0 right-0 z-[150] flex flex-col bg-slate-900 border-l border-slate-800 shadow-2xl transition-all duration-300 ease-in-out ${isExpanded ? 'w-full md:w-[600px]' : 'w-full md:w-[400px]'}`}>
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="font-black text-white text-sm uppercase tracking-wider">Gemini Assistant</h3>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">AI-Powered Operations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button 
              onClick={onClear} 
              className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors flex items-center gap-2 text-xs font-bold"
            >
              <Home size={14} />
              <span>HOME</span>
            </button>
          )}
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors hidden md:block"
          >
            {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button 
            onClick={onClear} 
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
            data-tooltip="Clear Chat"
          >
            <Trash2 size={18} />
          </button>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-500">
            <div className="w-20 h-20 rounded-[2rem] bg-slate-800 flex items-center justify-center text-slate-600 border border-slate-700/50">
              <Bot size={40} />
            </div>
            <div className="space-y-2">
              <h4 className="text-white font-black uppercase tracking-tight">How can I help today?</h4>
              <p className="text-xs text-slate-500 font-bold max-w-[240px]">I can analyze stock, draft transfers, and manage branch communications.</p>
            </div>

            <div className="grid grid-cols-1 gap-2 w-full max-w-[280px]">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => onSend(action.text)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800 transition-all text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors">
                    <action.icon size={16} />
                  </div>
                  {action.label === 'Branch Comms' ? (
                    <TooltipWrapper tooltip="Branch Communications">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-white transition-colors">{action.label}</span>
                    </TooltipWrapper>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-white transition-colors">{action.label}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
              <div className={`flex items-center gap-2 mb-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${msg.role === 'user' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {msg.role === 'user' ? <User size={12} /> : <Sparkles size={12} />}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                  {msg.role === 'user' ? 'You' : 'Gemini'}
                </span>
              </div>
              <div className={`relative max-w-[90%] p-4 rounded-2xl text-sm font-bold leading-relaxed shadow-lg ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
              }`}>
                <div className="whitespace-pre-wrap break-words">
                  {msg.parts.map((p, idx) => p.text).join('')}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex flex-col items-start animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Sparkles size={12} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Gemini is thinking</span>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl rounded-tl-none border border-slate-700/50">
              <Loader2 className="animate-spin text-emerald-500" size={18} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 bg-slate-900 border-t border-slate-800 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="relative group">
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder="Ask Gemini anything..."
            className="w-full pl-6 pr-14 py-4 rounded-2xl bg-slate-950 border border-slate-800 font-bold text-sm outline-none focus:border-indigo-500 focus:ring-4 ring-indigo-500/10 transition-all text-white placeholder-slate-700 shadow-inner disabled:opacity-50"
          />
          <button 
            type="submit" 
            disabled={!inputText.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/40 disabled:opacity-50 disabled:bg-slate-800"
          >
            <Send size={18} />
          </button>
        </form>
        <p className="mt-4 text-[9px] font-bold text-slate-600 text-center uppercase tracking-[0.2em] opacity-60">
          Powered by Gemini 3.0 Flash • Operations Optimized
        </p>
      </div>
    </div>
  );
};
