"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { createClient } from "@/lib/supabase/client";
import type { Inquiry, InquiryStatus, NewExisting, Vendor } from "@/lib/types";
import { STATUSES } from "@/lib/types";
import { addDaysISO, todayISO } from "@/lib/utils";

type Props = {
  vendors: Vendor[];
  inquiry?: Inquiry;
  defaultVendorId?: string;
  defaultOwner: string;
  defaultFollowUpDays: number;
};

type FormValues = {
  vendor_id: string;
  received_date: Dayjs;
  new_existing: NewExisting;
  item_code?: string;
  brand?: string;
  item_name: string;
  category?: string;
  nominated_status?: string;
  monthly_projection?: number | null;
  unit_price_usd?: number | null;
  estimated_amount?: number | null;
  quoted_date?: Dayjs | null;
  first_order_date_plan?: Dayjs | null;
  reason_no_order?: string;
  action_plan?: string;
  status: InquiryStatus;
  last_follow_up_date?: Dayjs | null;
  next_follow_up_date?: Dayjs | null;
  owner?: string;
};

function d(v?: string | null) {
  return v ? dayjs(v) : null;
}

export function InquiryForm({
  vendors: initialVendors,
  inquiry,
  defaultVendorId,
  defaultOwner,
  defaultFollowUpDays,
}: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [vendors, setVendors] = useState(initialVendors);
  const [newVendorName, setNewVendorName] = useState("");
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(inquiry);

  const monthly = Form.useWatch("monthly_projection", form);
  const unit = Form.useWatch("unit_price_usd", form);
  const autoAmount = useMemo(() => {
    if (monthly == null || unit == null) return null;
    return +(Number(monthly) * Number(unit)).toFixed(2);
  }, [monthly, unit]);

  async function createVendor() {
    const name = newVendorName.trim();
    if (!name) return;
    const supabase = createClient();
    const newExisting = form.getFieldValue("new_existing") as NewExisting;
    const { data, error } = await supabase
      .from("vendors")
      .insert({ name, is_new: newExisting !== "Existing" })
      .select("*")
      .single();
    if (error) {
      message.error(error.message);
      return;
    }
    setVendors((v) => [...v, data].sort((a, b) => a.name.localeCompare(b.name)));
    form.setFieldValue("vendor_id", data.id);
    setNewVendorName("");
    message.success("Đã tạo vendor");
  }

  async function onFinish(values: FormValues) {
    setSaving(true);
    const supabase = createClient();
    const payload = {
      vendor_id: values.vendor_id,
      received_date: values.received_date.format("YYYY-MM-DD"),
      new_existing: values.new_existing,
      item_code: values.item_code || null,
      brand: values.brand || null,
      item_name: values.item_name.trim(),
      category: values.category || null,
      nominated_status: values.nominated_status || null,
      monthly_projection: values.monthly_projection ?? null,
      unit_price_usd: values.unit_price_usd ?? null,
      estimated_amount: values.estimated_amount ?? autoAmount ?? null,
      quoted_date: values.quoted_date?.format("YYYY-MM-DD") ?? null,
      first_order_date_plan:
        values.first_order_date_plan?.format("YYYY-MM-DD") ?? null,
      reason_no_order: values.reason_no_order || null,
      action_plan: values.action_plan || null,
      status: values.status,
      last_follow_up_date:
        values.last_follow_up_date?.format("YYYY-MM-DD") ?? null,
      next_follow_up_date:
        values.next_follow_up_date?.format("YYYY-MM-DD") ?? null,
      owner: values.owner || null,
    };

    const { data, error } = isEdit
      ? await supabase
          .from("inquiries")
          .update(payload)
          .eq("id", inquiry!.id)
          .select("id")
          .single()
      : await supabase.from("inquiries").insert(payload).select("id").single();

    setSaving(false);
    if (error) {
      message.error(error.message);
      return;
    }
    message.success(isEdit ? "Đã cập nhật" : "Đã tạo inquiry");
    router.push(`/inquiries/${data.id}`);
    router.refresh();
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        vendor_id: inquiry?.vendor_id ?? defaultVendorId,
        received_date: d(inquiry?.received_date) ?? dayjs(todayISO()),
        new_existing: inquiry?.new_existing ?? "New",
        item_code: inquiry?.item_code ?? undefined,
        brand: inquiry?.brand ?? undefined,
        item_name: inquiry?.item_name ?? undefined,
        category: inquiry?.category ?? undefined,
        nominated_status: inquiry?.nominated_status ?? undefined,
        monthly_projection: inquiry?.monthly_projection ?? undefined,
        unit_price_usd: inquiry?.unit_price_usd ?? undefined,
        estimated_amount: inquiry?.estimated_amount ?? undefined,
        quoted_date: d(inquiry?.quoted_date),
        first_order_date_plan: d(inquiry?.first_order_date_plan),
        reason_no_order: inquiry?.reason_no_order ?? undefined,
        action_plan: inquiry?.action_plan ?? undefined,
        status: inquiry?.status ?? "Pending",
        last_follow_up_date: d(inquiry?.last_follow_up_date),
        next_follow_up_date:
          d(inquiry?.next_follow_up_date) ?? dayjs(addDaysISO(defaultFollowUpDays)),
        owner: inquiry?.owner ?? defaultOwner,
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Card title="Thông tin chính">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Vendor"
                name="vendor_id"
                rules={[{ required: true, message: "Chọn vendor" }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={vendors.map((v) => ({ value: v.id, label: v.name }))}
                  placeholder="Chọn vendor"
                />
              </Form.Item>
              <Space.Compact style={{ width: "100%", marginTop: -8, marginBottom: 16 }}>
                <Input
                  placeholder="Tạo vendor mới…"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                />
                <Button onClick={createVendor}>Thêm</Button>
              </Space.Compact>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Date of Receiving Inquiry"
                name="received_date"
                rules={[{ required: true }]}
              >
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="New / Existing" name="new_existing">
                <Select
                  options={[
                    { value: "New", label: "New" },
                    { value: "Existing", label: "Existing" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Status" name="status" rules={[{ required: true }]}>
                <Select options={STATUSES.map((s) => ({ value: s, label: s }))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Item"
                name="item_name"
                rules={[{ required: true, message: "Nhập item" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Item Code" name="item_code">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Brand" name="brand">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Category" name="category">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Nominated Status" name="nominated_status">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Owner" name="owner">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Giá & kế hoạch">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Monthly Projection" name="monthly_projection">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Unit Price (USD)" name="unit_price_usd">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label={`Estimated Amount${autoAmount != null ? ` (gợi ý ${autoAmount})` : ""}`}
                name="estimated_amount"
              >
                <InputNumber style={{ width: "100%" }} placeholder={autoAmount?.toString()} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Quoted Date" name="quoted_date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="1st Order Date Plan" name="first_order_date_plan">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Last Follow-up Date" name="last_follow_up_date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Next Follow-up Date" name="next_follow_up_date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title="Ghi chú">
          <Form.Item label="Reason for not sending order" name="reason_no_order">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Action Plan in detail" name="action_plan">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Card>

        <Space>
          <Button type="primary" htmlType="submit" loading={saving}>
            {isEdit ? "Lưu thay đổi" : "Tạo inquiry"}
          </Button>
          <Button onClick={() => router.back()}>Hủy</Button>
        </Space>
      </Space>
    </Form>
  );
}
