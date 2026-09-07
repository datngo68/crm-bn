import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { VendorListClient } from "@/components/vendor-list-client";
import type { Inquiry, Vendor } from "@/lib/types";

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
      .select("id, vendor_id, status, estimated_amount")
      .is("archived_at", null),
  ]);

  const stats: Record<
    string,
    { total: number; pending: number; ordered: number; amount: number }
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
    };
    cur.total += 1;
    if (i.status === "Pending") cur.pending += 1;
    if (i.status === "Ordered") cur.ordered += 1;
    cur.amount += Number(i.estimated_amount ?? 0);
    stats[i.vendor_id] = cur;
  }

  return (
    <Suspense fallback={null}>
      <VendorListClient vendors={(vendors ?? []) as Vendor[]} stats={stats} />
    </Suspense>
  );
}
