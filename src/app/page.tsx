import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard-client";
import type { AppSettings, Inquiry } from "@/lib/types";
import { todayISO } from "@/lib/utils";
import { followUpDateForStatus } from "@/lib/follow-up";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = todayISO();
  const monthStart = `${today.slice(0, 8)}01`;

  const base = () =>
    supabase.from("inquiries").select("id", { count: "exact", head: true }).is("archived_at", null);

  const [
    { count: pending },
    { count: overdue },
    { count: dueToday },
    { count: orderedMonth },
    { data: focusRows },
    { data: settings },
  ] = await Promise.all([
    base().in("status", ["Pending quotation", "Follow Up"]),
    base().or(`and(status.eq.Pending quotation,next_follow_up_date.lt.${today}),and(status.eq.Follow Up,follow_up_date.lt.${today})`),
    base().or(`and(status.eq.Pending quotation,next_follow_up_date.eq.${today}),and(status.eq.Follow Up,follow_up_date.eq.${today})`),
    base().eq("status", "Ordered").gte("updated_at", monthStart),
    supabase
      .from("inquiries")
      .select("id, item_name, status, follow_up_date, next_follow_up_date, last_follow_up_date, updated_at, estimated_amount, vendors(id, name)")
      .is("archived_at", null)
      .or(`and(status.eq.Pending quotation,next_follow_up_date.lte.${today}),and(status.eq.Follow Up,follow_up_date.lte.${today})`)
      .order("next_follow_up_date", { ascending: true })
      .limit(50),
    supabase.from("app_settings").select("default_follow_up_days").eq("id", 1).maybeSingle(),
  ]);

  const s = settings as AppSettings | null;

  return (
    <DashboardClient
      today={today}
      pending={pending ?? 0}
      overdue={overdue ?? 0}
      dueToday={dueToday ?? 0}
      orderedMonth={orderedMonth ?? 0}
      focus={(focusRows ?? []) as unknown as Inquiry[]}
      defaultFollowUpDays={s?.default_follow_up_days ?? 3}
    />
  );
}
