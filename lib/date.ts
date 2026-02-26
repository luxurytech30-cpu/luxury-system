export type Ym = { year: number; month: number };

export function toMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function toMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function currentYm(): Ym {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function ymFromDate(date: Date): Ym {
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function ymKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function compareYm(a: Ym, b: Ym) {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

export function nextYm({ year, month }: Ym): Ym {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

export function ymToDate({ year, month }: Ym) {
  return new Date(year, month - 1, 1);
}

export function monthOverlapsRange(year: number, month: number, from: Date, to: Date | null) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  const rangeEnd = to ?? new Date(8640000000000000);
  return from <= monthEnd && rangeEnd >= monthStart;
}

export function isMonthOverdue(year: number, month: number, now = new Date()) {
  const due = new Date(year, month - 1, 15, 23, 59, 59, 999);
  return now > due;
}

export function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

