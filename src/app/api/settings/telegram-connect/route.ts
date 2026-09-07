import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomConnectCode } from "@/lib/telegram";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: current } = await supabase
    .from("app_settings")
    .select("telegram_bot_token, telegram_bot_username")
    .eq("id", 1)
    .single();

  if (!current?.telegram_bot_token) {
    return NextResponse.json(
      { error: "Chưa có bot token — lưu token trước" },
      { status: 400 },
    );
  }
  if (!current.telegram_bot_username) {
    return NextResponse.json(
      { error: "Bot chưa có username" },
      { status: 400 },
    );
  }

  const code = randomConnectCode();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("app_settings")
    .update({
      telegram_connect_code: code,
      telegram_connect_expires_at: expires,
    })
    .eq("id", 1)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const url = `https://t.me/${current.telegram_bot_username}?start=${code}`;
  return NextResponse.json({
    settings: {
      ...data,
      has_telegram_token: Boolean(data.telegram_bot_token),
      telegram_bot_token: data.telegram_bot_token ? "***" : null,
    },
    url,
    code,
  });
}
