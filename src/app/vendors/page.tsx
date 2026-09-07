import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { VendorListClient } from "@/components/vendor-list-client";
import type { Inquiry, Vendor } from "@/lib/types";

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function VendorsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const showArchived = sp.archived === "1";
  const supabase = await createClient();

  let vendorQuery = supabase.from("vendors").select("*").order("name");
  vendorQuery = showArchived
    ? vendorQuery.not("archived_at", "is", null)
    : vendorQuery.is("archived_at", null);

  const [{ data: vendors }, { data: inquiries }] = await Promise.all([
    vendorQuery,
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
      <VendorListClient
        vendors={(vendors ?? []) as Vendor[]}
        stats={stats}
      />
    </Suspense>
  );
}
