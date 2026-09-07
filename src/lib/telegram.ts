import type { AppSettings, Inquiry } from "@/lib/types";

const TG = "https://api.telegram.org";

export async function tgApi(
  token: string,
  method: string,
  body?: Record<string, unknown>,
) {
  const res = await fetch(`${TG}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.description || `Telegram ${method} failed`);
  }
  return data.result;
}

export async function sendMessage(
  token: string,
  chatId: string,
  text: string,
  extra?: Record<string, unknown>,
) {
  return tgApi(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });
}

export function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function inquiryLink(id: string) {
  return `${appBaseUrl()}/inquiries/${id}`;
}

export function formatInquiryLine(i: Inquiry & { vendors?: { name: string } | null }) {
  const vendor = i.vendors?.name ?? "?";
  const fu = i.next_follow_up_date ?? "—";
  return `• <b>${escapeHtml(vendor)}</b> — ${escapeHtml(i.item_name)}\n  Status: ${i.status} | FU: ${fu}\n  ${inquiryLink(i.id)}`;
}

export function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function isQuietHour(settings: AppSettings, now = new Date()) {
  if (!settings.quiet_hours_enabled) return false;
  const hour = hourInTz(now, settings.timezone);
  const { quiet_start: start, quiet_end: end } = settings;
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

export function hourInTz(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);
  return Number(parts.find((p) => p.type === "hour")?.value ?? 0);
}

export function dateInTz(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function randomConnectCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}
