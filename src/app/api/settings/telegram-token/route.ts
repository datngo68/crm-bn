import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tgApi } from "@/lib/telegram";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Thiếu token" }, { status: 400 });
  }

  let me: { username?: string };
  try {
    me = await tgApi(token.trim(), "getMe");
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Token không hợp lệ" },
      { status: 400 },
    );
  }

  const webhookBase = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.CRON_SECRET;
  if (webhookBase && webhookSecret) {
    try {
      await tgApi(token.trim(), "setWebhook", {
        url: `${webhookBase}/api/telegram/webhook`,
        secret_token: webhookSecret,
        allowed_updates: ["message"],
      });
    } catch {
      /* webhook optional at first save */
    }
  }

  const { data, error } = await supabase
    .from("app_settings")
    .update({
      telegram_bot_token: token.trim(),
      telegram_bot_username: me.username ?? null,
    })
    .eq("id", 1)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({
    settings: {
      ...data,
      has_telegram_token: true,
      telegram_bot_token: "***",
    },
  });
}
