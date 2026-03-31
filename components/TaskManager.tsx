
import React, { useState, useRef, useEffect } from 'react';
import {
  ClipboardList, Plus, Trash2, CheckCircle2, Circle,
  AlertCircle, Clock, User, ChevronRight, ChevronDown,
  Filter, Calendar, MoreVertical, X, Image as ImageIcon,
  Upload, Loader2, Link2, Send, MessageSquare, Download, Maximize2, Pencil, Check
} from 'lucide-react';import { BranchTask, BranchKey } from '../types';
import { uploadImage } from '../services/storageService';
import { formatFileSize } from '../utils/stringUtils';

interface TaskManagerProps {
  tasks: BranchTask[];
  onAddTask: (task: Omit<BranchTask, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void;
  onUpdateTask: (id: string, updates: Partial<BranchTask>) => void;
  onDeleteTask: (id: string) => void;
  currentBranch: BranchKey;
  theme: 'dark';
  activeTaskId?: string | null;
  onShareTask?: (taskId: string) => void;
}

interface TaskItemProps {
  task: BranchTask;
  onUpdateTask: (id: string, updates: Partial<BranchTask>) => void;
  onDeleteTask: (id: string) => void;
  onShareTask?: (taskId: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  currentBranch: BranchKey;
  isUploading: boolean;
  onImageUpload: (file: File) => void;
  onRemoveImage: (url: string) => void;
  onPreviewImage: (url: string, name: string) => void;
  formatFileSize: (size: number) => string;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task, onUpdateTask, onDeleteTask, onShareTask, isExpanded, onToggleExpand,
  currentBranch, isUploading, onImageUpload, onRemoveImage, onPreviewImage, formatFileSize
}) => {
  const [localDescription, setLocalDescription] = useState(task.description || '');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  const handleEditComment = (commentId: string, newText: string) => {
    if (!newText.trim()) return;
    const updatedComments = task.comments?.map(c => 
      c.id === commentId ? { ...c, text: newText } : c
    );
    if (updatedComments) {
      onUpdateTask(task.id, { comments: updatedComments });
    }
    setEditingCommentId(null);
  };

  const toggleReaction = (commentId: string, emoji: string) => {
    const updatedComments = task.comments?.map(c => {
      if (c.id === commentId) {
        const reactions = { ...(c.reactions || {}) };
        const users = reactions[emoji] || [];
        if (users.includes(currentBranch)) {
          reactions[emoji] = users.filter(u => u !== currentBranch);
          if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
          reactions[emoji] = [...users, currentBranch];
        }
        return { ...c, reactions };
      }
      return c;
    });
    if (updatedComments) {
      onUpdateTask(task.id, { comments: updatedComments });
    }
  };

  useEffect(() => {
    setLocalDescription(task.description || '');
  }, [task.description, isExpanded]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle2 size={18} className="text-emerald-500" />;
      case 'in-progress': return <Clock size={18} className="text-blue-500" />;
      default: return <Circle size={18} className="text-slate-500" />;
    }
  };

