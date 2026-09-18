import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { VendorListClient } from "@/components/vendor-list-client";
import type { Inquiry, InquiryItem, Vendor } from "@/lib/types";

export default async function VendorsPage() {
  const supabase = await createClient();

  const [{ data: vendors }, { data: inquiries }] = await Promise.all([
    supabase
      .from("vendors")
      .select("*")
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("inquiries")
      .select("id, vendor_id, status, estimated_amount, inquiry_items(*)")
      .is("archived_at", null),
  ]);

  const stats: Record<
    string,
    { total: number; pending: number; ordered: number; amount: number; items: InquiryItem[] }
  > = {};
  for (const i of (inquiries ?? []) as Pick<
    Inquiry,
    "vendor_id" | "status" | "estimated_amount"
  >[]) {
    const cur = stats[i.vendor_id] ?? {
      total: 0,
      pending: 0,
      ordered: 0,
      amount: 0,
      items: [],
    };
    cur.total += 1;
    if (i.status === "Pending quotation" || i.status === "Follow Up") cur.pending += 1;
    if (i.status === "Ordered") cur.ordered += 1;
    cur.amount += Number(i.estimated_amount ?? 0);
    cur.items.push(...((i as Inquiry & { inquiry_items?: InquiryItem[] }).inquiry_items ?? []));
    stats[i.vendor_id] = cur;
  }

  return (
    <Suspense fallback={null}>
      <VendorListClient vendors={(vendors ?? []) as Vendor[]} stats={stats} />
    </Suspense>
  );
}
