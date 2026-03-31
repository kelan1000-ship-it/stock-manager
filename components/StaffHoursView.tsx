import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Download, UserPlus, LogOut, Clock, Calendar,
  Palmtree, Trash2, Plus, ChevronDown, ChevronUp, X, Edit2, Settings
} from 'lucide-react';
import { BranchKey, StaffMember, StaffShift, StaffHoliday, StaffHoursViewMode, ShiftPreset } from '../types';
import { useStaffHours } from '../hooks/useStaffHours';
import { ShiftPlannerView } from './ShiftPlannerView';

type StaffHoursTab = 'hours' | 'planner';

interface StaffHoursViewProps {
  currentBranch: BranchKey;
  operator: string;
}

const STAFF_COLORS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-rose-600',
  'bg-amber-600', 'bg-teal-600', 'bg-indigo-600', 'bg-pink-600',
  'bg-cyan-600', 'bg-orange-600', 'bg-lime-700', 'bg-fuchsia-600',
];

const HOLIDAY_TYPES: { value: StaffHoliday['type']; label: string }[] = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'other', label: 'Other' },
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatElapsed(clockIn: string): string {
  const mins = Math.floor((Date.now() - new Date(clockIn).getTime()) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function formatDateLabel(date: Date, mode: StaffHoursViewMode): string {
  if (mode === 'day') return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  if (mode === 'week') return `Week of ${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
  return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

function dayLabel(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString([], { weekday: 'short', day: 'numeric' });
}

// Helper to convert ISO string to local datetime-local value (YYYY-MM-DDTHH:mm)
function toLocalDatetimeValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function StaffHoursView({ currentBranch, operator }: StaffHoursViewProps) {
  const h = useStaffHours(currentBranch, operator);
  const [activeTab, setActiveTab] = useState<StaffHoursTab>('hours');
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [holidaysExpanded, setHolidaysExpanded] = useState(true);
  const [clockOutShiftId, setClockOutShiftId] = useState<string | null>(null);
  const [breakMinutes, setBreakMinutes] = useState('0');
  const [dragOverClockIn, setDragOverClockIn] = useState(false);
  const [editingShift, setEditingShift] = useState<StaffShift | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<StaffHoliday | null>(null);
  const [managingPresets, setManagingPresets] = useState(false);
  const [editablePresets, setEditablePresets] = useState<ShiftPreset[]>([]);
  const [reorderDragId, setReorderDragId] = useState<string | null>(null);
  const [reorderOverId, setReorderOverId] = useState<string | null>(null);
  const [selectedStaffHistory, setSelectedStaffHistory] = useState<string | null>(null);
  const [selectedStaffHolidayHistory, setSelectedStaffHolidayHistory] = useState<string | null>(null);
  const [shiftDetailsPage, setShiftDetailsPage] = useState(1);
  const SHIFT_PAGE_SIZE = 25;

  // Reset page on date range change
  useEffect(() => {
    setShiftDetailsPage(1);
  }, [h.dateRange.start, h.dateRange.end]);

  // New staff form
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newColor, setNewColor] = useState(STAFF_COLORS[0]);

  // Holiday form
  const [holStaffId, setHolStaffId] = useState('');
  const [holStart, setHolStart] = useState('');
  const [holEnd, setHolEnd] = useState('');
  const [holType, setHolType] = useState<StaffHoliday['type']>('annual');
  const [holNotes, setHolNotes] = useState('');

  // Pre-fill holiday form when editing
  useEffect(() => {
    if (editingHoliday) {
      setHolStaffId(editingHoliday.staffId);
      setHolStart(editingHoliday.startDate);
      setHolEnd(editingHoliday.endDate);
      setHolType(editingHoliday.type);
      setHolNotes(editingHoliday.notes);
    } else {
      setHolStaffId('');
      setHolStart('');
      setHolEnd('');
      setHolType('annual');
      setHolNotes('');
    }
  }, [editingHoliday]);

  // Live elapsed timer
  const [, setTick] = useState(0);
  useEffect(() => {
    if (h.activeShifts.length === 0) return;
    const iv = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(iv);
  }, [h.activeShifts.length]);

  const handleAddStaff = async () => {
    if (!newName.trim()) return;
    try {
      await h.addStaffMember(newName.trim(), newRole.trim(), newColor);
      setNewName(''); setNewRole(''); setNewColor(STAFF_COLORS[0]); setShowAddStaff(false);
    } catch (err) {
      console.error('Failed to add staff member:', err);
      alert('Failed to add staff member. Check console for details.');
    }
  };

  const handleEditStaff = async () => {
    if (!editingStaff || !editingStaff.name.trim()) return;
    try {
      await h.updateStaffMember(editingStaff);
      setEditingStaff(null);
    } catch (err) {
      console.error('Failed to update staff member:', err);
      alert('Failed to update staff member. Check console for details.');
    }
  };

  const handleClockIn = async (staffId: string) => {
    if (confirm('Clock in this staff member now?')) {
      await h.clockIn(staffId);
    }
  };

  const handleClockOut = async () => {
    if (!clockOutShiftId) return;
    await h.clockOut(clockOutShiftId, parseInt(breakMinutes) || 0);
    setClockOutShiftId(null); setBreakMinutes('0');
  };

  const handleSaveHoliday = async () => {
    if (!holStaffId || !holStart || !holEnd) return;
    if (editingHoliday) {
      await h.editHoliday({
        ...editingHoliday,
        staffId: holStaffId,
        staffName: h.staffMembers.find(s => s.id === holStaffId)?.name || editingHoliday.staffName,
        startDate: holStart,
        endDate: holEnd,
        type: holType,
        notes: holNotes,
      });
      setEditingHoliday(null);
    } else {
      await h.addHoliday(holStaffId, holStart, holEnd, holType, holNotes);
    }
    setHolStaffId(''); setHolStart(''); setHolEnd(''); setHolType('annual'); setHolNotes('');
    setShowAddHoliday(false);
  };

  // Drag and drop handlers
  const onDragStart = useCallback((e: React.DragEvent, staffId: string) => {
    e.dataTransfer.setData('staffId', staffId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverClockIn(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOverClockIn(false), []);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverClockIn(false);
    const staffId = e.dataTransfer.getData('staffId');
    if (!staffId) return;
    if (h.isViewingFuture) {
      const planned = h.planShift(staffId);
      if (planned) setEditingShift(planned);
    } else {
      await h.clockIn(staffId);
    }
  }, [h]);

  const handleReorderDrop = useCallback(async (targetId: string) => {
    if (!reorderDragId || reorderDragId === targetId) { setReorderDragId(null); setReorderOverId(null); return; }
    const list = [...h.availableStaff];
    const fromIdx = list.findIndex(s => s.id === reorderDragId);
    const toIdx = list.findIndex(s => s.id === targetId);
    if (fromIdx === -1 || toIdx === -1) { setReorderDragId(null); setReorderOverId(null); return; }
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    for (let i = 0; i < list.length; i++) {
      if (list[i].sortOrder !== i) await h.updateStaffMember({ ...list[i], sortOrder: i });
    }
    setReorderDragId(null);
    setReorderOverId(null);
  }, [reorderDragId, h]);

  const handleSaveEditShift = async () => {
    if (!editingShift) return;
    const updated = { ...editingShift };
    // Recalculate total hours if both clock in and out are set
    if (updated.clockIn && updated.clockOut) {
      const rawMins = (new Date(updated.clockOut).getTime() - new Date(updated.clockIn).getTime()) / 60000;
      const netMins = Math.max(0, rawMins - updated.breakMinutes);
      updated.totalHours = Math.round(netMins / 6) / 10;
    }
    await h.editShift(updated);
    setEditingShift(null);
  };

  const viewModes: StaffHoursViewMode[] = ['day', 'week', 'month'];

  return (
    <div className="space-y-5">
      {/* Top-level tab pills: Hours / Planner */}
      <div className="flex items-center gap-4">
        <div className="flex p-1 rounded-2xl bg-white border border-gray-200 shadow-sm">
          {(['hours', 'planner'] as StaffHoursTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
              }`}>
              {tab === 'hours' ? 'Hours' : 'Planner'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'planner' ? (
        <ShiftPlannerView h={h} currentBranch={currentBranch} operator={operator} />
      ) : (
      <>
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex p-1 rounded-2xl bg-white border border-gray-200 shadow-sm">
          {viewModes.map(m => (
            <button key={m} onClick={() => h.setViewMode(m)}
              className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                h.viewMode === m ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
              }`}>
              {m}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => h.navigateDate(-1)} className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <span className="text-sm font-bold text-gray-700 min-w-[200px] text-center">
            {formatDateLabel(h.selectedDate, h.viewMode)}
          </span>
          <button onClick={() => h.navigateDate(1)} className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={h.exportToExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-bold transition-colors">
            <Download size={14} /> Export
          </button>
          <button onClick={() => setShowAddStaff(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-lg">
            <UserPlus size={14} /> Add Staff
          </button>
        </div>
      </div>

      {/* Top section: Available / Clocked In */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Available Staff */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-4">Available Staff</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {h.availableStaff.map(s => (
              <div key={s.id} className={`relative group transition-all ${reorderOverId === s.id && reorderDragId !== s.id ? 'ring-2 ring-blue-400 ring-offset-1 rounded-xl' : ''}`}
                onDragOver={(e) => { e.preventDefault(); if (reorderDragId) setReorderOverId(s.id); }}
                onDragLeave={() => { if (reorderOverId === s.id) setReorderOverId(null); }}
                onDrop={(e) => { if (reorderDragId) { e.preventDefault(); e.stopPropagation(); handleReorderDrop(s.id); } }}>
                <button
                  draggable
                  onDragStart={(e) => { onDragStart(e, s.id); setReorderDragId(s.id); }}
                  onDragEnd={() => { setReorderDragId(null); setReorderOverId(null); }}
                  onClick={() => {
                    if (h.isViewingFuture) {
                      const planned = h.planShift(s.id);
                      if (planned) setEditingShift(planned);
                    } else {
                      handleClockIn(s.id);
                    }
                  }}
                  className={`${s.color} rounded-xl px-3 py-4 text-white text-left hover:opacity-90 active:scale-95 transition-all shadow-lg cursor-grab active:cursor-grabbing w-full ${reorderDragId === s.id ? 'opacity-40' : ''}`}>
                  <p className="font-bold text-sm truncate">{s.name}</p>
                  <p className="text-white/70 text-[10px] mt-0.5">{s.role}</p>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingStaff({ ...s }); }}
                  className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/20 text-white/80 hover:bg-black/40 hover:text-white opacity-0 group-hover:opacity-100 transition-all">
                  <Edit2 size={10} />
                </button>
              </div>
            ))}
            {h.availableStaff.length === 0 && (
              <p className="text-gray-300 text-xs col-span-full italic">No available staff</p>
            )}
          </div>
        </div>

        {/* Clocked In / Planned Shifts */}
        <div className={`bg-white border rounded-2xl p-5 shadow-sm transition-colors ${
          dragOverClockIn ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200'
        }`}
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
          <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-4">
            {h.isViewingFuture ? (
              <><Calendar size={12} className="inline mr-1.5" />Planned Shifts</>
            ) : (
              <><Clock size={12} className="inline mr-1.5" />Clocked In</>
            )}
          </h3>

          {h.isViewingFuture ? (
            /* ── Future date: show planned shifts ── */
            <div className="space-y-2">
              {h.plannedShiftsForDate.length === 0 && (
                <p className="text-gray-300 text-xs italic">No shifts planned — drag a staff card here or click to add</p>
              )}
              {h.plannedShiftsForDate.map(shift => {
                const staff = h.staffMembers.find(s => s.id === shift.staffId);
                return (
                  <div key={shift.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${staff?.color || 'bg-gray-400'}`} />
                      <div>
                        <p className="text-sm font-bold text-gray-800">{shift.staffName}</p>
                        <p className="text-[10px] text-gray-400">
                          {formatTime(shift.clockIn)} — {formatTime(shift.clockOut!)} · {shift.breakMinutes}m break
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setEditingShift({ ...shift })}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => { if (confirm('Delete this planned shift?')) h.removeShift(shift.id); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Today / past: show live clocked-in shifts ── */
            <>
              {h.activeShifts.length === 0 && h.onHolidayToday.length === 0 && (
                <p className="text-gray-300 text-xs italic">No one clocked in — drag a staff card here</p>
              )}

              <div className="space-y-2">
                {h.activeShifts.map(shift => {
                  const staff = h.staffMembers.find(s => s.id === shift.staffId);
                  return (
                    <div key={shift.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${staff?.color || 'bg-gray-400'} animate-pulse`} />
                        <div>
                          <p className="text-sm font-bold text-gray-800">{shift.staffName}</p>
                          <p className="text-[10px] text-gray-400">In: {formatTime(shift.clockIn)} ({formatElapsed(shift.clockIn)})</p>
                        </div>
                      </div>
                      <button onClick={() => { setClockOutShiftId(shift.id); setBreakMinutes('0'); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors">
                        <LogOut size={12} /> Out
                      </button>
                    </div>
                  );
                })}

                {/* On Holiday */}
                {h.onHolidayToday.map(hol => (
                  <div key={hol.id} className="flex items-center gap-3 bg-amber-100/60 border border-amber-200/50 rounded-xl px-4 py-3">
                    <Palmtree size={14} className="text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-900">{hol.staffName}</p>
                      <p className="text-[10px] text-amber-700 capitalize">{hol.type} Leave</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hours Summary Table */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-4">Hours Summary</h3>
        {h.totalsByStaff.length === 0 ? (
          <p className="text-gray-300 text-xs italic">No shifts recorded for this period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-gray-400 font-bold uppercase tracking-wider">Name</th>
                  {h.daysInRange.map(d => (
                    <th key={d} className="text-center py-2 px-2 text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">
                      {dayLabel(d)}
                    </th>
                  ))}
                  <th className="text-center py-2 pl-4 text-gray-600 font-black uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody>
                {h.totalsByStaff.map(row => (
                  <tr key={row.staffId} className="border-b border-gray-50">
                    <td 
                      className="py-2 pr-4 font-bold text-gray-800 cursor-pointer hover:text-blue-600 hover:underline underline-offset-2 transition-colors"
                      onClick={() => setSelectedStaffHistory(row.staffId)}
                    >
                      {row.staffName}
                    </td>
                    {h.daysInRange.map(d => (
                      <td key={d} className="text-center py-2 px-2 text-gray-500">
                        {row.dayHours[d] ? row.dayHours[d].toFixed(1) : '-'}
                      </td>
                    ))}
                    <td className="text-center py-2 pl-4 font-black text-gray-900">{row.totalHours.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shift Details (for non-day view or to allow editing) */}
      {h.filteredShifts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest">Shift Details</h3>
            {h.filteredShifts.length > SHIFT_PAGE_SIZE && (
              <div className="flex items-center gap-2">
                <button 
                  disabled={shiftDetailsPage === 1}
                  onClick={() => setShiftDetailsPage(p => p - 1)}
                  className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Page {shiftDetailsPage} of {Math.ceil(h.filteredShifts.length / SHIFT_PAGE_SIZE)}
                </span>
                <button 
                  disabled={shiftDetailsPage >= Math.ceil(h.filteredShifts.length / SHIFT_PAGE_SIZE)}
                  onClick={() => setShiftDetailsPage(p => p + 1)}
                  className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1">
            {h.filteredShifts
              .slice((shiftDetailsPage - 1) * SHIFT_PAGE_SIZE, shiftDetailsPage * SHIFT_PAGE_SIZE)
              .map(s => (
                <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-gray-800 w-28 truncate">{s.staffName}</span>
                    <span className="text-gray-400 w-32">{dayLabel(s.date)}, {s.date}</span>
                    <span className="text-gray-600">{formatTime(s.clockIn)} - {s.clockOut ? formatTime(s.clockOut) : 'active'}</span>
                    {s.breakMinutes > 0 && <span className="text-gray-400">({s.breakMinutes}m break)</span>}
                    {s.totalHours !== null && <span className="font-bold text-gray-700">{s.totalHours}h</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditingShift({ ...s })}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => { if (confirm('Delete this shift?')) h.removeShift(s.id); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {h.filteredShifts.length > SHIFT_PAGE_SIZE && (
            <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-gray-50">
              <button 
                disabled={shiftDetailsPage === 1}
                onClick={() => setShiftDetailsPage(p => p - 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 text-gray-600 text-xs font-bold hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {shiftDetailsPage} / {Math.ceil(h.filteredShifts.length / SHIFT_PAGE_SIZE)}
              </span>
              <button 
                disabled={shiftDetailsPage >= Math.ceil(h.filteredShifts.length / SHIFT_PAGE_SIZE)}
                onClick={() => setShiftDetailsPage(p => p + 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 text-gray-600 text-xs font-bold hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-gray-50 transition-colors"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Holidays Section */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <button onClick={() => setHolidaysExpanded(!holidaysExpanded)}
          className="w-full flex items-center justify-between p-5">
          <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest">
            <Palmtree size={12} className="inline mr-1.5" />Holidays
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); setSelectedStaffHolidayHistory('any'); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-600 text-xs font-bold hover:bg-amber-100 transition-colors">
              <Calendar size={12} /> History
            </button>
            <button onClick={(e) => { e.stopPropagation(); setShowAddHoliday(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors">
              <Plus size={12} /> Add Holiday
            </button>
            {holidaysExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </button>
        {holidaysExpanded && (
          <div className="px-5 pb-5 space-y-2">
            {h.filteredHolidays.length === 0 && (
              <p className="text-gray-300 text-xs italic">No holidays in this period</p>
            )}
            {h.filteredHolidays.map(hol => (
              <div key={hol.id} className="flex items-center justify-between bg-amber-100/60 border border-amber-200/50 rounded-xl px-4 py-3 group">
                <div className="flex items-center gap-3">
                  <Palmtree size={14} className="text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-amber-900 cursor-pointer hover:underline"
                       onClick={(e) => { e.stopPropagation(); setSelectedStaffHolidayHistory(hol.staffId); }}>
                      {hol.staffName}
                    </p>
                    <p className="text-[10px] text-amber-800">
                      <span className="capitalize">{hol.type}</span> — {hol.startDate} to {hol.endDate}
                      {hol.notes && <span className="ml-2 text-amber-600/70">({hol.notes})</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setSelectedStaffHolidayHistory(hol.staffId)}
                    className="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-200/50 opacity-0 group-hover:opacity-100 transition-all">
                    <Calendar size={12} />
                  </button>
                  <button onClick={() => { 
                    if (confirm('Are you sure you want to delete this holiday?')) {
                      if (confirm('This action cannot be undone. Confirm deletion?')) {
                        h.removeHoliday(hol.id);
                      }
                    }
                  }}
                    className="p-1.5 rounded-lg text-amber-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── MODALS ─── */}

      {/* Add Staff Modal */}
      {showAddStaff && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAddStaff(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">Add Staff Member</h3>
              <button onClick={() => setShowAddStaff(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Staff name" autoFocus />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Role</label>
                <input value={newRole} onChange={e => setNewRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Pharmacist, Assistant" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Color</label>
                <div className="flex flex-wrap gap-2">
                  {STAFF_COLORS.map(c => (
                    <button type="button" key={c} onClick={() => setNewColor(c)}
                      className={`w-8 h-8 rounded-lg ${c} transition-all ${newColor === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'opacity-70 hover:opacity-100'}`} />
                  ))}
                </div>
              </div>
              <button type="button" onClick={handleAddStaff}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg">
                Add Staff Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditingStaff(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">Edit Staff Member</h3>
              <button onClick={() => setEditingStaff(null)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Name</label>
                <input value={editingStaff.name} onChange={e => setEditingStaff({ ...editingStaff, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Role</label>
                <input value={editingStaff.role} onChange={e => setEditingStaff({ ...editingStaff, role: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Pharmacist, Assistant" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Color</label>
                <div className="flex flex-wrap gap-2">
                  {STAFF_COLORS.map(c => (
                    <button type="button" key={c} onClick={() => setEditingStaff({ ...editingStaff, color: c })}
                      className={`w-8 h-8 rounded-lg ${c} transition-all ${editingStaff.color === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'opacity-70 hover:opacity-100'}`} />
                  ))}
                </div>
              </div>
              <button type="button" onClick={handleEditStaff}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clock Out Modal */}
      {clockOutShiftId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setClockOutShiftId(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">Clock Out</h3>
              <button onClick={() => setClockOutShiftId(null)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Break Minutes</label>
                <input type="number" value={breakMinutes} onChange={e => setBreakMinutes(e.target.value)} min="0"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
              </div>
              <button onClick={handleClockOut}
                className="w-full py-3 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors shadow-lg">
                Confirm Clock Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Holiday Modal */}
      {(showAddHoliday || editingHoliday) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]" onClick={() => { setShowAddHoliday(false); setEditingHoliday(null); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">
                {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
              </h3>
              <button onClick={() => { setShowAddHoliday(false); setEditingHoliday(null); }} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Staff Member</label>
                <select value={holStaffId} onChange={e => setHolStaffId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select staff...</option>
                  {h.staffMembers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Start Date</label>
                  <input type="date" value={holStart} onChange={e => setHolStart(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">End Date</label>
                  <input type="date" value={holEnd} onChange={e => setHolEnd(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Type</label>
                <select value={holType} onChange={e => setHolType(e.target.value as StaffHoliday['type'])}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {HOLIDAY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Notes</label>
                <input value={holNotes} onChange={e => setHolNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional notes" />
              </div>
              <button onClick={handleSaveHoliday}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg">
                {editingHoliday ? 'Save Changes' : 'Add Holiday'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Shift Modal */}
      {editingShift && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]" onClick={() => setEditingShift(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">Edit Shift — {editingShift.staffName}</h3>
              <button onClick={() => setEditingShift(null)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Date</label>
                <input type="date" value={editingShift.date}
                  onChange={e => setEditingShift({ ...editingShift, date: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Quick Presets</label>
                  <button type="button" onClick={() => { setEditablePresets([...h.shiftPresets]); setManagingPresets(true); }}
                    className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                    <Settings size={12} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {h.shiftPresets.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => setEditingShift({
                        ...editingShift,
                        clockIn: new Date(`${editingShift.date}T${p.inTime}:00`).toISOString(),
                        clockOut: new Date(`${editingShift.date}T${p.outTime}:00`).toISOString(),
                        breakMinutes: p.breakMinutes,
                      })}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                        p.color ? `${p.color} text-white hover:opacity-80` : 'bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Clock In</label>
                  <input type="datetime-local" value={toLocalDatetimeValue(editingShift.clockIn)}
                    onChange={e => setEditingShift({ ...editingShift, clockIn: new Date(e.target.value).toISOString() })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Clock Out</label>
                  <input type="datetime-local" value={toLocalDatetimeValue(editingShift.clockOut)}
                    onChange={e => setEditingShift({ ...editingShift, clockOut: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Break Minutes</label>
                <input type="number" value={editingShift.breakMinutes} min="0"
                  onChange={e => setEditingShift({ ...editingShift, breakMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Note</label>
                <input value={editingShift.note}
                  onChange={e => setEditingShift({ ...editingShift, note: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional note" />
              </div>
              <button onClick={handleSaveEditShift}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Manage Shift Presets Modal */}
      {managingPresets && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]" onClick={() => setManagingPresets(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">Manage Shift Presets</h3>
              <button onClick={() => setManagingPresets(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {editablePresets.map((preset, idx) => (
                <div key={preset.id} className="border border-gray-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input value={preset.label} placeholder="Label"
                      onChange={e => { const copy = [...editablePresets]; copy[idx] = { ...copy[idx], label: e.target.value }; setEditablePresets(copy); }}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="button" onClick={() => {
                      if (confirm(`Delete "${preset.label}" preset?`)) {
                        setEditablePresets(editablePresets.filter((_, i) => i !== idx));
                      }
                    }} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-gray-400 mb-0.5">In</label>
                      <input type="time" value={preset.inTime}
                        onChange={e => { const copy = [...editablePresets]; copy[idx] = { ...copy[idx], inTime: e.target.value }; setEditablePresets(copy); }}
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-gray-400 mb-0.5">Out</label>
                      <input type="time" value={preset.outTime}
                        onChange={e => { const copy = [...editablePresets]; copy[idx] = { ...copy[idx], outTime: e.target.value }; setEditablePresets(copy); }}
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-gray-400 mb-0.5">Break (min)</label>
                      <input type="number" value={preset.breakMinutes} min="0"
                        onChange={e => { const copy = [...editablePresets]; copy[idx] = { ...copy[idx], breakMinutes: parseInt(e.target.value) || 0 }; setEditablePresets(copy); }}
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-gray-400 mb-1">Color</label>
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" onClick={() => { const copy = [...editablePresets]; const p = { ...copy[idx] }; delete p.color; copy[idx] = p; setEditablePresets(copy); }}
                        className={`w-6 h-6 rounded-md bg-slate-100 border-2 transition-all ${!preset.color ? 'border-blue-500 scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`}
                        data-tooltip="No color" />
                      {STAFF_COLORS.map(c => (
                        <button type="button" key={c} onClick={() => { const copy = [...editablePresets]; copy[idx] = { ...copy[idx], color: c }; setEditablePresets(copy); }}
                          className={`w-6 h-6 rounded-md ${c} transition-all ${preset.color === c ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : 'opacity-70 hover:opacity-100'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => {
              setEditablePresets([...editablePresets, {
                id: crypto.randomUUID(), branch: currentBranch, label: '', inTime: '09:00', outTime: '17:00',
                breakMinutes: 0, sortOrder: editablePresets.length,
              }]);
            }} className="mt-3 w-full py-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 text-xs font-bold hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-1">
              <Plus size={14} /> Add Preset
            </button>
            <button onClick={async () => {
              // Delete removed presets
              const editableIds = new Set(editablePresets.map(p => p.id));
              for (const existing of h.shiftPresets) {
                if (!editableIds.has(existing.id)) await h.removeShiftPreset(existing.id);
              }
              // Save all current presets
              for (let i = 0; i < editablePresets.length; i++) {
                await h.updateShiftPreset({ ...editablePresets[i], sortOrder: i, branch: currentBranch });
              }
              setManagingPresets(false);
            }} className="mt-3 w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg">
              Save Presets
            </button>
          </div>
        </div>
      )}
      {/* Historic Hours Modal */}
      {selectedStaffHistory && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelectedStaffHistory(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">
                Historic Hours — {h.staffMembers.find(s => s.id === selectedStaffHistory)?.name || 'Unknown'}
              </h3>
              <button onClick={() => setSelectedStaffHistory(null)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-white shadow-sm">
                  <tr className="border-b border-gray-100">
                    <th className="py-2 pr-4 text-gray-400 font-bold uppercase tracking-wider">Date</th>
                    <th className="py-2 px-4 text-gray-400 font-bold uppercase tracking-wider">In</th>
                    <th className="py-2 px-4 text-gray-400 font-bold uppercase tracking-wider">Out</th>
                    <th className="py-2 px-4 text-gray-400 font-bold uppercase tracking-wider">Break</th>
                    <th className="py-2 px-4 text-gray-400 font-bold uppercase tracking-wider text-right">Total</th>
                    <th className="py-2 pl-4 text-gray-400 font-bold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {h.shifts
                    .filter(s => s.staffId === selectedStaffHistory && s.date <= h.todayStr)
                    .sort((a, b) => b.clockIn.localeCompare(a.clockIn))
                    .map(s => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-2 pr-4 text-gray-800">{dayLabel(s.date)}, {s.date}</td>
                        <td className="py-2 px-4 text-gray-600">{formatTime(s.clockIn)}</td>
                        <td className="py-2 px-4 text-gray-600">{s.clockOut ? formatTime(s.clockOut) : <span className="text-blue-500 font-bold animate-pulse">Active</span>}</td>
                        <td className="py-2 px-4 text-gray-500">{s.breakMinutes}m</td>
                        <td className="py-2 px-4 font-black text-gray-900 text-right">{s.totalHours !== null ? `${s.totalHours}h` : '-'}</td>
                        <td className="py-2 pl-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setEditingShift({ ...s })}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                              <Edit2 size={12} />
                            </button>
                            <button onClick={() => { if (confirm('Delete this shift?')) h.removeShift(s.id); }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {h.shifts.filter(s => s.staffId === selectedStaffHistory).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 italic">No historic hours found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Staff Holiday History Modal */}
      {selectedStaffHolidayHistory && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelectedStaffHolidayHistory(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">
                  Staff Holiday History
                </h3>
                {selectedStaffHolidayHistory !== 'any' && (
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">
                    Showing for: {h.staffMembers.find(s => s.id === selectedStaffHolidayHistory)?.name}
                  </p>
                )}
              </div>
              <button onClick={() => setSelectedStaffHolidayHistory(null)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Select Staff Member</label>
                <select 
                  value={selectedStaffHolidayHistory} 
                  onChange={e => setSelectedStaffHolidayHistory(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="any">All Staff Members</option>
                  {h.staffMembers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="pt-5">
                <button 
                  onClick={() => {
                    if (selectedStaffHolidayHistory !== 'any') {
                      setHolStaffId(selectedStaffHolidayHistory);
                    }
                    setShowAddHoliday(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-lg"
                >
                  <Plus size={14} /> Plan Holiday
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr className="border-b border-gray-100">
                    <th className="py-2 pr-4 text-gray-400 font-bold uppercase tracking-wider">Staff</th>
                    <th className="py-2 px-4 text-gray-400 font-bold uppercase tracking-wider">Period</th>
                    <th className="py-2 px-4 text-gray-400 font-bold uppercase tracking-wider">Type</th>
                    <th className="py-2 px-4 text-gray-400 font-bold uppercase tracking-wider">Notes</th>
                    <th className="py-2 pl-4 text-gray-400 font-bold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {h.holidays
                    .filter(hol => selectedStaffHolidayHistory === 'any' || hol.staffId === selectedStaffHolidayHistory)
                    .sort((a, b) => b.startDate.localeCompare(a.startDate))
                    .map(hol => {
                      const isFuture = hol.startDate > h.todayStr;
                      const isPast = hol.endDate < h.todayStr;
                      const isCurrent = !isFuture && !isPast;

                      return (
                        <tr key={hol.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${isCurrent ? 'bg-amber-50/50' : ''}`}>
                          <td className="py-3 pr-4 font-bold text-gray-800">{hol.staffName}</td>
                          <td className="py-3 px-4 text-gray-600">
                            {hol.startDate} to {hol.endDate}
                            {isFuture && <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-black uppercase">Upcoming</span>}
                            {isCurrent && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-black uppercase">Active</span>}
                          </td>
                          <td className="py-3 px-4">
                            <span className="capitalize text-gray-500">{hol.type}</span>
                          </td>
                          <td className="py-3 px-4 text-gray-400 italic">
                            {hol.notes || '-'}
                          </td>
                          <td className="py-3 pl-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setEditingHoliday({ ...hol })}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => { 
                                if (confirm('Are you sure you want to delete this holiday?')) {
                                  if (confirm('This action cannot be undone. Confirm deletion?')) {
                                    h.removeHoliday(hol.id);
                                  }
                                }
                              }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {h.holidays.filter(hol => selectedStaffHolidayHistory === 'any' || hol.staffId === selectedStaffHolidayHistory).length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400 italic">
                        No holiday records found for this selection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