  return (
    <div 
      className={`group bg-slate-900/50 border transition-all rounded-2xl overflow-hidden ${
        task.status === 'done' ? 'border-slate-800 opacity-60' : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900'
      }`}
    >
      <div className="p-4 flex items-center gap-4">
        <button 
          onClick={() => onUpdateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })}
          className="shrink-0 transition-transform active:scale-90"
        >
          {getStatusIcon(task.status)}
        </button>
        
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggleExpand}>
           <h4 className={`font-bold text-sm truncate ${task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
             {task.title}
           </h4>
           <div className="flex items-center gap-3 mt-1">
              <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter border ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
                 <User size={10} /> {task.createdBy === 'bywood' ? 'Bywood' : 'Broom'}
              </span>
              {task.dueDate && (
                <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
                   <Calendar size={10} /> {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
           </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           {onShareTask && (
             <button 
              onClick={(e) => { e.stopPropagation(); onShareTask(task.id); }}
              className="p-2 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
              data-tooltip="Share to Chat"
             >
               <MessageSquare size={16} />
             </button>
           )}
           <button 
            onClick={() => onDeleteTask(task.id)}
            className="p-2 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
           >
             <Trash2 size={16} />
           </button>
           <button 
            onClick={onToggleExpand}
            className="p-2 rounded-lg text-slate-500 hover:text-white transition-colors"
           >
             {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
           </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-12 pb-4 pt-0 border-t border-slate-800/50 mt-2 bg-slate-950/20">
           <div className="py-4 space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Description</label>
                <textarea 
                  placeholder="Add details about this task..."
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-300 outline-none focus:border-indigo-500/50 min-h-[80px]"
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                  onBlur={() => onUpdateTask(task.id, { description: localDescription })}
                />
              </div>
              
              <div className="flex flex-wrap gap-4">
                 <div>
                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Status</label>
                   <select 
                     className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase text-slate-300 outline-none"
                     value={task.status}
                     onChange={(e) => onUpdateTask(task.id, { status: e.target.value as any })}
                   >
                     <option value="todo">TO DO</option>
                     <option value="in-progress">In Progress</option>
                     <option value="done">Done</option>
                   </select>
                 </div>
                 <div>
                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Priority</label>
                   <select 
                     className={`bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase outline-none ${getPriorityColor(task.priority)}`}
                     value={task.priority}
                     onChange={(e) => onUpdateTask(task.id, { priority: e.target.value as any })}
                   >
                     <option value="low">Low</option>
                     <option value="medium">Medium</option>
                     <option value="high">High</option>
                   </select>
                 </div>
                 <div>
                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Assigned To</label>
                   <select 
                     className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase text-slate-300 outline-none"
                     value={task.assignedTo}
                     onChange={(e) => onUpdateTask(task.id, { assignedTo: e.target.value as any })}
                   >
                     <option value="both">Both Branches</option>
                     <option value="bywood">Bywood Ave</option>
                     <option value="broom">Broom Road</option>
                   </select>
                 </div>
                 <div>
                   <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Due Date</label>
                   <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1">
                      <Calendar size={12} className="text-slate-500" />
                      <input 
                        type="date"
                        value={task.dueDate || ''}
                        onChange={(e) => onUpdateTask(task.id, { dueDate: e.target.value || undefined })}
                        className="bg-transparent border-none outline-none text-[10px] font-black uppercase text-slate-300 [color-scheme:dark]"
                      />
                   </div>
                 </div>
              </div>

              <div className="mt-6">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Attachments</label>
                <div className="flex flex-wrap gap-3">
                   {task.images?.map((img, idx) => (
                     <div key={idx} className="relative group/img w-20 h-20 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-lg">
                        <img src={img.url} className="w-full h-full object-cover" alt={img.name} />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                          <span className="text-[8px] font-black text-white bg-slate-900/80 px-1.5 py-0.5 rounded-md">{formatFileSize(img.size)}</span>
                          <div className="flex items-center gap-1">
                            <button 
                              type="button"
                              onClick={() => onPreviewImage(img.url, img.name)}
                              className="p-1.5 bg-slate-800 text-slate-300 rounded-lg shadow-xl hover:bg-slate-700 hover:text-white transition-colors"
                              data-tooltip="Preview Image"
                            >
                              <Maximize2 size={12} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = img.url;
                                a.download = img.name || 'download';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              }}
                              className="p-1.5 bg-indigo-500 text-white rounded-lg shadow-xl hover:bg-indigo-600 transition-colors"
                              data-tooltip="Download Image"
                            >
                              <Download size={12} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => onRemoveImage(img.url)}
                              className="p-1.5 bg-rose-500 text-white rounded-lg shadow-xl hover:bg-rose-600 transition-colors"
                              data-tooltip="Delete Image"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                     </div>
                   ))}
                   <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600 hover:text-slate-400 hover:border-slate-700 hover:bg-slate-900/50 transition-all group"
                   >
                     {isUploading ? (
                       <Loader2 size={20} className="animate-spin text-indigo-500" />
                     ) : (
                       <>
                         <Upload size={20} className="group-hover:scale-110 transition-transform" />
                         <span className="text-[8px] font-black uppercase mt-1">Upload</span>
                       </>
                     )}
                   </button>
                   <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onImageUpload(file);
                    }}
                   />
                </div>
              </div>

              <div className="mt-6">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Links & Resources</label>
                <div className="space-y-2 mb-3">
                  {task.links?.map((link, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 truncate">
                        <Link2 size={14} className="shrink-0" />
                        {link.title || link.url}
                      </a>
                      <button 
                        onClick={() => {
                          const updatedLinks = (task.links || []).filter((_, i) => i !== idx);
                          onUpdateTask(task.id, { links: updatedLinks });
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Link Title (optional)"
                    className="w-1/3 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-300 outline-none focus:border-indigo-500/50"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                  />
                  <input 
                    type="url"
                    placeholder="https://..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-300 outline-none focus:border-indigo-500/50"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newLinkUrl.trim()) {
                        e.preventDefault();
                        onUpdateTask(task.id, { links: [...(task.links || []), { url: newLinkUrl.trim(), title: newLinkTitle.trim() || newLinkUrl.trim() }] });
                        setNewLinkUrl('');
                        setNewLinkTitle('');
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (newLinkUrl.trim()) {
                        onUpdateTask(task.id, { links: [...(task.links || []), { url: newLinkUrl.trim(), title: newLinkTitle.trim() || newLinkUrl.trim() }] });
                        setNewLinkUrl('');
                        setNewLinkTitle('');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors text-[10px] font-black uppercase"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-800 pt-4">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Comments & Flow</label>
                <div className="space-y-3 mb-3 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
                  {task.comments?.map(c => (
                    <div key={c.id} className={`group relative p-3 rounded-xl text-xs font-bold ${c.author === currentBranch ? 'bg-indigo-600/20 text-indigo-100' : 'bg-slate-900 border border-slate-800 text-slate-300'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <User size={10} /> {c.author} - {new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        {c.author === currentBranch && editingCommentId !== c.id && (
                           <button onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.text); }} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-opacity">
                             <Pencil size={12} />
                           </button>
                        )}
                      </div>
                      
                      {editingCommentId === c.id ? (
                        <div className="flex gap-2 mt-2">
                           <input 
                              type="text" 
                              value={editCommentText} 
                              onChange={(e) => setEditCommentText(e.target.value)} 
                              className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && editCommentText.trim()) {
                                  handleEditComment(c.id, editCommentText.trim());
                                } else if (e.key === 'Escape') {
                                  setEditingCommentId(null);
                                }
                              }}
                           />
                           <button onClick={() => handleEditComment(c.id, editCommentText.trim())} className="text-emerald-400 hover:text-emerald-300"><Check size={14}/></button>
                           <button onClick={() => setEditingCommentId(null)} className="text-rose-400 hover:text-rose-300"><X size={14}/></button>
                        </div>
                      ) : (
                        <div>{c.text}</div>
                      )}

                      <div className="absolute -top-3 right-8 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-800 p-1 rounded-xl shadow-xl border border-slate-700 z-20">
                         {['👍', '❤️', '😂', '😮', '😢', '❌'].map(emoji => (
                           <button
                             key={emoji}
                             onClick={() => toggleReaction(c.id, emoji)}
                             className="w-6 h-6 flex items-center justify-center text-xs hover:scale-125 transition-transform hover:bg-slate-700 rounded-full"
                           >
                             {emoji}
                           </button>
                         ))}
                      </div>

                      {c.reactions && Object.keys(c.reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(c.reactions).map(([emoji, users]) => (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(c.id, emoji)}
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
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Add a comment..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-bold text-slate-300 outline-none focus:border-indigo-500/50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const newComment = { id: Date.now().toString(), author: currentBranch, text: e.currentTarget.value.trim(), createdAt: new Date().toISOString() };
                        onUpdateTask(task.id, { comments: [...(task.comments || []), newComment] });
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>

           </div>
        </div>
      )}
    </div>
  );
};

