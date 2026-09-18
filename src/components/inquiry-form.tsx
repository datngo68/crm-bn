"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  AutoComplete,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Typography,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { createClient } from "@/lib/supabase/client";
import type { Inquiry, InquiryCurrency, Vendor } from "@/lib/types";
import { STATUSES } from "@/lib/types";
import { addDaysISO, todayISO } from "@/lib/utils";

type Props = {
  vendors: Vendor[];
  inquiry?: Inquiry;
  defaultVendorId?: string;
  defaultOwner: string;
  defaultFollowUpDays: number;
};

type ItemValue = {
  brand?: string;
  rbo_code?: string;
  quantity?: number;
  price?: number;
  currency?: InquiryCurrency;
  incoterm?: string;
};

type FormValues = {
  vendor_id: string;
  received_date: Dayjs;
  new_existing: "New" | "Existing";
  status: (typeof STATUSES)[number];
  status_reason?: string;
  quoted_date?: Dayjs | null;
  first_order_date_plan?: Dayjs | null;
  follow_up_date?: Dayjs | null;
  next_follow_up_date?: Dayjs | null;
  action_plan?: string;
  items: ItemValue[];
};

function dateValue(value?: string | null) {
  return value ? dayjs(value) : null;
}

const incoterms = ["EXW", "DTD", "FOB"];

