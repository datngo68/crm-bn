import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard-client";
import type { Inquiry } from "@/lib/types";
import { todayISO } from "@/lib/utils";

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
  ] = await Promise.all([
    base().eq("status", "Pending"),
    base().eq("status", "Pending").lt("next_follow_up_date", today).not("next_follow_up_date", "is", null),
    base().eq("status", "Pending").eq("next_follow_up_date", today),
    base().eq("status", "Ordered").gte("updated_at", monthStart),
    supabase
      .from("inquiries")
      .select("id, item_name, status, next_follow_up_date, estimated_amount, vendors(id, name)")
      .is("archived_at", null)
      .eq("status", "Pending")
      .lte("next_follow_up_date", today)
      .not("next_follow_up_date", "is", null)
      .order("next_follow_up_date", { ascending: true })
      .limit(8),
  ]);

  return (
    <DashboardClient
      today={today}
      pending={pending ?? 0}
      overdue={overdue ?? 0}
      dueToday={dueToday ?? 0}
      orderedMonth={orderedMonth ?? 0}
      focus={(focusRows ?? []) as unknown as Inquiry[]}
    />
  );
}
