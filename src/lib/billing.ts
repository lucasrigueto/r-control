/**
 * Returns the open billing cycle for a credit card based on its closing day.
 *
 * Example — closingDay = 5:
 *   Today = Apr 3  → cycle: Mar 6 → Apr 5
 *   Today = Apr 10 → cycle: Apr 6 → May 5
 */
export function getBillingCycle(
  closingDay: number,
  referenceDate: Date = new Date()
): { start: Date; end: Date } {
  const day = referenceDate.getDate();
  const month = referenceDate.getMonth();
  const year = referenceDate.getFullYear();

  let cycleEnd: Date;
  let cycleStart: Date;

  if (day <= closingDay) {
    // Still inside the cycle closing this month
    cycleEnd = new Date(year, month, closingDay, 23, 59, 59, 999);
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    cycleStart = new Date(prevYear, prevMonth, closingDay + 1, 0, 0, 0, 0);
  } else {
    // Cycle closes next month
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    cycleEnd = new Date(nextYear, nextMonth, closingDay, 23, 59, 59, 999);
    cycleStart = new Date(year, month, closingDay + 1, 0, 0, 0, 0);
  }

  return { start: cycleStart, end: cycleEnd };
}

export function formatCycleLabel(closingDay: number, referenceDate: Date = new Date()): string {
  const { start, end } = getBillingCycle(closingDay, referenceDate);
  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}