export function InquiryForm({
  vendors: initialVendors,
  inquiry,
  defaultVendorId,
  defaultFollowUpDays,
}: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [vendors, setVendors] = useState(initialVendors);
  const [vendorSearch, setVendorSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const status = Form.useWatch("status", form);

  useEffect(() => {
    if (status === "Quoted" && !form.getFieldValue("quoted_date")) {
      form.setFieldValue("quoted_date", dayjs());
    }
    if (status === "1st Order Plan" && !form.getFieldValue("first_order_date_plan")) {
      form.setFieldValue("first_order_date_plan", dayjs());
    }
  }, [form, status]);

  async function createVendor(name: string) {
    const normalized = name.trim();
    if (!normalized) return;
    const existing = vendors.find((vendor) => vendor.name.toLowerCase() === normalized.toLowerCase());
    if (existing) {
      form.setFieldValue("vendor_id", existing.id);
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase.from("vendors").insert({ name: normalized }).select("*").single();
    if (error) return message.error(error.message);
    setVendors((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
    form.setFieldValue("vendor_id", data.id);
  }

  async function onFinish(values: FormValues) {
    const items = (values.items ?? []).filter(
      (item) => item.brand || item.rbo_code || item.quantity != null || item.price != null,
    );
    if (!items.length) return message.error("Thêm ít nhất một dòng sản phẩm");
    setSaving(true);
    const supabase = createClient();
    const first = items[0];
    const payload = {
      vendor_id: values.vendor_id,
      received_date: values.received_date.format("YYYY-MM-DD"),
      new_existing: values.new_existing,
      item_name: first.rbo_code || first.brand || "Multiple items",
      item_code: first.rbo_code || null,
      brand: first.brand || null,
      monthly_projection: first.quantity ?? null,
      unit_price_usd: first.currency === "USD" ? first.price ?? null : null,
      estimated_amount: first.currency === "USD" && first.quantity != null && first.price != null
        ? Number(first.quantity) * Number(first.price)
        : null,
      status: values.status,
      status_reason: values.status_reason || null,
      quoted_date: values.quoted_date?.format("YYYY-MM-DD") ?? null,
      first_order_date_plan: values.first_order_date_plan?.format("YYYY-MM-DD") ?? null,
      follow_up_date: values.follow_up_date?.format("YYYY-MM-DD") ?? null,
      next_follow_up_date: values.next_follow_up_date?.format("YYYY-MM-DD") ?? null,
      action_plan: values.action_plan || null,
    };

    const query = inquiry
      ? supabase.from("inquiries").update(payload).eq("id", inquiry.id).select("id").single()
      : supabase.from("inquiries").insert(payload).select("id").single();
    const { data, error } = await query;
    if (error || !data) {
      setSaving(false);
      return message.error(error?.message ?? "Không thể lưu inquiry");
    }

    const inquiryId = data.id;
    if (inquiry) {
      const { error: deleteError } = await supabase.from("inquiry_items").delete().eq("inquiry_id", inquiryId);
      if (deleteError) {
        setSaving(false);
        return message.error(deleteError.message);
      }
    }
    const { error: itemError } = await supabase.from("inquiry_items").insert(
      items.map((item, index) => ({
        inquiry_id: inquiryId,
        sort_order: index,
        brand: item.brand || null,
        rbo_code: item.rbo_code || null,
        quantity: item.quantity ?? null,
        price: item.price ?? null,
        currency: item.currency ?? "USD",
        incoterm: item.incoterm || null,
      })),
    );
    setSaving(false);
    if (itemError) return message.error(itemError.message);
    message.success(inquiry ? "Đã cập nhật" : "Đã tạo inquiry");
    router.push(inquiry ? `/inquiries/${inquiryId}` : "/inquiries");
    router.refresh();
  }

  const initialItems: ItemValue[] = inquiry?.inquiry_items?.length
    ? inquiry.inquiry_items.map((item) => ({
        brand: item.brand ?? undefined,
        rbo_code: item.rbo_code ?? undefined,
        quantity: item.quantity ?? undefined,
        price: item.price ?? undefined,
        currency: item.currency,
        incoterm: item.incoterm ?? undefined,
      }))
    : [{ brand: inquiry?.brand ?? undefined, rbo_code: inquiry?.item_code ?? undefined, quantity: inquiry?.monthly_projection ?? undefined, price: inquiry?.unit_price_usd ?? undefined, currency: "USD" }];

  return (
    <Form<FormValues>
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        vendor_id: inquiry?.vendor_id ?? defaultVendorId,
        received_date: dateValue(inquiry?.received_date) ?? dayjs(todayISO()),
        new_existing: inquiry?.new_existing ?? "New",
        status: inquiry?.status ?? "Pending quotation",
        status_reason: inquiry?.status_reason ?? undefined,
        quoted_date: dateValue(inquiry?.quoted_date),
        first_order_date_plan: dateValue(inquiry?.first_order_date_plan),
        follow_up_date: dateValue(inquiry?.follow_up_date),
        next_follow_up_date: dateValue(inquiry?.next_follow_up_date) ?? dayjs(addDaysISO(defaultFollowUpDays)),
        action_plan: inquiry?.action_plan ?? undefined,
        items: initialItems,
      }}
    >
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <Card title="Vendor & trạng thái">
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item label="Vendor" name="vendor_id" rules={[{ required: true, message: "Chọn vendor" }]}>
                <Select
                  showSearch
                  allowClear
                  optionFilterProp="label"
                  searchValue={vendorSearch}
                  onSearch={setVendorSearch}
                  onSelect={(value) => setVendorSearch(vendors.find((v) => v.id === value)?.name ?? "")}
                  options={[
                    ...vendors.map((v) => ({ value: v.id, label: v.name })),
                    ...(vendorSearch.trim() && !vendors.some((v) => v.name.toLowerCase() === vendorSearch.trim().toLowerCase())
                      ? [{ value: `__new__${vendorSearch.trim()}`, label: `Tạo vendor mới: ${vendorSearch.trim()}` }]
                      : []),
                  ]}
                  onChange={(value) => {
                    if (typeof value === "string" && value.startsWith("__new__")) {
                      void createVendor(value.slice("__new__".length));
                    }
                  }}
                />
              </Form.Item>
              <Form.Item noStyle shouldUpdate={(prev, current) => prev.vendor_id !== current.vendor_id}>
                {() => null}
              </Form.Item>
            </Col>
            <Col xs={12} md={6}><Form.Item label="Ngày nhận" name="received_date" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label="New / Existing" name="new_existing"><Select options={[{ value: "New" }, { value: "Existing" }]} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item label="Status" name="status"><Select options={STATUSES.map((value) => ({ value, label: value }))} /></Form.Item></Col>
            {(status === "Pending quotation" || status === "Cancel") && <Col xs={24} md={16}><Form.Item label="Lý do" name="status_reason" rules={[{ required: true, message: "Nhập lý do" }]}><Input.TextArea rows={1} /></Form.Item></Col>}
            {status === "Follow Up" && <Col xs={24} md={8}><Form.Item label="Ngày follow-up" name="follow_up_date" rules={[{ required: true, message: "Chọn ngày" }]}><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item></Col>}
          </Row>
        </Card>

        <Card title="Các mã hàng & giá cả" extra={<Typography.Text type="secondary">Thêm nhiều dòng cho cùng vendor</Typography.Text>}>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                <Table
                  size="small"
                  pagination={false}
                  scroll={{ x: 900 }}
                  dataSource={fields}
                  rowKey="key"
                  columns={[
                    { title: "Brand", render: (_, field) => <Form.Item name={[field.name, "brand"]} style={{ margin: 0 }}><Input /></Form.Item> },
                    { title: "RBO code", render: (_, field) => <Form.Item name={[field.name, "rbo_code"]} style={{ margin: 0 }}><Input /></Form.Item> },
                    { title: "Quantity order/forecast", render: (_, field) => <Form.Item name={[field.name, "quantity"]} style={{ margin: 0 }}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item> },
                    { title: "Price", render: (_, field) => <Form.Item name={[field.name, "price"]} style={{ margin: 0 }}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item> },
                    { title: "Currency", render: (_, field) => <Form.Item name={[field.name, "currency"]} style={{ margin: 0 }}><Select options={[{ value: "USD" }, { value: "VND" }]} /></Form.Item> },
                    { title: "Incoterm", render: (_, field) => <Form.Item name={[field.name, "incoterm"]} style={{ margin: 0 }}><AutoComplete options={incoterms.map((value) => ({ value }))} /></Form.Item> },
                    { title: "", render: (_, field) => <Button danger type="link" onClick={() => remove(field.name)}>Xóa</Button> },
                  ]}
                />
                <Button type="dashed" onClick={() => add({ currency: "USD" })} style={{ marginTop: 12 }}>+ Thêm dòng</Button>
              </>
            )}
          </Form.List>
        </Card>

        <Card title="Ngày & ghi chú">
          <Row gutter={[16, 0]}>
            <Col xs={12} md={6}><Form.Item label="Quoted date" name="quoted_date"><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label="1st Order Plan" name="first_order_date_plan"><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label="Next FU" name="next_follow_up_date"><DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" /></Form.Item></Col>
            <Col xs={24}><Form.Item label="Action plan" name="action_plan"><Input.TextArea rows={2} /></Form.Item></Col>
          </Row>
        </Card>
        <div style={{ display: "flex", gap: 8 }}><Button type="primary" htmlType="submit" loading={saving}>{inquiry ? "Lưu" : "Tạo inquiry"}</Button><Button onClick={() => router.back()}>Hủy</Button></div>
      </Space>
    </Form>
  );
}
