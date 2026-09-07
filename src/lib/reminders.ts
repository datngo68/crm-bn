import type { AppSettings, Inquiry } from "@/lib/types";
import {
  dateInTz,
  formatInquiryLine,
  hourInTz,
  isQuietHour,
  sendMessage,
} from "@/lib/telegram";
import { createServiceClient } from "@/lib/supabase/server";

export async function runReminders() {
  const supabase = createServiceClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (!settings) return { ok: false, error: "No settings" };
  const s = settings as AppSettings;

  if (!s.telegram_bot_token || !s.telegram_chat_id) {
    return { ok: false, error: "Telegram not connected" };
  }

  const now = new Date();
  const today = dateInTz(now, s.timezone);
  const results = { perItem: 0, digest: false };

  if (s.remind_per_item_enabled && !isQuietHour(s, now)) {
    const { data } = await supabase
      .from("inquiries")
      .select("*, vendors(id, name)")
      .is("archived_at", null)
      .eq("status", "Pending")
      .lte("next_follow_up_date", today)
      .not("next_follow_up_date", "is", null);

    for (const raw of data ?? []) {
      const i = raw as Inquiry;
      if (
        i.last_reminded_at &&
        Date.now() - new Date(i.last_reminded_at).getTime() < 6 * 60 * 60 * 1000
      ) {
        continue;
      }
      const text = `⏰ Follow-up\n${formatInquiryLine(i)}`;
      await sendMessage(s.telegram_bot_token, s.telegram_chat_id, text);
      await supabase
        .from("inquiries")
        .update({ last_reminded_at: now.toISOString() })
        .eq("id", i.id);
      results.perItem += 1;
    }
  }

  if (
    s.remind_digest_enabled &&
    hourInTz(now, s.timezone) === s.digest_hour &&
    s.last_digest_date !== today
  ) {
    const { data } = await supabase
      .from("inquiries")
      .select("*, vendors(id, name)")
      .is("archived_at", null)
      .eq("status", "Pending");

    const list = (data ?? []) as Inquiry[];
    const overdue = list.filter(
      (i) => i.next_follow_up_date && i.next_follow_up_date < today,
    );
    const dueToday = list.filter((i) => i.next_follow_up_date === today);

    const lines = [
      `<b>📋 Digest CRM Inquiry — ${today}</b>`,
      `Pending: ${list.length}`,
      `Quá hạn: ${overdue.length}`,
      `Hôm nay: ${dueToday.length}`,
      "",
      ...[...overdue, ...dueToday].slice(0, 15).map(formatInquiryLine),
    ];
    if (overdue.length + dueToday.length > 15) {
      lines.push(`… và ${overdue.length + dueToday.length - 15} mục khác`);
    }

    await sendMessage(
      s.telegram_bot_token,
      s.telegram_chat_id,
      lines.join("\n"),
    );
    await supabase
      .from("app_settings")
      .update({ last_digest_date: today })
      .eq("id", 1);
    results.digest = true;
  }

  return { ok: true, ...results };
}
