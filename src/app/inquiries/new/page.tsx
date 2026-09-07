import { createClient } from "@/lib/supabase/server";
import { InquiryForm } from "@/components/inquiry-form";
import { PageHeader } from "@/components/page-header";
import type { AppSettings, Vendor } from "@/lib/types";

type Props = { searchParams: Promise<{ vendor?: string }> };

export default async function NewInquiryPage({ searchParams }: Props) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: vendors }, { data: settings }] = await Promise.all([
    supabase.from("vendors").select("*").order("name"),
    supabase.from("app_settings").select("*").eq("id", 1).single(),
  ]);
  const s = settings as AppSettings | null;

  return (
    <div>
      <PageHeader
        title="Inquiry mới"
        description="Nhập nhanh, hệ thống nhắc follow-up sau"
      />
      <InquiryForm
        vendors={(vendors ?? []) as Vendor[]}
        defaultVendorId={sp.vendor}
        defaultOwner={s?.default_owner ?? ""}
        defaultFollowUpDays={s?.default_follow_up_days ?? 3}
      />
    </div>
  );
}