export const TaskManager: React.FC<TaskManagerProps> = ({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  currentBranch,
  theme,
  activeTaskId,
  onShareTask
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [filter, setFilter] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    if (activeTaskId) {
      setExpandedTaskId(activeTaskId);
      setFilter('all');
      setTimeout(() => {
        const el = document.getElementById(`task-${activeTaskId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [activeTaskId]);

  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const handleImageUpload = async (taskId: string, file: File) => {
    setIsUploading(taskId);
    try {
      const imageId = `task_img_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const path = `task_manager/${taskId}/${imageId}`;
      const url = await uploadImage(file, path);
      
      const task = tasks.find(t => t.id === taskId);
      const currentImages = task?.images || [];
      onUpdateTask(taskId, { 
        images: [...currentImages, { url, name: file.name, size: file.size }] 
      });
    } catch (error) {
      console.error("Task image upload failed", error);
      alert("Failed to upload image.");
    } finally {
      setIsUploading(null);
    }
  };

  const removeImage = (taskId: string, imageUrl: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      onUpdateTask(taskId, { images: (task.images || []).filter(img => img.url !== imageUrl) });
    }
  };

  const filteredTasks = tasks.filter(t => filter === 'all' || t.status === filter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask({
      title: newTaskTitle,
      status: 'todo',
      priority: newTaskPriority,
      assignedTo: 'both',
      dueDate: newTaskDueDate || undefined
    });
    setNewTaskTitle('');
    setNewTaskDueDate('');
    setNewTaskPriority('medium');
    setIsAdding(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="flex p-1 rounded-xl bg-slate-800 border border-slate-700">
            {(['all', 'todo', 'in-progress', 'done'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  filter === f ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {f === 'todo' ? 'TO DO' : f.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20"
        >
          <Plus size={14} /> New Task
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isAdding && (
          <form onSubmit={handleCreateTask} className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-4 shadow-xl animate-in zoom-in-95 duration-200">
            <input
              autoFocus
              type="text"
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-white font-bold placeholder-slate-600 mb-4"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-2 items-center">
                 <select 
                    className={`bg-slate-800 border-none rounded-lg px-2 py-1 text-[10px] font-bold outline-none ${getPriorityColor(newTaskPriority)}`}
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                 >
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="low">Low Priority</option>
                 </select>
                 <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-2 py-1 border border-slate-700">
                    <Calendar size={12} className="text-slate-500" />
                    <input 
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="bg-transparent border-none outline-none text-[10px] font-bold text-slate-300 [color-scheme:dark]"
                    />
                 </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:bg-slate-800">Cancel</button>
                <button type="submit" className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase">Create Task</button>
              </div>
            </div>
          </form>
        )}

        {filteredTasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 py-20">
            <ClipboardList size={48} className="mb-4 text-slate-500" />
            <p className="text-sm font-black uppercase tracking-widest text-slate-500">No tasks found</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <TaskItem 
              key={task.id}
              task={task}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onShareTask={onShareTask}
              isExpanded={expandedTaskId === task.id}
              onToggleExpand={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
              currentBranch={currentBranch}
              isUploading={isUploading === task.id}
              onImageUpload={(file) => handleImageUpload(task.id, file)}
              onRemoveImage={(url) => removeImage(task.id, url)}
              onPreviewImage={(url, name) => setPreviewImage({ url, name })}
              formatFileSize={formatFileSize}
            />
          ))
        )}
      </div>

      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <div className="w-full flex justify-end gap-4 p-4 absolute top-0 right-0">
              <button 
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = previewImage.url;
                  a.download = previewImage.name || 'download';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="p-3 bg-indigo-600/80 text-white rounded-full hover:bg-indigo-500 transition-colors shadow-2xl backdrop-blur-sm"
                data-tooltip="Download Image"
              >
                <Download size={24} />
              </button>
              <button 
                onClick={() => setPreviewImage(null)}
                className="p-3 bg-slate-800/80 text-white rounded-full hover:bg-slate-700 transition-colors shadow-2xl backdrop-blur-sm"
                data-tooltip="Close Preview"
              >
                <X size={24} />
              </button>
            </div>
            <img 
              src={previewImage.url} 
              alt={previewImage.name} 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
            />
            <p className="mt-4 text-white font-black uppercase tracking-widest text-sm bg-black/50 px-4 py-2 rounded-lg">{previewImage.name}</p>
          </div>
        </div>
      )}
    </div>
  );
};
