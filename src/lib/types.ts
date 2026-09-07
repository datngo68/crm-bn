export type InquiryStatus = "Pending" | "Ordered" | "Lost" | "No Order";
export type NewExisting = "New" | "Existing";

export type Vendor = {
  id: string;
  name: string;
  is_new: boolean;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Inquiry = {
  id: string;
  vendor_id: string;
  received_date: string;
  new_existing: NewExisting;
  item_code: string | null;
  brand: string | null;
  item_name: string;
  category: string | null;
  nominated_status: string | null;
  monthly_projection: number | null;
  unit_price_usd: number | null;
  estimated_amount: number | null;
  quoted_date: string | null;
  first_order_date_plan: string | null;
  reason_no_order: string | null;
  action_plan: string | null;
  status: InquiryStatus;
  last_follow_up_date: string | null;
  next_follow_up_date: string | null;
  owner: string | null;
  last_reminded_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  vendors?: Pick<Vendor, "id" | "name"> | null;
};

export type AppSettings = {
  id: number;
  /** Present only on server; client gets has_telegram_token instead */
  telegram_bot_token?: string | null;
  has_telegram_token?: boolean;
  telegram_bot_username: string | null;
  telegram_chat_id: string | null;
  telegram_connected_at: string | null;
  telegram_connect_code: string | null;
  telegram_connect_expires_at: string | null;
  remind_per_item_enabled: boolean;
  remind_digest_enabled: boolean;
  digest_hour: number;
  timezone: string;
  quiet_hours_enabled: boolean;
  quiet_start: number;
  quiet_end: number;
  default_owner: string;
  default_follow_up_days: number;
  last_digest_date: string | null;
  updated_at: string;
};

export const STATUSES: InquiryStatus[] = [
  "Pending",
  "Ordered",
  "Lost",
  "No Order",
];
