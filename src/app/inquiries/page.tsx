import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { InquiryListClient } from "@/components/inquiry-list-client";
import type { AppSettings, Inquiry, Vendor } from "@/lib/types";
import { todayISO } from "@/lib/utils";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function InquiriesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const supabase = await createClient();
  const today = todayISO();

  const [{ data: vendors }, { data: settings }] = await Promise.all([
    supabase.from("vendors").select("*").is("archived_at", null).order("name"),
    supabase.from("app_settings").select("*").eq("id", 1).single(),
  ]);

  let query = supabase
    .from("inquiries")
    .select("*, vendors(id, name)")
    .order("created_at", { ascending: false });

  // Default: hide archived. ?archived=1 shows only archived.
  if (sp.archived === "1") query = query.not("archived_at", "is", null);
  else query = query.is("archived_at", null);

  if (sp.status) query = query.eq("status", sp.status);
  if (sp.vendor) query = query.eq("vendor_id", sp.vendor);
  if (sp.owner) query = query.ilike("owner", `%${sp.owner}%`);

  const { data, error } = await query;
  if (error) {
    console.error("inquiries list", error.message);
  }
  let list = (data ?? []) as Inquiry[];

  if (sp.q) {
    const q = sp.q.toLowerCase();
    list = list.filter(
      (i) =>
        i.item_name.toLowerCase().includes(q) ||
        (i.brand ?? "").toLowerCase().includes(q) ||
        (i.item_code ?? "").toLowerCase().includes(q) ||
        (i.vendors?.name ?? "").toLowerCase().includes(q),
    );
  }

  if (sp.focus === "due") {
    list = list.filter(
      (i) =>
        i.status === "Pending" &&
        i.next_follow_up_date &&
        i.next_follow_up_date <= today,
    );
  } else if (sp.focus === "overdue") {
    list = list.filter(
      (i) =>
        i.status === "Pending" &&
        i.next_follow_up_date &&
        i.next_follow_up_date < today,
    );
  }

  const s = settings as AppSettings | null;

  return (
    <Suspense fallback={null}>
      <InquiryListClient
        inquiries={list}
        vendors={(vendors ?? []) as Vendor[]}
        defaultOwner={s?.default_owner ?? ""}
        defaultFollowUpDays={s?.default_follow_up_days ?? 3}
      />
    </Suspense>
  );
}
