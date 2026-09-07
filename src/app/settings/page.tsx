import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings-form";
import { PageHeader } from "@/components/page-header";
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
      <p style={{ color: "#DC2626" }}>
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
      <PageHeader
        title="Settings"
        description="Telegram, luật nhắc, giá trị mặc định"
      />
      <SettingsForm settings={safe} />
    </div>
  );
}
