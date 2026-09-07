import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings-form";
import type { AppSettings } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (!data) {
    return (
      <p style={{ color: "#cf1322" }}>
        Chưa có bảng app_settings — chạy migration SQL trước.
      </p>
    );
  }

  const raw = data as AppSettings;
  const safe: AppSettings = {
    ...raw,
    has_telegram_token: Boolean(raw.telegram_bot_token),
    telegram_bot_token: raw.telegram_bot_token ? "***" : null,
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 4px" }}>
        Cài đặt
      </h1>
      <p style={{ color: "#64748b", marginBottom: 16 }}>
        Telegram, luật nhắc, mặc định — đơn giản, đủ dùng
      </p>
      <SettingsForm settings={safe} />
    </div>
  );
}
