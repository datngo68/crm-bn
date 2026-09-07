import { addDaysISO } from "@/lib/utils";

export function isOverdue(nextFu: string | null | undefined, today: string) {
  return Boolean(nextFu && nextFu < today);
}

export function isDueToday(nextFu: string | null | undefined, today: string) {
  return nextFu === today;
}

export function isDueOrOverdue(nextFu: string | null | undefined, today: string) {
  return Boolean(nextFu && nextFu <= today);
}

export function daFuPatch(today: string, defaultFollowUpDays: number) {
  const days =
    Number.isFinite(defaultFollowUpDays) && defaultFollowUpDays >= 0
      ? Math.floor(defaultFollowUpDays)
      : 3;
  return {
    last_follow_up_date: today,
    next_follow_up_date: addDaysISO(days, new Date(`${today}T12:00:00`)),
  };
}

/** Toast-friendly DD/MM/YYYY from YYYY-MM-DD */
export function formatFuDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
