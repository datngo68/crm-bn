import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VendorDetailClient } from "@/components/vendor-detail-client";
import type { Inquiry, Vendor } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export default async function VendorDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: vendor }, { data: inquiries }] = await Promise.all([
    supabase.from("vendors").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("inquiries")
      .select("*")
      .eq("vendor_id", id)
      .is("archived_at", null)
      .order("received_date", { ascending: false }),
  ]);

  if (!vendor) notFound();

  return (
    <VendorDetailClient
      vendor={vendor as Vendor}
      inquiries={(inquiries ?? []) as Inquiry[]}
    />
  );
}
