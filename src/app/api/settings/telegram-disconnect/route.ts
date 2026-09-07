import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("app_settings")
    .update({
      telegram_chat_id: null,
      telegram_connected_at: null,
      telegram_connect_code: null,
      telegram_connect_expires_at: null,
    })
    .eq("id", 1)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({
    settings: {
      ...data,
      has_telegram_token: Boolean(data.telegram_bot_token),
      telegram_bot_token: data.telegram_bot_token ? "***" : null,
    },
  });
}
