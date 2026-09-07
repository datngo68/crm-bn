import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard-client";
import type { Inquiry } from "@/lib/types";
import { todayISO } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = todayISO();
  const monthStart = today.slice(0, 8) + "01";

  const { data: inquiries } = await supabase
    .from("inquiries")
    .select("*, vendors(id, name)")
    .order("next_follow_up_date", { ascending: true, nullsFirst: false });

  const list = (inquiries ?? []) as Inquiry[];
  const pending = list.filter((i) => i.status === "Pending");
  const overdue = pending.filter(
    (i) => i.next_follow_up_date && i.next_follow_up_date < today,
  );
  const dueToday = pending.filter((i) => i.next_follow_up_date === today);
  const orderedMonth = list.filter(
    (i) =>
      i.status === "Ordered" &&
      i.updated_at &&
      i.updated_at.slice(0, 10) >= monthStart,
  );

  return (
    <DashboardClient
      today={today}
      pending={pending.length}
      overdue={overdue.length}
      dueToday={dueToday.length}
      orderedMonth={orderedMonth.length}
      focus={[...overdue, ...dueToday].slice(0, 8)}
    />
  );
}
