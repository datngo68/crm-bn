import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import type { Inquiry } from "@/lib/types";
import { todayISO } from "@/lib/utils";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const vendor = url.searchParams.get("vendor");
  const owner = url.searchParams.get("owner");
  const focus = url.searchParams.get("focus");
  const q = url.searchParams.get("q")?.toLowerCase();
  const today = todayISO();

  let query = supabase
    .from("inquiries")
    .select("*, vendors(id, name)")
    .is("archived_at", null)
    .order("received_date", { ascending: false });

  if (status) query = query.eq("status", status);
  if (vendor) query = query.eq("vendor_id", vendor);
  if (owner) query = query.ilike("owner", `%${owner}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let list = (data ?? []) as Inquiry[];
  if (q) {
    list = list.filter(
      (i) =>
        i.item_name.toLowerCase().includes(q) ||
        (i.brand ?? "").toLowerCase().includes(q) ||
        (i.item_code ?? "").toLowerCase().includes(q) ||
        (i.vendors?.name ?? "").toLowerCase().includes(q),
    );
  }
  if (focus === "due") {
    list = list.filter(
      (i) =>
        i.status === "Pending" &&
        i.next_follow_up_date &&
        i.next_follow_up_date <= today,
    );
  } else if (focus === "overdue") {
    list = list.filter(
      (i) =>
        i.status === "Pending" &&
        i.next_follow_up_date &&
        i.next_follow_up_date < today,
    );
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Inquiries");
  const headers = [
    "Date of Receiving Inquiry",
    "Vendor Name",
    "New / Existing",
    "Item code",
    "Brand",
    "RBO code",
    "Item type",
    "Nominated Status",
    "Monthly Projection",
    "Unit Price (USD)",
    "Estimated Amount",
    "Quoted Date",
    "1st Order Date Plan",
    "Reason for no order",
    "Action Plan in detail",
    "Status",
    "Last Follow-up Date",
    "Next Follow-up Date",
    "Owner",
  ];
  ws.addRow(headers);
  ws.getRow(1).font = { bold: true };

  for (const i of list) {
    ws.addRow([
      i.received_date,
      i.vendors?.name ?? "",
      i.new_existing,
      i.item_name,
      i.brand,
      i.item_code,
      i.category,
      i.nominated_status,
      i.monthly_projection,
      i.unit_price_usd,
      i.estimated_amount,
      i.quoted_date,
      i.first_order_date_plan,
      i.reason_no_order,
      i.action_plan,
      i.status,
      i.last_follow_up_date,
      i.next_follow_up_date,
      i.owner,
    ]);
  }

  ws.columns.forEach((col) => {
    col.width = 18;
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="inquiries-${today}.xlsx"`,
    },
  });
}
