import { addDaysISO } from "@/lib/utils";
import type { InquiryStatus } from "@/lib/types";

export function followUpDateForStatus(
  status: InquiryStatus,
  inquiry: { follow_up_date?: string | null; next_follow_up_date?: string | null },
) {
  return status === "Follow Up"
    ? inquiry.follow_up_date ?? null
    : status === "Pending quotation"
      ? inquiry.next_follow_up_date ?? null
      : null;
}

export function isOverdue(nextFu: string | null | undefined, today: string) {
  return Boolean(nextFu && nextFu < today);
}

export function isDueToday(nextFu: string | null | undefined, today: string) {
  return nextFu === today;
}

export function isDueOrOverdue(nextFu: string | null | undefined, today: string) {
  return Boolean(nextFu && nextFu <= today);
}

export function daFuPatch(today: string, defaultFollowUpDays: number, status: InquiryStatus = "Pending quotation") {
  const days =
    Number.isFinite(defaultFollowUpDays) && defaultFollowUpDays >= 0
      ? Math.floor(defaultFollowUpDays)
      : 3;
  const nextDate = addDaysISO(days, new Date(`${today}T12:00:00`));
  return status === "Follow Up"
    ? { last_follow_up_date: today, follow_up_date: nextDate }
    : { last_follow_up_date: today, next_follow_up_date: nextDate };
}

/** Toast-friendly DD/MM/YYYY from YYYY-MM-DD */
export function formatFuDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
