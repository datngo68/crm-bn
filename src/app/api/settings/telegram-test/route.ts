import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendMessage } from "@/lib/telegram";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: s } = await supabase
    .from("app_settings")
    .select("telegram_bot_token, telegram_chat_id")
    .eq("id", 1)
    .single();

  if (!s?.telegram_bot_token || !s.telegram_chat_id) {
    return NextResponse.json({ error: "Chưa kết nối Telegram" }, { status: 400 });
  }

  try {
    await sendMessage(
      s.telegram_bot_token,
      s.telegram_chat_id,
      "✅ CRM Inquiry — tin thử thành công.",
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gửi thất bại" },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
