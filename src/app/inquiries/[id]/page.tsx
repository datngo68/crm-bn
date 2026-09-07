import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InquiryForm } from "@/components/inquiry-form";
import { PageHeader } from "@/components/page-header";
import type { AppSettings, Inquiry, Vendor } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export default async function InquiryDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: inquiry }, { data: vendors }, { data: settings }] =
    await Promise.all([
      supabase
        .from("inquiries")
        .select("*, vendors(id, name)")
        .eq("id", id)
        .maybeSingle(),
      supabase.from("vendors").select("*").is("archived_at", null).order("name"),
      supabase.from("app_settings").select("*").eq("id", 1).single(),
    ]);

  if (!inquiry) notFound();
  const s = settings as AppSettings | null;
  const row = inquiry as Inquiry;

  return (
    <div>
      <PageHeader
        title={`${row.vendors?.name ?? "Inquiry"} · ${row.item_name}`}
        description="Chỉnh sửa inquiry"
      />
      <InquiryForm
        inquiry={row}
        vendors={(vendors ?? []) as Vendor[]}
        defaultOwner={s?.default_owner ?? ""}
        defaultFollowUpDays={s?.default_follow_up_days ?? 3}
      />
    </div>
  );
}
