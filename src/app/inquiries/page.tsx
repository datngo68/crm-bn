import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { InquiryListClient } from "@/components/inquiry-list-client";
import type { Inquiry, Vendor } from "@/lib/types";
import { todayISO } from "@/lib/utils";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function InquiriesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const supabase = await createClient();
  const today = todayISO();

  const { data: vendors } = await supabase
    .from("vendors")
    .select("*")
    .order("name");

  let query = supabase
    .from("inquiries")
    .select("*, vendors(id, name)")
    .order("received_date", { ascending: false });

  if (sp.status) query = query.eq("status", sp.status);
  if (sp.vendor) query = query.eq("vendor_id", sp.vendor);
  if (sp.owner) query = query.ilike("owner", `%${sp.owner}%`);

  const { data } = await query;
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

  return (
    <Suspense fallback={null}>
      <InquiryListClient
        inquiries={list}
        vendors={(vendors ?? []) as Vendor[]}
      />
    </Suspense>
  );
}
