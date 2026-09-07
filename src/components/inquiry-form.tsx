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
  Typography,
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

const sectionTitle = (t: string, hint?: string) => (
  <div>
    <Typography.Text strong style={{ fontSize: 14 }}>
      {t}
    </Typography.Text>
    {hint ? (
      <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, fontWeight: 400 }}>
        {hint}
      </Typography.Text>
    ) : null}
  </div>
);

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
    const { data, error } = await supabase
      .from("vendors")
      .insert({ name })
      .select("*")
      .single();
    if (error) {
      message.error(error.message);
      return;
    }
    setVendors((v) => [...v, data].sort((a, b) => a.name.localeCompare(b.name)));
    form.setFieldValue("vendor_id", data.id);
    setNewVendorName("");
    message.success("Đã thêm vendor");
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
      item_name: values.item_name,
      category: values.category || null,
      nominated_status: values.nominated_status || null,
      monthly_projection: values.monthly_projection ?? null,
      unit_price_usd: values.unit_price_usd ?? null,
      estimated_amount:
        values.estimated_amount ?? autoAmount ?? null,
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

    const q = isEdit
      ? supabase.from("inquiries").update(payload).eq("id", inquiry!.id).select("id").single()
      : supabase.from("inquiries").insert(payload).select("id").single();

    const { data, error } = await q;
    setSaving(false);
    if (error) {
      message.error(error.message);
      return;
    }
    message.success(isEdit ? "Đã cập nhật" : "Đã tạo inquiry");
    router.push(`/inquiries/${data.id}`);
    router.refresh();
  }

  const cardStyle = { borderRadius: 10 };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      requiredMark="optional"
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
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Card title={sectionTitle("Khách & trạng thái")} style={cardStyle}>
          <Row gutter={[16, 0]}>
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
                  placeholder="Hoặc tạo vendor mới"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                  onPressEnter={createVendor}
                />
                <Button onClick={createVendor}>Thêm</Button>
              </Space.Compact>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="Ngày nhận" name="received_date" rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="New / Existing" name="new_existing">
                <Select
                  options={[
                    { value: "New", label: "New" },
                    { value: "Existing", label: "Existing" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Status" name="status" rules={[{ required: true }]}>
                <Select options={STATUSES.map((s) => ({ value: s, label: s }))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Owner" name="owner">
                <Input placeholder="Người phụ trách" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Nominated" name="nominated_status">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title={sectionTitle("Sản phẩm")} style={cardStyle}>
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Item"
                name="item_name"
                rules={[{ required: true, message: "Nhập tên item" }]}
              >
                <Input placeholder="Tên hàng" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="Item Code" name="item_code">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="Brand" name="brand">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Category" name="category">
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card
          title={sectionTitle(
            "Giá & kế hoạch",
            autoAmount != null ? `Gợi ý amount: $${autoAmount}` : undefined,
          )}
          style={cardStyle}
        >
          <Row gutter={[16, 0]}>
            <Col xs={12} md={6}>
              <Form.Item label="Monthly qty" name="monthly_projection">
                <InputNumber style={{ width: "100%" }} min={0} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="Unit (USD)" name="unit_price_usd">
                <InputNumber style={{ width: "100%" }} min={0} prefix="$" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="Est. Amount" name="estimated_amount">
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  prefix="$"
                  placeholder={autoAmount?.toString()}
                />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="Quoted" name="quoted_date">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="1st Order plan" name="first_order_date_plan">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="Last FU" name="last_follow_up_date">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item label="Next FU" name="next_follow_up_date">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card title={sectionTitle("Ghi chú theo dõi")} style={cardStyle}>
          <Form.Item label="Lý do chưa đặt" name="reason_no_order">
            <Input.TextArea rows={2} placeholder="Ngắn gọn" />
          </Form.Item>
          <Form.Item label="Action plan" name="action_plan" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={3} placeholder="Bước tiếp theo" />
          </Form.Item>
        </Card>

        <div
          style={{
            position: "sticky",
            bottom: 0,
            zIndex: 10,
            display: "flex",
            gap: 8,
            padding: "12px 0",
            background: "linear-gradient(transparent, #F8FAFC 30%)",
          }}
        >
          <Button type="primary" htmlType="submit" loading={saving}>
            {isEdit ? "Lưu" : "Tạo inquiry"}
          </Button>
          <Button onClick={() => router.back()}>Hủy</Button>
        </div>
      </Space>
    </Form>
  );
}
