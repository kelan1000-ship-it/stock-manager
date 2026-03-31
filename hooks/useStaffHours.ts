import { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { BranchKey, StaffMember, StaffShift, StaffHoliday, StaffHoursViewMode, ShiftPreset, StoreHoursConfig, DayOverride } from '../types';
import {
  subscribeToStaffMembers, saveStaffMember, deleteStaffMember,
  subscribeToStaffShifts, saveStaffShift, deleteStaffShift,
  subscribeToStaffHolidays, saveStaffHoliday, deleteStaffHoliday,
  subscribeToShiftPresets, saveShiftPreset, deleteShiftPreset,
  subscribeToStoreHoursConfig, saveStoreHoursConfig as firestoreSaveStoreHoursConfig,
  subscribeToDayOverrides, saveDayOverride, deleteDayOverride,
} from '../services/firestoreService';
import { isBankHoliday } from '../utils/bankHolidays';

function toYmd(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekRange(date: Date): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const start = new Date(d);
  start.setDate(diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toYmd(start), end: toYmd(end) };
}

function getMonthRange(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: toYmd(start), end: toYmd(end) };
}

function getDateRange(date: Date, mode: StaffHoursViewMode): { start: string; end: string } {
  const dateStr = toYmd(date);
  if (mode === 'day') return { start: dateStr, end: dateStr };
  if (mode === 'week') return getWeekRange(date);
  return getMonthRange(date);
}

