import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InquiryForm } from "@/components/inquiry-form";
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
      supabase.from("vendors").select("*").order("name"),
      supabase.from("app_settings").select("*").eq("id", 1).single(),
    ]);

  if (!inquiry) notFound();
  const s = settings as AppSettings | null;
  const row = inquiry as Inquiry;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>
        {row.vendors?.name} · {row.item_name}
      </h1>
      <p style={{ color: "#64748b", marginBottom: 16 }}>Chỉnh sửa inquiry</p>
      <InquiryForm
        inquiry={row}
        vendors={(vendors ?? []) as Vendor[]}
        defaultOwner={s?.default_owner ?? ""}
        defaultFollowUpDays={s?.default_follow_up_days ?? 3}
      />
    </div>
  );
}
