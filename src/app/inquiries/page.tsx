import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { InquiryListClient } from "@/components/inquiry-list-client";
import type { AppSettings, Inquiry, Vendor } from "@/lib/types";

export default async function InquiriesPage() {
  const supabase = await createClient();

  const [{ data: inquiries }, { data: vendors }, { data: settings }] =
    await Promise.all([
      supabase
        .from("inquiries")
        .select("*, vendors(id, name)")
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("vendors")
        .select("*")
        .is("archived_at", null)
        .order("name"),
      supabase.from("app_settings").select("*").eq("id", 1).single(),
    ]);

  const s = settings as AppSettings | null;

  return (
    <Suspense fallback={null}>
      <InquiryListClient
        inquiries={(inquiries ?? []) as Inquiry[]}
        vendors={(vendors ?? []) as Vendor[]}
        defaultOwner={s?.default_owner ?? ""}
        defaultFollowUpDays={s?.default_follow_up_days ?? 3}
      />
    </Suspense>
  );
}