function getDaysInRange(start: string, end: string): string[] {
  const days: string[] = [];
  const d = new Date(start + 'T00:00:00');
  const endD = new Date(end + 'T00:00:00');
  while (d <= endD) {
    days.push(toYmd(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function useStaffHours(currentBranch: BranchKey, operator: string) {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [holidays, setHolidays] = useState<StaffHoliday[]>([]);
  const [shiftPresets, setShiftPresets] = useState<ShiftPreset[]>([]);
  const [presetsSeeded, setPresetsSeeded] = useState(false);
  const [viewMode, setViewMode] = useState<StaffHoursViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [storeHoursConfig, setStoreHoursConfig] = useState<StoreHoursConfig | null>(null);
  const [dayOverrides, setDayOverrides] = useState<DayOverride[]>([]);
  const [plannerDate, setPlannerDate] = useState(new Date());
  const [plannerViewMode, setPlannerViewMode] = useState<'week' | 'month'>('week');

  const DEFAULT_PRESETS: Omit<ShiftPreset, 'id' | 'branch'>[] = [
    { label: 'Full Day', inTime: '09:00', outTime: '18:30', breakMinutes: 60, sortOrder: 0 },
    { label: 'Morning', inTime: '09:00', outTime: '13:00', breakMinutes: 0, sortOrder: 1 },
    { label: 'Afternoon', inTime: '14:00', outTime: '18:30', breakMinutes: 0, sortOrder: 2 },
    { label: 'Early', inTime: '09:00', outTime: '15:00', breakMinutes: 0, sortOrder: 3 },
  ];

  // Subscriptions
  useEffect(() => {
    const unsub1 = subscribeToStaffMembers(currentBranch, setStaffMembers);
    const unsub2 = subscribeToStaffShifts(currentBranch, setShifts);
    const unsub3 = subscribeToStaffHolidays(currentBranch, setHolidays);
    const unsub4 = subscribeToShiftPresets(currentBranch, (presets) => {
      setShiftPresets(presets.sort((a, b) => a.sortOrder - b.sortOrder));
      if (!presetsSeeded && presets.length === 0) {
        setPresetsSeeded(true);
        DEFAULT_PRESETS.forEach(p => {
          const id = crypto.randomUUID();
          saveShiftPreset(currentBranch, { ...p, id, branch: currentBranch });
        });
      } else if (presets.length > 0) {
        setPresetsSeeded(true);
      }
    });
    const unsub5 = subscribeToStoreHoursConfig(currentBranch, (config) => {
      setStoreHoursConfig(config);
    });
    const unsub6 = subscribeToDayOverrides(currentBranch, setDayOverrides);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); };
  }, [currentBranch]);

  const dateRange = useMemo(() => getDateRange(selectedDate, viewMode), [selectedDate, viewMode]);
  const daysInRange = useMemo(() => getDaysInRange(dateRange.start, dateRange.end), [dateRange]);

  const activeStaff = useMemo(
    () => staffMembers.filter(s => s.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [staffMembers]
  );

  // Shifts currently clocked in (no clockOut)
  const activeShifts = useMemo(
    () => shifts.filter(s => s.clockOut === null),
    [shifts]
  );

  // Staff on holiday today
  const todayStr = useMemo(() => toYmd(new Date()), []);

  const isViewingFuture = useMemo(() => {
    if (viewMode !== 'day') return false;
    const viewingStr = toYmd(selectedDate);
    return viewingStr > todayStr;
  }, [selectedDate, viewMode, todayStr]);

  const isViewingToday = useMemo(() => {
    if (viewMode !== 'day') return false;
    return toYmd(selectedDate) === todayStr;
  }, [selectedDate, viewMode, todayStr]);

  // Helper to extract HH:mm from ISO
  const getLocalTime = (iso: string): string => {
    const d = new Date(iso);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  // Shifts planned for the currently viewed date (completed shifts with future dates)
  const plannedShiftsForDate = useMemo(() => {
    const viewingStr = toYmd(selectedDate);
    return shifts.filter(s => s.date === viewingStr && s.clockOut !== null);
  }, [shifts, selectedDate]);
  const onHolidayToday = useMemo(
    () => holidays.filter(h => h.startDate <= todayStr && h.endDate >= todayStr),
    [holidays, todayStr]
  );

  const clockedInStaffIds = useMemo(
    () => new Set(activeShifts.map(s => s.staffId)),
    [activeShifts]
  );

  const onHolidayStaffIds = useMemo(
    () => new Set(onHolidayToday.map(h => h.staffId)),
    [onHolidayToday]
  );

  // Available = active, not clocked in, not on holiday
  const availableStaff = useMemo(
    () => activeStaff.filter(s => !clockedInStaffIds.has(s.id) && !onHolidayStaffIds.has(s.id)),
    [activeStaff, clockedInStaffIds, onHolidayStaffIds]
  );

  // Filtered shifts for the selected date range (only current and historic)
  const filteredShifts = useMemo(
    () => shifts.filter(s => s.date >= dateRange.start && s.date <= dateRange.end && s.date <= todayStr)
      .sort((a, b) => b.clockIn.localeCompare(a.clockIn)),
    [shifts, dateRange, todayStr]
  );

  // Totals by staff for the date range
  const totalsByStaff = useMemo(() => {
    const map: Record<string, { staffId: string; staffName: string; totalHours: number; dayHours: Record<string, number> }> = {};
    for (const s of filteredShifts) {
      if (!map[s.staffId]) map[s.staffId] = { staffId: s.staffId, staffName: s.staffName, totalHours: 0, dayHours: {} };
      const hrs = s.totalHours || 0;
      map[s.staffId].totalHours += hrs;
      map[s.staffId].dayHours[s.date] = (map[s.staffId].dayHours[s.date] || 0) + hrs;
    }
    return Object.values(map).sort((a, b) => a.staffName.localeCompare(b.staffName));
  }, [filteredShifts]);

  // Holidays in the selected range
  const filteredHolidays = useMemo(
    () => holidays.filter(h => h.startDate <= dateRange.end && h.endDate >= dateRange.start),
    [holidays, dateRange]
  );

  // ─── Actions ───

  const addStaffMember = useCallback(async (name: string, role: string, color: string) => {
    const id = `staff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const member: StaffMember = {
      id, name, role, branch: currentBranch, isActive: true, color,
      createdAt: new Date().toISOString(),
      sortOrder: staffMembers.length,
    };
    await saveStaffMember(currentBranch, member);
  }, [currentBranch, staffMembers.length]);

  const updateStaffMember = useCallback(async (member: StaffMember) => {
    await saveStaffMember(currentBranch, member);
  }, [currentBranch]);

  const removeStaffMember = useCallback(async (id: string) => {
    await deleteStaffMember(currentBranch, id);
  }, [currentBranch]);

  const clockIn = useCallback(async (staffId: string) => {
    const staff = staffMembers.find(s => s.id === staffId);
    if (!staff) return;
    const now = new Date();
    const shift: StaffShift = {
      id: `shift_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      staffId, staffName: staff.name, branch: currentBranch,
      date: toYmd(now),
      clockIn: now.toISOString(),
      clockOut: null, totalHours: null, breakMinutes: 0, note: '', operator,
    };
    await saveStaffShift(currentBranch, shift);
  }, [currentBranch, staffMembers, operator]);

  const clockOut = useCallback(async (shiftId: string, breakMinutes: number) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;
    const now = new Date();
    const clockInTime = new Date(shift.clockIn).getTime();
    const rawMinutes = (now.getTime() - clockInTime) / 60000;
    const netMinutes = Math.max(0, rawMinutes - breakMinutes);
    const totalHours = Math.round(netMinutes / 6) / 10; // round to 1 decimal
    await saveStaffShift(currentBranch, {
      ...shift, clockOut: now.toISOString(), totalHours, breakMinutes,
    });
  }, [currentBranch, shifts]);

  const editShift = useCallback(async (shift: StaffShift) => {
    await saveStaffShift(currentBranch, shift);
  }, [currentBranch]);

  const removeShift = useCallback(async (shiftId: string) => {
    await deleteStaffShift(currentBranch, shiftId);
  }, [currentBranch]);

  const addHoliday = useCallback(async (staffId: string, startDate: string, endDate: string, type: StaffHoliday['type'], notes: string) => {
    const staff = staffMembers.find(s => s.id === staffId);
    if (!staff) return;
    const holiday: StaffHoliday = {
      id: `hol_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      staffId, staffName: staff.name, branch: currentBranch,
      startDate, endDate, type, notes, approvedBy: operator,
      createdAt: new Date().toISOString(),
    };
    await saveStaffHoliday(currentBranch, holiday);
  }, [currentBranch, staffMembers, operator]);

  const isStaffOnHoliday = useCallback((staffId: string, dateStr: string): boolean => {
    return holidays.some(h => h.staffId === staffId && h.startDate <= dateStr && h.endDate >= dateStr);
  }, [holidays]);

  const removeHoliday = useCallback(async (holidayId: string) => {
    await deleteStaffHoliday(currentBranch, holidayId);
  }, [currentBranch]);

  const editHoliday = useCallback(async (holiday: StaffHoliday) => {
    await saveStaffHoliday(currentBranch, holiday);
  }, [currentBranch]);

  const planShift = useCallback((staffId: string): StaffShift | null => {
    const staff = staffMembers.find(s => s.id === staffId);
    if (!staff) return null;
    const dateStr = toYmd(selectedDate);
    const defaultPreset = shiftPresets[0];
    const inTime = defaultPreset?.inTime || '09:00';
    const outTime = defaultPreset?.outTime || '18:30';
    const breakMins = defaultPreset?.breakMinutes ?? 60;

    // Use local time construction to avoid BST shift
    const clockIn = new Date(`${dateStr}T${inTime}:00`).toISOString();
    const clockOut = new Date(`${dateStr}T${outTime}:00`).toISOString();
    const rawMins = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 60000;
    const totalHours = Math.round(Math.max(0, rawMins - breakMins) / 6) / 10;

    return {
      id: `shift_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      staffId,
      staffName: staff.name,
      branch: currentBranch,
      date: dateStr,
      clockIn,
      clockOut,
      totalHours,
      breakMinutes: breakMins,
      note: '',
      operator,
    };
  }, [staffMembers, selectedDate, shiftPresets, currentBranch, operator]);

  const navigateDate = useCallback((direction: -1 | 1) => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      if (viewMode === 'day') d.setDate(d.getDate() + direction);
      else if (viewMode === 'week') d.setDate(d.getDate() + 7 * direction);
      else d.setMonth(d.getMonth() + direction);
      return d;
    });
  }, [viewMode]);

  const exportToExcel = useCallback(() => {
    const rows = filteredShifts.map(s => ({
      'Staff Name': s.staffName,
      'Date': s.date,
      'Clock In': s.clockIn ? new Date(s.clockIn).toLocaleTimeString() : '',
      'Clock Out': s.clockOut ? new Date(s.clockOut).toLocaleTimeString() : '',
      'Break (min)': s.breakMinutes,
      'Total Hours': s.totalHours ?? '',
      'Note': s.note,
      'Operator': s.operator,
    }));

    // Add a summary section
    const summaryRows = totalsByStaff.map(t => ({
      'Staff Name': t.staffName,
      'Date': '',
      'Clock In': '',
      'Clock Out': '',
      'Break (min)': '',
      'Total Hours': t.totalHours,
      'Note': 'TOTAL',
      'Operator': '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([...rows, {}, ...summaryRows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Hours');

    // Holiday sheet
    const holRows = filteredHolidays.map(h => ({
      'Staff Name': h.staffName,
      'Start Date': h.startDate,
      'End Date': h.endDate,
      'Type': h.type,
      'Notes': h.notes,
      'Approved By': h.approvedBy,
    }));
    if (holRows.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(holRows);
      XLSX.utils.book_append_sheet(wb, ws2, 'Holidays');
    }

    XLSX.writeFile(wb, `staff-hours-${dateRange.start}-to-${dateRange.end}.xlsx`);
  }, [filteredShifts, totalsByStaff, filteredHolidays, dateRange]);

  const addShiftPreset = useCallback(async (preset: Omit<ShiftPreset, 'id' | 'branch'>) => {
    const id = crypto.randomUUID();
    const obj = { ...preset, id, branch: currentBranch };
    const clean = Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as unknown as ShiftPreset;
    await saveShiftPreset(currentBranch, clean);
  }, [currentBranch]);

  const updateShiftPreset = useCallback(async (preset: ShiftPreset) => {
    // Firestore rejects undefined values — strip them before saving
    const clean = Object.fromEntries(Object.entries(preset).filter(([, v]) => v !== undefined)) as unknown as ShiftPreset;
    await saveShiftPreset(currentBranch, clean);
  }, [currentBranch]);

  const removeShiftPreset = useCallback(async (presetId: string) => {
    await deleteShiftPreset(currentBranch, presetId);
  }, [currentBranch]);

  // ─── Planner helpers ───

  const plannerWeekRange = useMemo(() => getWeekRange(plannerDate), [plannerDate]);
  const plannerWeekDays = useMemo(() => getDaysInRange(plannerWeekRange.start, plannerWeekRange.end), [plannerWeekRange]);

  const plannerRange = useMemo(() =>
    plannerViewMode === 'week' ? getWeekRange(plannerDate) : getMonthRange(plannerDate),
    [plannerDate, plannerViewMode]
  );
  const plannerDays = useMemo(() => getDaysInRange(plannerRange.start, plannerRange.end), [plannerRange]);

  const shiftsForRange = useMemo(() => {
    const map: Record<string, StaffShift[]> = {};
    for (const d of plannerDays) map[d] = [];
    for (const s of shifts) {
      if (s.date >= plannerRange.start && s.date <= plannerRange.end) {
        if (!map[s.date]) map[s.date] = [];
        map[s.date].push(s);
      }
    }
    // Sort each day by sortOrder, then clockIn as tiebreaker
    for (const d of Object.keys(map)) {
      map[d].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.clockIn.localeCompare(b.clockIn));
    }
    return map;
  }, [shifts, plannerDays, plannerRange]);

  // Keep old name for backward compat in weekly view
  const shiftsForWeek = shiftsForRange;

  const navigatePlannerWeek = useCallback((direction: -1 | 1) => {
    setPlannerDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7 * direction);
      return d;
    });
  }, []);

  const navigatePlanner = useCallback((direction: -1 | 1) => {
    setPlannerDate(prev => {
      const d = new Date(prev);
      if (plannerViewMode === 'week') {
        d.setDate(d.getDate() + 7 * direction);
      } else {
        d.setMonth(d.getMonth() + direction);
      }
      return d;
    });
  }, [plannerViewMode]);

  const reorderShift = useCallback(async (shiftId: string, direction: -1 | 1) => {
    // Find the shift
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;
    // Get sorted day array
    const dayShifts = [...(shiftsForRange[shift.date] || [])];
    const idx = dayShifts.findIndex(s => s.id === shiftId);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= dayShifts.length) return;
    const adjacent = dayShifts[targetIdx];
    // Assign explicit sort orders if needed, then swap
    const orderA = shift.sortOrder ?? idx;
    const orderB = adjacent.sortOrder ?? targetIdx;
    await saveStaffShift(currentBranch, { ...shift, sortOrder: orderB });
    await saveStaffShift(currentBranch, { ...adjacent, sortOrder: orderA });
  }, [shifts, shiftsForRange, currentBranch]);

  const isDayClosed = useCallback((dateStr: string): boolean => {
    // Check for a specific date override first
    const override = dayOverrides.find(o => o.date === dateStr);
    if (override) return !override.isOpen;

    const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();

    // Check store hours config for this day of week
    if (storeHoursConfig?.days[String(dayOfWeek)]?.closed) return true;

    // Default: Sunday closed
    if (dayOfWeek === 0 && !storeHoursConfig) return true;

    // Bank holiday = closed by default (unless overridden above)
    if (isBankHoliday(dateStr).isHoliday) return true;

    return false;
  }, [dayOverrides, storeHoursConfig]);

  const toggleDayOverride = useCallback(async (dateStr: string) => {
    const existing = dayOverrides.find(o => o.date === dateStr);
    if (existing) {
      // Remove override to revert to default
      await deleteDayOverride(currentBranch, dateStr);
    } else {
      // Currently closed → open override, or currently open → closed override
      const currentlyClosed = isDayClosed(dateStr);
      await saveDayOverride(currentBranch, {
        id: dateStr,
        branch: currentBranch,
        date: dateStr,
        isOpen: currentlyClosed,
      });
    }
  }, [currentBranch, dayOverrides, isDayClosed]);

  const saveStoreHoursConfigFn = useCallback(async (config: StoreHoursConfig) => {
    await firestoreSaveStoreHoursConfig(currentBranch, config);
  }, [currentBranch]);

  const createShiftFromPreset = useCallback((staffId: string, dateStr: string, preset: ShiftPreset): StaffShift => {
    const staff = staffMembers.find(s => s.id === staffId);
    // Local time aware construction
    const clockIn = new Date(`${dateStr}T${preset.inTime}:00`).toISOString();
    const clockOut = new Date(`${dateStr}T${preset.outTime}:00`).toISOString();
    const rawMins = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 60000;
    const totalHours = Math.round(Math.max(0, rawMins - preset.breakMinutes) / 6) / 10;
    return {
      id: `shift_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      staffId,
      staffName: staff?.name || 'Unknown',
      branch: currentBranch,
      date: dateStr,
      clockIn,
      clockOut,
      totalHours,
      breakMinutes: preset.breakMinutes,
      note: '',
      operator,
    };
  }, [staffMembers, currentBranch, operator]);

  const applyDefaults = useCallback(async (
    staffConfigs?: { staffId: string; presetId?: string; customIn?: string; customOut?: string; breakMinutes?: number }[],
    selectedDays?: string[],
  ) => {
    const daysToApply = selectedDays || plannerDays;
    for (const dateStr of daysToApply) {
      if (isDayClosed(dateStr)) continue;
      const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
      const dayConfig = storeHoursConfig?.days[String(dayOfWeek)];
      const defaultPresetId = dayConfig?.presetId;
      const defaultPreset = defaultPresetId ? shiftPresets.find(p => p.id === defaultPresetId) : shiftPresets[0];
      if (!defaultPreset && !staffConfigs) continue;

      const existingOnDay = shiftsForRange[dateStr] || [];
      const existingStaffIds = new Set(existingOnDay.map(s => s.staffId));

      const staffToApply = staffConfigs || activeStaff.map(s => ({ staffId: s.id }));

      for (const sc of staffToApply) {
        if (existingStaffIds.has(sc.staffId)) continue;
        if (isStaffOnHoliday(sc.staffId, dateStr)) continue;
        // Custom times override preset
        if (sc.customIn && sc.customOut) {
          const staff = staffMembers.find(s => s.id === sc.staffId);
          // Local time aware construction
          const clockIn = new Date(`${dateStr}T${sc.customIn}:00`).toISOString();
          const clockOut = new Date(`${dateStr}T${sc.customOut}:00`).toISOString();
          const breakMins = sc.breakMinutes ?? 0;
          const rawMins = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 60000;
          const totalHours = Math.round(Math.max(0, rawMins - breakMins) / 6) / 10;
          const shift: StaffShift = {
            id: `shift_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            staffId: sc.staffId,
            staffName: staff?.name || 'Unknown',
            branch: currentBranch,
            date: dateStr,
            clockIn, clockOut, totalHours,
            breakMinutes: breakMins,
            note: '', operator,
          };
          await saveStaffShift(currentBranch, shift);
        } else {
          const preset = sc.presetId ? shiftPresets.find(p => p.id === sc.presetId) : defaultPreset;
          if (!preset) continue;
          const shift = createShiftFromPreset(sc.staffId, dateStr, preset);
          await saveStaffShift(currentBranch, shift);
        }
      }
    }
  }, [plannerDays, isDayClosed, isStaffOnHoliday, storeHoursConfig, shiftPresets, shiftsForRange, activeStaff, createShiftFromPreset, currentBranch, staffMembers, operator]);

  // Backward compat alias
  const applyWeekDefaults = applyDefaults;

  const copyPrevious = useCallback(async () => {
    const rangeStart = new Date(plannerRange.start + 'T00:00:00');
    const rangeEnd = new Date(plannerRange.end + 'T00:00:00');
    const rangeLenDays = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 86400000) + 1;

    let prevStart: Date, prevEnd: Date;
    if (plannerViewMode === 'month') {
      prevStart = new Date(rangeStart);
      prevStart.setMonth(prevStart.getMonth() - 1);
      prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth() + 1, 0);
    } else {
      prevStart = new Date(rangeStart);
      prevStart.setDate(prevStart.getDate() - 7);
      prevEnd = new Date(prevStart);
      prevEnd.setDate(prevEnd.getDate() + 6);
    }
    const prevStartStr = toYmd(prevStart);
    const prevEndStr = toYmd(prevEnd);

    const prevShifts = shifts.filter(s => s.date >= prevStartStr && s.date <= prevEndStr);

    for (const prevShift of prevShifts) {
      const prevDate = new Date(prevShift.date + 'T00:00:00');
      let newDate: Date;
      if (plannerViewMode === 'month') {
        // Map by day-of-month
        newDate = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), prevDate.getDate());
        // If the target month doesn't have this day, skip
        if (newDate.getMonth() !== rangeStart.getMonth()) continue;
      } else {
        newDate = new Date(prevDate);
        newDate.setDate(newDate.getDate() + 7);
      }
      const newDateStr = toYmd(newDate);
      if (newDateStr < plannerRange.start || newDateStr > plannerRange.end) continue;

      const existing = (shiftsForRange[newDateStr] || []);
      if (existing.some(s => s.staffId === prevShift.staffId)) continue;

      // Extract local time and apply to new date to preserve "wall clock" time across BST transitions
      const timeIn = getLocalTime(prevShift.clockIn);
      const timeOut = prevShift.clockOut ? getLocalTime(prevShift.clockOut) : null;
      const newClockIn = new Date(`${newDateStr}T${timeIn}:00`).toISOString();
      const newClockOut = timeOut ? new Date(`${newDateStr}T${timeOut}:00`).toISOString() : null;

      const newShift: StaffShift = {
        ...prevShift,
        id: `shift_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        date: newDateStr,
        clockIn: newClockIn,
        clockOut: newClockOut,
        operator,
      };
      await saveStaffShift(currentBranch, newShift);
    }
  }, [shifts, plannerRange, plannerViewMode, shiftsForRange, currentBranch, operator]);

  // Backward compat alias
  const copyPreviousWeek = copyPrevious;

  const copyPreviousDayShifts = useCallback(async (dateStr: string) => {
    const prevDate = new Date(dateStr + 'T00:00:00');
    prevDate.setDate(prevDate.getDate() - 7);
    const prevDateStr = toYmd(prevDate);

    const prevShifts = shifts.filter(s => s.date === prevDateStr);
    const existingStaffIds = new Set((shiftsForRange[dateStr] || []).map(s => s.staffId));

    for (const prevShift of prevShifts) {
      if (existingStaffIds.has(prevShift.staffId)) continue;
      
      const timeIn = getLocalTime(prevShift.clockIn);
      const timeOut = prevShift.clockOut ? getLocalTime(prevShift.clockOut) : null;
      const newClockIn = new Date(`${dateStr}T${timeIn}:00`).toISOString();
      const newClockOut = timeOut ? new Date(`${dateStr}T${timeOut}:00`).toISOString() : null;

      const newShift: StaffShift = {
        ...prevShift,
        id: `shift_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        date: dateStr,
        clockIn: newClockIn,
        clockOut: newClockOut,
        operator,
      };
      await saveStaffShift(currentBranch, newShift);
    }
  }, [shifts, shiftsForRange, currentBranch, operator]);

  return {
    // State
    viewMode, setViewMode, selectedDate, setSelectedDate,
    dateRange, daysInRange, todayStr,
    // Data
    staffMembers, activeStaff, availableStaff,
    shifts, activeShifts, filteredShifts,
    holidays, filteredHolidays, onHolidayToday,
    clockedInStaffIds, onHolidayStaffIds,
    totalsByStaff,
    shiftPresets,
    // Actions
    addStaffMember, updateStaffMember, removeStaffMember,
    isViewingFuture, isViewingToday, plannedShiftsForDate, planShift,
    clockIn, clockOut, editShift, removeShift,
    addHoliday, editHoliday, removeHoliday, isStaffOnHoliday,
    addShiftPreset, updateShiftPreset, removeShiftPreset,
    navigateDate, exportToExcel,
    // Planner
    storeHoursConfig, saveStoreHoursConfig: saveStoreHoursConfigFn,
    dayOverrides, isDayClosed, toggleDayOverride,
    plannerDate, setPlannerDate, plannerWeekRange, plannerWeekDays, shiftsForWeek,
    navigatePlannerWeek, applyWeekDefaults, copyPreviousWeek,
    plannerViewMode, setPlannerViewMode, plannerRange, plannerDays, shiftsForRange,
    navigatePlanner, applyDefaults, copyPrevious,
    createShiftFromPreset,
    copyPreviousDayShifts,
    reorderShift,
  };
}
