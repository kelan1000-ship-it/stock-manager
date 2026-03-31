// England & Wales bank holidays 2025–2027 (hardcoded — Easter dates move yearly)

interface BankHoliday {
  date: string;  // YYYY-MM-DD
  name: string;
}

const BANK_HOLIDAYS: BankHoliday[] = [
  // ── 2025 ──
  { date: '2025-01-01', name: "New Year's Day" },
  { date: '2025-04-18', name: 'Good Friday' },
  { date: '2025-04-21', name: 'Easter Monday' },
  { date: '2025-05-05', name: 'Early May Bank Holiday' },
  { date: '2025-05-26', name: 'Spring Bank Holiday' },
  { date: '2025-08-25', name: 'Summer Bank Holiday' },
  { date: '2025-12-25', name: 'Christmas Day' },
  { date: '2025-12-26', name: 'Boxing Day' },

  // ── 2026 ──
  { date: '2026-01-01', name: "New Year's Day" },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-04-06', name: 'Easter Monday' },
  { date: '2026-05-04', name: 'Early May Bank Holiday' },
  { date: '2026-05-25', name: 'Spring Bank Holiday' },
  { date: '2026-08-31', name: 'Summer Bank Holiday' },
  { date: '2026-12-25', name: 'Christmas Day' },
  { date: '2026-12-28', name: 'Boxing Day (substitute)' },

  // ── 2027 ──
  { date: '2027-01-01', name: "New Year's Day" },
  { date: '2027-03-26', name: 'Good Friday' },
  { date: '2027-03-29', name: 'Easter Monday' },
  { date: '2027-05-03', name: 'Early May Bank Holiday' },
  { date: '2027-05-31', name: 'Spring Bank Holiday' },
  { date: '2027-08-30', name: 'Summer Bank Holiday' },
  { date: '2027-12-27', name: 'Christmas Day (substitute)' },
  { date: '2027-12-28', name: 'Boxing Day (substitute)' },
];

const holidayMap = new Map(BANK_HOLIDAYS.map(h => [h.date, h.name]));

export function isBankHoliday(dateStr: string): { isHoliday: boolean; name?: string } {
  const name = holidayMap.get(dateStr);
  return name ? { isHoliday: true, name } : { isHoliday: false };
}

export function getBankHolidaysInRange(start: string, end: string): BankHoliday[] {
  return BANK_HOLIDAYS.filter(h => h.date >= start && h.date <= end);
}
