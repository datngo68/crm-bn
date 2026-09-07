import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendMessage } from "@/lib/telegram";

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.CRON_SECRET;
  const header = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret && header !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const update = await req.json();
  const message = update?.message;
  const text: string = message?.text ?? "";
  const chatId = message?.chat?.id?.toString();
  if (!chatId || !text.startsWith("/start")) {
    return NextResponse.json({ ok: true });
  }

  const code = text.split(/\s+/)[1]?.trim();
  if (!code) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createServiceClient();
  const { data: s } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (
    !s?.telegram_bot_token ||
    !s.telegram_connect_code ||
    s.telegram_connect_code !== code
  ) {
    if (s?.telegram_bot_token) {
      await sendMessage(
        s.telegram_bot_token,
        chatId,
        "❌ Mã kết nối không hợp lệ hoặc đã hết hạn. Mở lại app → Cài đặt → Kết nối Telegram.",
      ).catch(() => undefined);
    }
    return NextResponse.json({ ok: true });
  }

  if (
    s.telegram_connect_expires_at &&
    new Date(s.telegram_connect_expires_at).getTime() < Date.now()
  ) {
    await sendMessage(
      s.telegram_bot_token,
      chatId,
      "❌ Mã đã hết hạn (10 phút). Tạo link mới trong app.",
    ).catch(() => undefined);
    return NextResponse.json({ ok: true });
  }

  await supabase
    .from("app_settings")
    .update({
      telegram_chat_id: chatId,
      telegram_connected_at: new Date().toISOString(),
      telegram_connect_code: null,
      telegram_connect_expires_at: null,
    })
    .eq("id", 1);

  await sendMessage(
    s.telegram_bot_token,
    chatId,
    "✅ Đã kết nối CRM Inquiry.\nBạn sẽ nhận nhắc follow-up tại đây.",
  ).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
