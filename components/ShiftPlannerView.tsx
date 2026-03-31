import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Copy, Wand2, Settings, Plus, X, Edit2, Trash2, Calendar, LayoutGrid } from 'lucide-react';
import { BranchKey, StaffShift, ShiftPreset, StoreHoursConfig } from '../types';
import { useStaffHours } from '../hooks/useStaffHours';
import { isBankHoliday } from '../utils/bankHolidays';

function toYmd(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type StaffHoursReturn = ReturnType<typeof useStaffHours>;

interface ApplyDefaultsStaffEntry {
  selected: boolean;
  presetId: string;
  useCustom: boolean;
  customIn: string;
  customOut: string;
  breakMinutes: number;
}

interface ShiftPlannerViewProps {
  h: StaffHoursReturn;
  currentBranch: BranchKey;
  operator: string;
}

function formatWeekLabel(startStr: string): string {
  const d = new Date(startStr + 'T00:00:00');
  return `Week of ${d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

function formatDayHeader(dateStr: string): { dayName: string; datePart: string } {
  const d = new Date(dateStr + 'T00:00:00');
  return {
    dayName: d.toLocaleDateString([], { weekday: 'short' }),
    datePart: d.toLocaleDateString([], { day: 'numeric', month: 'short' }),
  };
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

function formatShiftTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    return iso.includes('T') ? iso.split('T')[1].slice(0, 5) : iso;
  }
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function ShiftPlannerView({ h, currentBranch, operator }: ShiftPlannerViewProps) {
  const [showStoreHours, setShowStoreHours] = useState(false);
  const [addingToDate, setAddingToDate] = useState<string | null>(null);
  const [addSelectedStaff, setAddSelectedStaff] = useState<Set<string>>(new Set());
  const [addSelectedPreset, setAddSelectedPreset] = useState<string>('');
  const [editingShift, setEditingShift] = useState<StaffShift | null>(null);
  const [showApplyDefaultsDialog, setShowApplyDefaultsDialog] = useState(false);
  const [applyDefaultsStaff, setApplyDefaultsStaff] = useState<Map<string, ApplyDefaultsStaffEntry>>(new Map());
  const [applyDefaultsDays, setApplyDefaultsDays] = useState<Set<string>>(new Set());
  const [selectedMonthDay, setSelectedMonthDay] = useState<string | null>(null);

  // Store hours config editing state
  const [editConfig, setEditConfig] = useState<StoreHoursConfig | null>(null);

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayStr = toYmd(new Date());

  const defaultConfig = useMemo((): StoreHoursConfig => {
    if (h.storeHoursConfig) return h.storeHoursConfig;
    const firstPresetId = h.shiftPresets[0]?.id || '';
    const days: StoreHoursConfig['days'] = {};
    const allStaffIds = h.activeStaff.map(s => s.id);
    for (let i = 0; i < 7; i++) {
      days[String(i)] = { closed: i === 0, presetId: firstPresetId, staffIds: allStaffIds };
    }
    return { id: 'default', branch: currentBranch, days };
  }, [h.storeHoursConfig, h.shiftPresets, currentBranch, h.activeStaff]);

  const openAddPopover = (dateStr: string) => {
    setAddingToDate(dateStr);
    setAddSelectedStaff(new Set());
    setAddSelectedPreset(h.shiftPresets[0]?.id || '');
  };

  const handleAddShifts = async () => {
    if (!addingToDate || addSelectedStaff.size === 0) return;
    const preset = h.shiftPresets.find(p => p.id === addSelectedPreset);
    if (!preset) return;
    for (const staffId of addSelectedStaff) {
      const shift = h.createShiftFromPreset(staffId, addingToDate, preset);
      await h.editShift(shift);
    }
    setAddingToDate(null);
  };

  const handleSaveEditShift = async () => {
    if (!editingShift) return;
    if (editingShift.clockIn && editingShift.clockOut) {
      const rawMins = (new Date(editingShift.clockOut).getTime() - new Date(editingShift.clockIn).getTime()) / 60000;
      const netMins = Math.max(0, rawMins - editingShift.breakMinutes);
      editingShift.totalHours = Math.round(netMins / 6) / 10;
    }
    await h.editShift(editingShift);
    setEditingShift(null);
  };

  const openStoreHoursModal = () => {
    const cfg = { ...defaultConfig, days: { ...defaultConfig.days } };
    // Ensure all days have staffIds
    for (const key of Object.keys(cfg.days)) {
      cfg.days[key] = {
        ...cfg.days[key],
        staffIds: cfg.days[key].staffIds || h.activeStaff.map(s => s.id),
      };
    }
    setEditConfig(cfg);
    setShowStoreHours(true);
  };

  const handleSaveStoreHours = async () => {
    if (!editConfig) return;
    await h.saveStoreHoursConfig(editConfig);
    setShowStoreHours(false);
  };

  // ── Apply Defaults Dialog ──
  const openApplyDefaultsDialog = () => {
    const config = defaultConfig;
    // Staff map
    const map = new Map<string, { selected: boolean; presetId: string; useCustom: boolean; customIn: string; customOut: string; breakMinutes: number }>();
    const allConfiguredStaffIds = new Set<string>();
    for (const key of Object.keys(config.days)) {
      const dayConf = config.days[key];
      if (!dayConf.closed) {
        (dayConf.staffIds || []).forEach(id => allConfiguredStaffIds.add(id));
      }
    }
    const daysEntries = Object.entries(config.days) as [string, StoreHoursConfig['days'][string]][];
    const firstOpenDay = daysEntries.find(([, d]) => !d.closed);
    const defaultPresetId = firstOpenDay?.[1]?.presetId || h.shiftPresets[0]?.id || '';
    for (const staff of h.activeStaff) {
      map.set(staff.id, {
        selected: allConfiguredStaffIds.has(staff.id),
        presetId: defaultPresetId,
        useCustom: false,
        customIn: '09:00',
        customOut: '18:30',
        breakMinutes: 60,
      });
    }
    setApplyDefaultsStaff(map);
    // Days: default all open days selected
    const openDays = new Set(h.plannerDays.filter(d => !h.isDayClosed(d)));
    setApplyDefaultsDays(openDays);
    setShowApplyDefaultsDialog(true);
  };

  const handleConfirmApplyDefaults = async () => {
    const staffConfigs: { staffId: string; presetId?: string; customIn?: string; customOut?: string; breakMinutes?: number }[] = [];
    applyDefaultsStaff.forEach((val, staffId) => {
      if (val.selected) {
        if (val.useCustom) {
          staffConfigs.push({ staffId, customIn: val.customIn, customOut: val.customOut, breakMinutes: val.breakMinutes });
        } else {
          staffConfigs.push({ staffId, presetId: val.presetId });
        }
      }
    });
    if (staffConfigs.length === 0) return;
    const selectedDays = [...applyDefaultsDays];
    setShowApplyDefaultsDialog(false);
    await h.applyDefaults(staffConfigs, selectedDays.length > 0 ? selectedDays : undefined);
  };

  const openDaysInRange = useMemo(() => {
    return h.plannerDays.filter(d => !h.isDayClosed(d));
  }, [h.plannerDays, h.isDayClosed]);

  // ── Month Calendar helpers ──
  const monthCalendarCells = useMemo(() => {
    if (h.plannerViewMode !== 'month') return [];
    const rangeStart = new Date(h.plannerRange.start + 'T00:00:00');
    const year = rangeStart.getFullYear();
    const month = rangeStart.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastOfMonth.getDate();

    // Monday=0 based start-of-week offset
    let startDow = firstOfMonth.getDay(); // 0=Sun
    startDow = startDow === 0 ? 6 : startDow - 1; // Convert to Mon=0

    const cells: { dateStr: string; inMonth: boolean }[] = [];

    // Leading days from previous month
    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push({ dateStr: toYmd(d), inMonth: false });
    }

    // Days in month
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      cells.push({ dateStr: toYmd(d), inMonth: true });
    }

    // Trailing days to fill to complete weeks (multiple of 7)
    while (cells.length % 7 !== 0) {
      const lastDate = new Date(cells[cells.length - 1].dateStr + 'T00:00:00');
      lastDate.setDate(lastDate.getDate() + 1);
      cells.push({ dateStr: toYmd(lastDate), inMonth: false });
    }

    return cells;
  }, [h.plannerViewMode, h.plannerRange]);

  const navigationLabel = useMemo(() => {
    if (h.plannerViewMode === 'week') {
      return formatWeekLabel(h.plannerRange.start);
    }
    return formatMonthLabel(h.plannerDate);
  }, [h.plannerViewMode, h.plannerRange, h.plannerDate]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => h.navigatePlanner(-1)} className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronLeft size={16} className="text-gray-600" />
          </button>
          <span className="text-sm font-bold text-gray-700 min-w-[200px] text-center">
            {navigationLabel}
          </span>
          <button onClick={() => h.navigatePlanner(1)} className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronRight size={16} className="text-gray-600" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Week/Month toggle */}
          <div className="flex bg-white border border-gray-200 shadow-sm p-1 rounded-2xl">
            <button onClick={() => h.setPlannerViewMode('week')}
              className={`flex items-center gap-1 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors ${
                h.plannerViewMode === 'week' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
              }`}>
              <LayoutGrid size={12} /> Week
            </button>
            <button onClick={() => h.setPlannerViewMode('month')}
              className={`flex items-center gap-1 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-colors ${
                h.plannerViewMode === 'month' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'
              }`}>
              <Calendar size={12} /> Month
            </button>
          </div>

          <button onClick={() => h.copyPrevious()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors shadow-lg">
            <Copy size={14} /> Copy Previous {h.plannerViewMode === 'week' ? 'Week' : 'Month'}
          </button>
          <button onClick={openStoreHoursModal}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* ── Weekly Grid ── */}
      {h.plannerViewMode === 'week' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 divide-x divide-gray-200">
            {h.plannerDays.map(dateStr => {
              const { dayName, datePart } = formatDayHeader(dateStr);
              const bankHol = isBankHoliday(dateStr);
              const closed = h.isDayClosed(dateStr);
              const dayShifts = h.shiftsForRange[dateStr] || [];
              const hasOverride = h.dayOverrides.some(o => o.date === dateStr);

              return (
                <div key={dateStr} className={`min-h-[280px] flex flex-col ${closed ? 'bg-gray-100' : 'bg-white'}`}>
                  {/* Day header */}
                  <div className={`px-2 py-2 border-b border-gray-200 text-center ${closed ? 'bg-gray-200' : 'bg-gray-50'}`}>
                    <div className="text-[11px] font-black uppercase tracking-widest text-gray-500">{dayName}</div>
                    <div className="text-xs text-gray-400">{datePart}</div>
                    {bankHol.isHoliday && (
                      <div className="mt-1 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[9px] font-bold truncate">
                        {bankHol.name}
                      </div>
                    )}
                  </div>

                  {/* Day body */}
                  <div className="flex-1 p-1.5 space-y-1">
                    {closed ? (
                      <div className="flex flex-col items-center justify-center h-full gap-2">
                        <span className="text-gray-400 text-xs font-bold uppercase">Closed</span>
                        <button onClick={() => h.toggleDayOverride(dateStr)}
                          className="px-2 py-1 rounded-lg bg-white border border-gray-300 text-[10px] font-bold text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors">
                          Override — Open
                        </button>
                      </div>
                    ) : (
                      <>
                        {hasOverride && (
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                              Overridden Open
                            </span>
                            <button onClick={() => h.toggleDayOverride(dateStr)}
                              className="text-[9px] text-gray-400 hover:text-red-500 transition-colors"
                              data-tooltip="Revert to closed">
                              <X size={10} />
                            </button>
                          </div>
                        )}

                        {dayShifts.map((shift, idx) => {
                          const staff = h.staffMembers.find(s => s.id === shift.staffId);
                          return (
                            <div key={shift.id} className="group bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-100 hover:border-blue-200 transition-colors">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${staff?.color || 'bg-gray-400'}`} />
                                <span className="text-[11px] font-bold text-gray-700 truncate flex-1">{shift.staffName}</span>
                              </div>
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="text-[10px] text-gray-400">
                                  {formatShiftTime(shift.clockIn)}-{shift.clockOut ? formatShiftTime(shift.clockOut) : '?'}
                                </span>
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {idx > 0 && (
                                    <button onClick={() => h.reorderShift(shift.id, -1)}
                                      className="p-0.5 rounded text-gray-400 hover:text-blue-600 transition-colors">
                                      <ChevronUp size={10} />
                                    </button>
                                  )}
                                  {idx < dayShifts.length - 1 && (
                                    <button onClick={() => h.reorderShift(shift.id, 1)}
                                      className="p-0.5 rounded text-gray-400 hover:text-blue-600 transition-colors">
                                      <ChevronDown size={10} />
                                    </button>
                                  )}
                                  <button onClick={() => setEditingShift({ ...shift })}
                                    className="p-0.5 rounded text-gray-400 hover:text-blue-600 transition-colors">
                                    <Edit2 size={10} />
                                  </button>
                                  <button onClick={() => { if (confirm('Remove this shift?')) h.removeShift(shift.id); }}
                                    className="p-0.5 rounded text-gray-400 hover:text-red-600 transition-colors">
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        <button onClick={() => openAddPopover(dateStr)}
                          className="w-full mt-1 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-400 text-[10px] font-bold hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-1">
                          <Plus size={10} /> Add
                        </button>
                        <button onClick={() => h.copyPreviousDayShifts(dateStr)}
                          className="w-full mt-1 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-400 text-[10px] font-bold hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-1">
                          <Copy size={10} /> Copy prev week
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Monthly Calendar Grid ── */}
      {h.plannerViewMode === 'month' && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="px-2 py-2 text-center text-[11px] font-black uppercase tracking-widest text-gray-500">
                {d}
              </div>
            ))}
          </div>
          {/* Calendar cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
            {monthCalendarCells.map(({ dateStr, inMonth }) => {
              const bankHol = isBankHoliday(dateStr);
              const closed = inMonth ? h.isDayClosed(dateStr) : false;
              const dayShifts = inMonth ? (h.shiftsForRange[dateStr] || []) : [];
              const isToday = dateStr === todayStr;
              const dayNum = new Date(dateStr + 'T00:00:00').getDate();
              const isSelected = selectedMonthDay === dateStr;

              return (
                <div
                  key={dateStr}
                  onClick={() => inMonth && setSelectedMonthDay(isSelected ? null : dateStr)}
                  className={`min-h-[90px] p-1.5 cursor-pointer transition-colors ${
                    !inMonth ? 'bg-gray-50/50' :
                    closed ? 'bg-gray-100' :
                    isSelected ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' :
                    'bg-white hover:bg-gray-50'
                  }`}
                >
                  {/* Date number */}
                  <div className="flex items-center justify-between">
                    <span className={`text-sm leading-none ${
                      !inMonth ? 'text-gray-300' :
                      isToday ? 'font-black text-blue-600' :
                      'font-bold text-gray-700'
                    }`}>
                      {dayNum}
                    </span>
                    {inMonth && !closed && (
                      <button onClick={(e) => { e.stopPropagation(); openAddPopover(dateStr); }}
                        className="p-0.5 rounded text-gray-300 hover:text-blue-500 transition-colors">
                        <Plus size={12} />
                      </button>
                    )}
                  </div>

                  {inMonth && (
                    <>
                      {bankHol.isHoliday && (
                        <div className="mt-0.5 px-1 py-0.5 rounded bg-amber-100 text-amber-700 text-[8px] font-bold truncate">
                          {bankHol.name}
                        </div>
                      )}
                      {closed ? (
                        <div className="mt-1 flex flex-col items-center gap-1">
                          <span className="text-[9px] text-gray-400 font-bold uppercase">Closed</span>
                          <button onClick={(e) => { e.stopPropagation(); h.toggleDayOverride(dateStr); }}
                            className="text-[8px] text-gray-400 hover:text-blue-500 underline transition-colors">
                            Override
                          </button>
                        </div>
                      ) : (
                        <>
                          {dayShifts.length > 0 && (
                            <div className="mt-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-bold">
                              {dayShifts.length} shift{dayShifts.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Month Day Detail Panel ── */}
      {h.plannerViewMode === 'month' && selectedMonthDay && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">
              {new Date(selectedMonthDay + 'T00:00:00').toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <div className="flex items-center gap-2">
              {h.isDayClosed(selectedMonthDay) && (
                <button onClick={() => h.toggleDayOverride(selectedMonthDay)}
                  className="px-2 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-600 hover:bg-blue-100 transition-colors">
                  Override — Open
                </button>
              )}
              {!h.isDayClosed(selectedMonthDay) && h.dayOverrides.some(o => o.date === selectedMonthDay) && (
                <button onClick={() => h.toggleDayOverride(selectedMonthDay)}
                  className="px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-[10px] font-bold text-red-600 hover:bg-red-100 transition-colors">
                  Remove Override
                </button>
              )}
              <button onClick={() => setSelectedMonthDay(null)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {(() => {
            const bankHol = isBankHoliday(selectedMonthDay);
            if (bankHol.isHoliday) {
              return (
                <div className="mb-3 px-2 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
                  Bank Holiday: {bankHol.name}
                </div>
              );
            }
            return null;
          })()}

          {h.isDayClosed(selectedMonthDay) ? (
            <p className="text-gray-400 text-sm text-center py-4 font-bold">Closed</p>
          ) : (
            <div className="space-y-1.5">
              {(() => {
                const monthDayShifts = h.shiftsForRange[selectedMonthDay] || [];
                return monthDayShifts.map((shift, idx) => {
                  const staff = h.staffMembers.find(s => s.id === shift.staffId);
                  return (
                    <div key={shift.id} className="group flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 hover:border-blue-200 transition-colors">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${staff?.color || 'bg-gray-400'}`} />
                      <span className="text-xs font-bold text-gray-700 flex-1">{shift.staffName}</span>
                      <span className="text-[11px] text-gray-400">
                        {formatShiftTime(shift.clockIn)}-{shift.clockOut ? formatShiftTime(shift.clockOut) : '?'}
                      </span>
                      {shift.totalHours !== null && (
                        <span className="text-[10px] text-gray-300">{shift.totalHours}h</span>
                      )}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {idx > 0 && (
                          <button onClick={() => h.reorderShift(shift.id, -1)}
                            className="p-1 rounded text-gray-400 hover:text-blue-600 transition-colors">
                            <ChevronUp size={12} />
                          </button>
                        )}
                        {idx < monthDayShifts.length - 1 && (
                          <button onClick={() => h.reorderShift(shift.id, 1)}
                            className="p-1 rounded text-gray-400 hover:text-blue-600 transition-colors">
                            <ChevronDown size={12} />
                          </button>
                        )}
                        <button onClick={() => setEditingShift({ ...shift })}
                          className="p-1 rounded text-gray-400 hover:text-blue-600 transition-colors">
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => { if (confirm('Remove this shift?')) h.removeShift(shift.id); }}
                          className="p-1 rounded text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}

              {(h.shiftsForRange[selectedMonthDay] || []).length === 0 && (
                <p className="text-gray-300 text-xs text-center py-3">No shifts scheduled</p>
              )}

              <button onClick={() => openAddPopover(selectedMonthDay)}
                className="w-full py-2 rounded-lg border border-dashed border-gray-300 text-gray-400 text-xs font-bold hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-1">
                <Plus size={12} /> Add Shift
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Add Shift Modal ── */}
      {addingToDate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setAddingToDate(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">
                Add Shift — {new Date(addingToDate + 'T00:00:00').toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
              </h3>
              <button onClick={() => setAddingToDate(null)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Staff</label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {h.activeStaff.map(s => {
                    const alreadyHasShift = (h.shiftsForRange[addingToDate] || []).some(sh => sh.staffId === s.id);
                    const onHoliday = h.isStaffOnHoliday(s.id, addingToDate);
                    
                    if (onHoliday) return null;

                    return (
                      <label key={s.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        alreadyHasShift ? 'opacity-40 pointer-events-none bg-gray-50' : addSelectedStaff.has(s.id) ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                      }`}>
                        <input type="checkbox" checked={addSelectedStaff.has(s.id)} disabled={alreadyHasShift}
                          onChange={() => {
                            const next = new Set(addSelectedStaff);
                            next.has(s.id) ? next.delete(s.id) : next.add(s.id);
                            setAddSelectedStaff(next);
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500" />
                        <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                        <span className="text-xs font-bold text-gray-700">{s.name}</span>
                        {alreadyHasShift && <span className="text-[9px] text-gray-400 ml-auto">Already assigned</span>}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Preset</label>
                <div className="flex flex-wrap gap-1.5">
                  {h.shiftPresets.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => setAddSelectedPreset(p.id)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                        addSelectedPreset === p.id
                          ? 'bg-blue-600 text-white'
                          : p.color ? `${p.color} text-white hover:opacity-80` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {p.label} ({p.inTime}-{p.outTime})
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleAddShifts} disabled={addSelectedStaff.size === 0}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">
                Add {addSelectedStaff.size} Shift{addSelectedStaff.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Shift Modal ── */}
      {editingShift && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditingShift(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">Edit Shift — {editingShift.staffName}</h3>
              <button onClick={() => setEditingShift(null)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Quick Presets</label>
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
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Clock Out</label>
                  <input type="datetime-local" value={toLocalDatetimeValue(editingShift.clockOut)}
                    onChange={e => setEditingShift({ ...editingShift, clockOut: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Break Minutes</label>
                <input type="number" value={editingShift.breakMinutes} min="0"
                  onChange={e => setEditingShift({ ...editingShift, breakMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Note</label>
                <input value={editingShift.note}
                  onChange={e => setEditingShift({ ...editingShift, note: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional note" />
              </div>
              <button onClick={handleSaveEditShift}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Store Hours Config Modal ── */}
      {showStoreHours && editConfig && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowStoreHours(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">Store Hours Defaults</h3>
              <button onClick={() => setShowStoreHours(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6, 0].map(dayIdx => {
                const key = String(dayIdx);
                const dayConf = editConfig.days[key] || { closed: dayIdx === 0, presetId: h.shiftPresets[0]?.id || '', staffIds: h.activeStaff.map(s => s.id) };
                const staffIds = dayConf.staffIds || h.activeStaff.map(s => s.id);
                return (
                  <div key={dayIdx} className="bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-700 w-12">{DAY_NAMES[dayIdx]}</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={!dayConf.closed}
                          onChange={() => {
                            const newDays = { ...editConfig.days };
                            newDays[key] = { ...dayConf, closed: !dayConf.closed, staffIds };
                            setEditConfig({ ...editConfig, days: newDays });
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-xs text-gray-500">{dayConf.closed ? 'Closed' : 'Open'}</span>
                      </label>
                      {!dayConf.closed && (
                        <select value={dayConf.presetId}
                          onChange={e => {
                            const newDays = { ...editConfig.days };
                            newDays[key] = { ...dayConf, presetId: e.target.value, staffIds };
                            setEditConfig({ ...editConfig, days: newDays });
                          }}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                          {h.shiftPresets.map(p => (
                            <option key={p.id} value={p.id}>{p.label} ({p.inTime}-{p.outTime})</option>
                          ))}
                        </select>
                      )}
                    </div>
                    {/* Staff checklist for open days */}
                    {!dayConf.closed && (
                      <div className="mt-2 pl-12">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Staff</span>
                          <button onClick={() => {
                            const newDays = { ...editConfig.days };
                            newDays[key] = { ...dayConf, staffIds: h.activeStaff.map(s => s.id) };
                            setEditConfig({ ...editConfig, days: newDays });
                          }} className="text-[9px] text-blue-500 hover:text-blue-700 font-bold">Select All</button>
                          <button onClick={() => {
                            const newDays = { ...editConfig.days };
                            newDays[key] = { ...dayConf, staffIds: [] };
                            setEditConfig({ ...editConfig, days: newDays });
                          }} className="text-[9px] text-gray-400 hover:text-gray-600 font-bold">Deselect All</button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {h.activeStaff.map(s => {
                            const isSelected = staffIds.includes(s.id);
                            return (
                              <label key={s.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer text-[10px] font-bold transition-colors ${
                                isSelected ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-400 border border-transparent'
                              }`}>
                                <input type="checkbox" checked={isSelected}
                                  onChange={() => {
                                    const newStaffIds = isSelected
                                      ? staffIds.filter(id => id !== s.id)
                                      : [...staffIds, s.id];
                                    const newDays = { ...editConfig.days };
                                    newDays[key] = { ...dayConf, staffIds: newStaffIds };
                                    setEditConfig({ ...editConfig, days: newDays });
                                  }}
                                  className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3" />
                                <div className={`w-2 h-2 rounded-full ${s.color}`} />
                                {s.name}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={openApplyDefaultsDialog}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-blue-50 text-blue-600 font-bold text-sm hover:bg-blue-100 transition-colors">
                <Wand2 size={16} /> Apply Defaults
              </button>
              <button onClick={handleSaveStoreHours}
                className="flex-[2] py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg">
                Save Store Hours
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Apply Defaults Confirmation Dialog ── */}
      {showApplyDefaultsDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowApplyDefaultsDialog(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-sm uppercase tracking-widest text-gray-900">Apply Default Shifts</h3>
              <button onClick={() => setShowApplyDefaultsDialog(false)} className="p-1 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* ── Left: Days selection ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Days to apply</label>
                  <div className="flex gap-2">
                    <button onClick={() => setApplyDefaultsDays(new Set(openDaysInRange))}
                      className="text-[9px] text-blue-500 hover:text-blue-700 font-bold">All Open</button>
                    <button onClick={() => {
                      // Select weekdays only (Mon-Fri)
                      const weekdays = openDaysInRange.filter(d => { const dow = new Date(d + 'T00:00:00').getDay(); return dow >= 1 && dow <= 5; });
                      setApplyDefaultsDays(new Set(weekdays));
                    }} className="text-[9px] text-blue-500 hover:text-blue-700 font-bold">Weekdays</button>
                    <button onClick={() => setApplyDefaultsDays(new Set())}
                      className="text-[9px] text-gray-400 hover:text-gray-600 font-bold">None</button>
                  </div>
                </div>
                <div className="space-y-1 max-h-[320px] overflow-y-auto border border-gray-100 rounded-xl p-2">
                  {h.plannerDays.map(dateStr => {
                    const closed = h.isDayClosed(dateStr);
                    const d = new Date(dateStr + 'T00:00:00');
                    const dayLabel = d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
                    const isSelected = applyDefaultsDays.has(dateStr);
                    const existingShifts = h.shiftsForRange[dateStr] || [];
                    const bankHol = isBankHoliday(dateStr);
                    const isToday = dateStr === todayStr;

                    return (
                      <label key={dateStr} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        closed ? 'opacity-30 pointer-events-none bg-gray-50' :
                        isSelected ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                      }`}>
                        <input type="checkbox" checked={isSelected && !closed} disabled={closed}
                          onChange={() => {
                            const next = new Set(applyDefaultsDays);
                            next.has(dateStr) ? next.delete(dateStr) : next.add(dateStr);
                            setApplyDefaultsDays(next);
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className={`text-xs font-bold flex-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                          {dayLabel}
                          {isToday && <span className="ml-1 text-[9px] text-blue-400">(Today)</span>}
                        </span>
                        {bankHol.isHoliday && (
                          <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{bankHol.name}</span>
                        )}
                        {closed && <span className="text-[9px] text-gray-400">Closed</span>}
                        {!closed && existingShifts.length > 0 && (
                          <span className="text-[9px] text-gray-400">{existingShifts.length} existing</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ── Right: Staff selection + times ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">Staff &amp; shift times</label>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      const next = new Map<string, ApplyDefaultsStaffEntry>();
                      applyDefaultsStaff.forEach((v, k) => next.set(k, { ...v, selected: true }));
                      setApplyDefaultsStaff(next);
                    }} className="text-[9px] text-blue-500 hover:text-blue-700 font-bold">Select All</button>
                    <button onClick={() => {
                      const next = new Map<string, ApplyDefaultsStaffEntry>();
                      applyDefaultsStaff.forEach((v, k) => next.set(k, { ...v, selected: false }));
                      setApplyDefaultsStaff(next);
                    }} className="text-[9px] text-gray-400 hover:text-gray-600 font-bold">Deselect All</button>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-[320px] overflow-y-auto border border-gray-100 rounded-xl p-2">
                  {h.activeStaff.map(s => {
                    const entry = applyDefaultsStaff.get(s.id) || {
                      selected: false, presetId: h.shiftPresets[0]?.id || '',
                      useCustom: false, customIn: '09:00', customOut: '18:30', breakMinutes: 60,
                    };
                    const hasHolidayInRange = [...applyDefaultsDays].some(d => h.isStaffOnHoliday(s.id, d));

                    return (
                      <div key={s.id} className={`rounded-xl transition-colors ${
                        entry.selected ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-transparent'
                      }`}>
                        {/* Staff row */}
                        <div className="flex items-center gap-2 px-3 py-2">
                          <input type="checkbox" checked={entry.selected}
                            onChange={() => {
                              const next = new Map(applyDefaultsStaff);
                              next.set(s.id, { ...entry, selected: !entry.selected });
                              setApplyDefaultsStaff(next);
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500" />
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.color}`} />
                          <span className="text-xs font-bold text-gray-700 flex-1">
                            {s.name}
                            {hasHolidayInRange && <span className="ml-1 text-[8px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded font-black uppercase">Holiday</span>}
                          </span>
                          {entry.selected && (
                            <div className="flex bg-gray-100 rounded-lg p-0.5">
                              <button onClick={() => {
                                const next = new Map(applyDefaultsStaff);
                                next.set(s.id, { ...entry, useCustom: false });
                                setApplyDefaultsStaff(next);
                              }} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${
                                !entry.useCustom ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'
                              }`}>Preset</button>
                              <button onClick={() => {
                                const next = new Map(applyDefaultsStaff);
                                next.set(s.id, { ...entry, useCustom: true });
                                setApplyDefaultsStaff(next);
                              }} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors ${
                                entry.useCustom ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400'
                              }`}>Custom</button>
                            </div>
                          )}
                        </div>
                        {/* Time config (shown when selected) */}
                        {entry.selected && (
                          <div className="px-3 pb-2.5 pt-0">
                            {!entry.useCustom ? (
                              <select value={entry.presetId}
                                onChange={e => {
                                  const next = new Map(applyDefaultsStaff);
                                  next.set(s.id, { ...entry, presetId: e.target.value });
                                  setApplyDefaultsStaff(next);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500">
                                {h.shiftPresets.map(p => (
                                  <option key={p.id} value={p.id}>{p.label} ({p.inTime}-{p.outTime})</option>
                                ))}
                              </select>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <label className="block text-[8px] font-bold uppercase text-gray-400 mb-0.5">In</label>
                                  <input type="time" value={entry.customIn}
                                    onChange={e => {
                                      const next = new Map(applyDefaultsStaff);
                                      next.set(s.id, { ...entry, customIn: e.target.value });
                                      setApplyDefaultsStaff(next);
                                    }}
                                    className="w-full px-2 py-1 rounded-lg border border-gray-200 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-[8px] font-bold uppercase text-gray-400 mb-0.5">Out</label>
                                  <input type="time" value={entry.customOut}
                                    onChange={e => {
                                      const next = new Map(applyDefaultsStaff);
                                      next.set(s.id, { ...entry, customOut: e.target.value });
                                      setApplyDefaultsStaff(next);
                                    }}
                                    className="w-full px-2 py-1 rounded-lg border border-gray-200 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="w-16">
                                  <label className="block text-[8px] font-bold uppercase text-gray-400 mb-0.5">Break</label>
                                  <input type="number" value={entry.breakMinutes} min="0" step="5"
                                    onChange={e => {
                                      const next = new Map(applyDefaultsStaff);
                                      next.set(s.id, { ...entry, breakMinutes: parseInt(e.target.value) || 0 });
                                      setApplyDefaultsStaff(next);
                                    }}
                                    className="w-full px-2 py-1 rounded-lg border border-gray-200 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center mb-3">
                Will apply to <span className="font-bold text-gray-600">{applyDefaultsDays.size}</span> selected day{applyDefaultsDays.size !== 1 ? 's' : ''}{' '}
                for <span className="font-bold text-gray-600">{[...applyDefaultsStaff.values()].filter(v => v.selected).length}</span> staff member{[...applyDefaultsStaff.values()].filter(v => v.selected).length !== 1 ? 's' : ''}
                <br /><span className="text-[10px]">(skipping staff already scheduled or on holiday on each day)</span>
              </p>
              <div className="flex gap-2">
                <button onClick={() => setShowApplyDefaultsDialog(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button onClick={handleConfirmApplyDefaults}
                  disabled={![...applyDefaultsStaff.values()].some(v => v.selected) || applyDefaultsDays.size === 0}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-40 disabled:cursor-not-allowed">
                  Apply Shifts
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
