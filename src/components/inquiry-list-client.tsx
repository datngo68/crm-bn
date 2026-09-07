"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  App,
  Button,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Grid,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { createClient } from "@/lib/supabase/client";
import type { Inquiry, InquiryStatus, NewExisting, Vendor } from "@/lib/types";
import { NOMINATED_STATUSES, STATUSES } from "@/lib/types";
import { addDaysISO, formatUsd, todayISO } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { statusTagColor } from "@/lib/theme";

type Props = {
  inquiries: Inquiry[];
  vendors: Vendor[];
  defaultOwner: string;
  defaultFollowUpDays: number;
};

type QuickEdit = {
  status: InquiryStatus;
  next_follow_up_date: string | null;
  estimated_amount: number | null;
  owner: string | null;
  item_name: string;
  brand?: string | null;
  item_code?: string | null;
  reason_no_order?: string | null;
};

type QuickCreate = {
  vendor_id: string;
  item_name: string;
  brand?: string;
  item_code?: string;
  category?: string;
  nominated_status?: string;
  status: InquiryStatus;
  new_existing: NewExisting;
  received_date: string;
  next_follow_up_date: string | null;
  estimated_amount?: number | null;
  unit_price_usd?: number | null;
  monthly_projection?: number | null;
  owner?: string;
  reason_no_order?: string;
};

const { useBreakpoint } = Grid;

export function InquiryListClient({
  inquiries: initial,
  vendors: initialVendors,
  defaultOwner,
  defaultFollowUpDays,
}: Props) {
  const { message } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [rows, setRows] = useState(initial);
  const [vendors, setVendors] = useState(initialVendors);
  const [prevInitial, setPrevInitial] = useState(initial);
  const [prevVendors, setPrevVendors] = useState(initialVendors);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setRows(initial);
  }
  if (initialVendors !== prevVendors) {
    setPrevVendors(initialVendors);
    setVendors(initialVendors);
  }

  const searchParams = useSearchParams();
  const urlFilters = searchParams.toString();
  const urlStatus = STATUSES.find((s) => s === searchParams.get("status"));
  const urlFocus = ["due", "overdue"].find((f) => f === searchParams.get("focus"));
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState<string | undefined>(urlStatus);
  const [vendorId, setVendorId] = useState<string | undefined>(searchParams.get("vendor") || undefined);
  const [focus, setFocus] = useState<string | undefined>(urlFocus);
  const [prevUrlFilters, setPrevUrlFilters] = useState(urlFilters);
  // ponytail: URL → local filters only; add URL writes when shareable edits are needed.
  if (urlFilters !== prevUrlFilters) {
    setPrevUrlFilters(urlFilters);
    setQ(searchParams.get("q") ?? "");
    setStatus(urlStatus);
    setVendorId(searchParams.get("vendor") || undefined);
    setFocus(urlFocus);
  }
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const [editRow, setEditRow] = useState<Inquiry | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [editForm] = Form.useForm<QuickEdit>();
  const [createForm] = Form.useForm<QuickCreate>();
  const editStatus = Form.useWatch("status", editForm);
  const createStatus = Form.useWatch("status", createForm);

  const today = todayISO();

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = rows;
    if (needle) {
      list = list.filter(
        (i) =>
          i.item_name.toLowerCase().includes(needle) ||
          (i.brand ?? "").toLowerCase().includes(needle) ||
          (i.item_code ?? "").toLowerCase().includes(needle) ||
          (i.category ?? "").toLowerCase().includes(needle) ||
          (i.owner ?? "").toLowerCase().includes(needle) ||
          (i.vendors?.name ?? "").toLowerCase().includes(needle),
      );
    }
    if (status) list = list.filter((i) => i.status === status);
    if (vendorId) list = list.filter((i) => i.vendor_id === vendorId);
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
    const sorted = [...list].sort((a, b) => {
      const av = a.created_at;
      const bv = b.created_at;
      return sort === "newest" ? (av < bv ? 1 : -1) : av < bv ? -1 : 1;
    });
    return sorted;
  }, [rows, q, status, vendorId, focus, sort, today]);

  const hasFilters = Boolean(q || status || vendorId || focus);

  function clearFilters() {
    setQ("");
    setStatus(undefined);
    setVendorId(undefined);
    setFocus(undefined);
  }

  const patch = useCallback(
    async (id: string, data: Partial<QuickEdit>) => {
      setSaving(true);
      const supabase = createClient();
      const { error } = await supabase.from("inquiries").update(data).eq("id", id);
      setSaving(false);
      if (error) {
        message.error(error.message);
        return false;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
      return true;
    },
    [message],
  );

  function openCreate() {
    setCreating(true);
    createForm.setFieldsValue({
      vendor_id: vendors[0]?.id,
      status: "Pending",
      new_existing: "New",
      received_date: todayISO(),
      next_follow_up_date: addDaysISO(defaultFollowUpDays),
      owner: defaultOwner || undefined,
      item_name: undefined,
      brand: undefined,
      item_code: undefined,
      category: undefined,
      nominated_status: undefined,
      estimated_amount: undefined,
      reason_no_order: undefined,
    });
  }

  function openEdit(row: Inquiry) {
    setEditRow(row);
    editForm.setFieldsValue({
      status: row.status,
      next_follow_up_date: row.next_follow_up_date,
      estimated_amount: row.estimated_amount,
      owner: row.owner,
      item_name: row.item_name,
      brand: row.brand,
      item_code: row.item_code,
      reason_no_order: row.reason_no_order,
    });
  }

  async function createVendorInline() {
    const name = newVendorName.trim();
    if (!name) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("vendors")
      .insert({ name })
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      message.error(error.message);
      return;
    }
    setVendors((v) => [...v, data].sort((a, b) => a.name.localeCompare(b.name)));
    createForm.setFieldValue("vendor_id", data.id);
    setNewVendorName("");
    message.success("Đã thêm vendor");
  }

  async function saveCreate() {
    try {
      const values = await createForm.validateFields();
      setSaving(true);
      const supabase = createClient();
      const amount =
        values.estimated_amount ??
        (values.monthly_projection != null && values.unit_price_usd != null
          ? +(Number(values.monthly_projection) * Number(values.unit_price_usd)).toFixed(2)
          : null);

      const { data, error } = await supabase
        .from("inquiries")
        .insert({
          vendor_id: values.vendor_id,
          item_name: values.item_name.trim(),
          brand: values.brand?.trim() || null,
          item_code: values.item_code?.trim() || null,
          category: values.category?.trim() || null,
          nominated_status: values.nominated_status || null,
          status: values.status,
          new_existing: values.new_existing,
          received_date: values.received_date,
          next_follow_up_date: values.next_follow_up_date,
          estimated_amount: amount,
          unit_price_usd: values.unit_price_usd ?? null,
          monthly_projection: values.monthly_projection ?? null,
          owner: values.owner?.trim() || null,
          reason_no_order:
            values.status === "No Order"
              ? values.reason_no_order?.trim() || null
              : null,
        })
        .select("*, vendors(id, name)")
        .single();
      setSaving(false);
      if (error) {
        message.error(error.message);
        return;
      }
      const row = data as Inquiry;
      setRows((prev) => [row, ...prev.filter((r) => r.id !== row.id)]);
      setCreating(false);
      createForm.resetFields();
      clearFilters();
      setSort("newest");
      message.success("Đã tạo inquiry");
    } catch {
      /* validation */
    }
  }

  async function saveEdit() {
    if (!editRow) return;
    try {
      const values = await editForm.validateFields();
      const ok = await patch(editRow.id, {
        status: values.status,
        next_follow_up_date: values.next_follow_up_date,
        estimated_amount: values.estimated_amount,
        owner: values.owner || null,
        item_name: values.item_name,
        brand: values.brand || null,
        item_code: values.item_code || null,
        reason_no_order:
          values.status === "No Order"
            ? values.reason_no_order || null
            : null,
      });
      if (ok) {
        message.success("Đã lưu");
        setEditRow(null);
      }
    } catch {
      /* validation */
    }
  }

  const vendorMap = useMemo(
    () => Object.fromEntries(vendors.map((v) => [v.id, v.name])),
    [vendors],
  );

  const exportHref = useMemo(() => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (vendorId) p.set("vendor", vendorId);
    if (focus) p.set("focus", focus);
    if (q.trim()) p.set("q", q.trim());
    const s = p.toString();
    return `/api/export${s ? `?${s}` : ""}`;
  }, [status, vendorId, focus, q]);

  const filters = (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 16,
        padding: 12,
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 10,
      }}
    >
      <Input.Search
        allowClear
        placeholder="Tìm item code, RBO, brand, vendor…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ width: isMobile ? "100%" : 260 }}
      />
      <Select
        allowClear
        placeholder="Status"
        style={{ width: isMobile ? "48%" : 140, flex: isMobile ? 1 : undefined }}
        value={status}
        onChange={setStatus}
        options={STATUSES.map((s) => ({ value: s, label: s }))}
      />
      <Select
        allowClear
        showSearch
        optionFilterProp="label"
        placeholder="Vendor"
        style={{ width: isMobile ? "48%" : 180, flex: isMobile ? 1 : undefined }}
        value={vendorId}
        onChange={setVendorId}
        options={vendors.map((v) => ({ value: v.id, label: v.name }))}
      />
      <Select
        allowClear
        placeholder="Follow-up"
        style={{ width: isMobile ? "48%" : 180, flex: isMobile ? 1 : undefined }}
        value={focus}
        onChange={setFocus}
        options={[
          { value: "due", label: "Quá hạn / Hôm nay" },
          { value: "overdue", label: "Chỉ quá hạn" },
        ]}
      />
      <Select
        value={sort}
        style={{ width: isMobile ? "48%" : 140, flex: isMobile ? 1 : undefined }}
        onChange={setSort}
        options={[
          { value: "newest", label: "Newest" },
          { value: "oldest", label: "Oldest" },
        ]}
      />
      {hasFilters && (
        <Button type="link" onClick={clearFilters}>
          Xóa lọc
        </Button>
      )}
    </div>
  );

  const desktopColumns = [
    {
      title: "Vendor",
      width: 150,
      fixed: isMobile ? undefined : ("left" as const),
      render: (_: unknown, r: Inquiry) => (
        <button
          type="button"
          onClick={() => openEdit(r)}
          style={{
            background: "none",
            border: 0,
            padding: 0,
            fontWeight: 600,
            color: "#0F172A",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {r.vendors?.name ?? vendorMap[r.vendor_id] ?? "-"}
        </button>
      ),
    },
    {
      title: "Item code",
      dataIndex: "item_name",
      width: 180,
      ellipsis: true,
      onCell: (r: Inquiry) => ({
        record: r,
        dataIndex: "item_name" as const,
        editable: true,
        inputType: "text" as const,
        saving,
        onSave: (v: string) => patch(r.id, { item_name: v }),
      }),
    },
    {
      title: "Brand",
      dataIndex: "brand",
      width: 110,
      ellipsis: true,
      onCell: (r: Inquiry) => ({
        record: r,
        dataIndex: "brand" as const,
        editable: true,
        inputType: "text" as const,
        saving,
        onSave: (v: string) => patch(r.id, { brand: v || null }),
      }),
      render: (v: string | null) => v || "-",
    },
    {
      title: "RBO code",
      dataIndex: "item_code",
      width: 110,
      ellipsis: true,
      onCell: (r: Inquiry) => ({
        record: r,
        dataIndex: "item_code" as const,
        editable: true,
        inputType: "text" as const,
        saving,
        onSave: (v: string) => patch(r.id, { item_code: v || null }),
      }),
      render: (v: string | null) => v || "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      onCell: (r: Inquiry) => ({
        record: r,
        dataIndex: "status" as const,
        editable: true,
        inputType: "status" as const,
        saving,
        onSave: (v: InquiryStatus) => patch(r.id, { status: v }),
      }),
      render: (s: InquiryStatus) => <Tag color={statusTagColor[s]}>{s}</Tag>,
    },
    {
      title: "Received",
      dataIndex: "received_date",
      width: 110,
      render: (v: string) => v,
    },
    {
      title: "Next FU",
      dataIndex: "next_follow_up_date",
      width: 120,
      onCell: (r: Inquiry) => ({
        record: r,
        dataIndex: "next_follow_up_date" as const,
        editable: true,
        inputType: "date" as const,
        saving,
        onSave: (v: string | null) => patch(r.id, { next_follow_up_date: v }),
      }),
      render: (v: string | null) => v ?? "-",
    },
    {
      title: "Est. $",
      dataIndex: "estimated_amount",
      width: 110,
      align: "right" as const,
      onCell: (r: Inquiry) => ({
        record: r,
        dataIndex: "estimated_amount" as const,
        editable: true,
        inputType: "number" as const,
        saving,
        onSave: (v: number | null) => patch(r.id, { estimated_amount: v }),
      }),
      render: (v: number | null) => (
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatUsd(v)}</span>
      ),
    },
    {
      title: "Owner",
      dataIndex: "owner",
      width: 100,
      onCell: (r: Inquiry) => ({
        record: r,
        dataIndex: "owner" as const,
        editable: true,
        inputType: "text" as const,
        saving,
        onSave: (v: string) => patch(r.id, { owner: v || null }),
      }),
      render: (v: string | null) => v || "-",
    },
    {
      title: "",
      width: 48,
      fixed: "right" as const,
      render: (_: unknown, r: Inquiry) => (
        <Link href={`/inquiries/${r.id}`} aria-label="Chi tiết">
          <Button type="text" size="small" icon={<EditOutlined />} />
        </Link>
      ),
    },
  ] as ColumnsType<Inquiry>;

  const createDrawer = (
    <Drawer
      title="Inquiry mới"
      open={creating}
      onClose={() => setCreating(false)}
      width="100%"
      styles={{ wrapper: { maxWidth: 480 } }}
      destroyOnHidden
      extra={
        <Space>
          <Link href="/inquiries/new">
            <Button type="link" size="small">
              Form đầy đủ
            </Button>
          </Link>
          <Button type="primary" loading={saving} onClick={saveCreate}>
            Tạo
          </Button>
        </Space>
      }
    >
      <Form form={createForm} layout="vertical" requiredMark="optional">
        <Form.Item
          label="Vendor"
          name="vendor_id"
          rules={[{ required: true, message: "Chọn hoặc tạo vendor" }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={vendors.length ? "Chọn vendor" : "Chưa có vendor — tạo bên dưới"}
            options={vendors.map((v) => ({ value: v.id, label: v.name }))}
          />
        </Form.Item>
        <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
          <Input
            placeholder="Tạo vendor mới"
            value={newVendorName}
            onChange={(e) => setNewVendorName(e.target.value)}
            onPressEnter={() => void createVendorInline()}
          />
          <Button loading={saving} onClick={() => void createVendorInline()}>
            Thêm
          </Button>
        </Space.Compact>
        <Form.Item
          label="Item code"
          name="item_name"
          rules={[{ required: true, message: "Nhập item code" }]}
        >
          <Input />
        </Form.Item>
        <Space style={{ width: "100%" }} styles={{ item: { flex: 1 } }}>
          <Form.Item label="Brand" name="brand" style={{ flex: 1, marginBottom: 16 }}>
            <Input />
          </Form.Item>
          <Form.Item label="RBO code" name="item_code" style={{ flex: 1, marginBottom: 16 }}>
            <Input />
          </Form.Item>
        </Space>
        <Form.Item label="Item type" name="category">
          <Input />
        </Form.Item>
        <Form.Item label="Nominated Status" name="nominated_status">
          <Select
            allowClear
            options={NOMINATED_STATUSES.map((s) => ({ value: s, label: s }))}
          />
        </Form.Item>
        <Space style={{ width: "100%" }} styles={{ item: { flex: 1 } }}>
          <Form.Item label="Status" name="status" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Select options={STATUSES.map((s) => ({ value: s, label: s }))} />
          </Form.Item>
          <Form.Item label="New / Existing" name="new_existing" style={{ flex: 1 }}>
            <Select
              options={[
                { value: "New", label: "New" },
                { value: "Existing", label: "Existing" },
              ]}
            />
          </Form.Item>
        </Space>
        {createStatus === "No Order" && (
          <Form.Item
            label="Reason for no order"
            name="reason_no_order"
            rules={[{ required: true, message: "Nhập lý do" }]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
        )}
        <Space style={{ width: "100%" }} styles={{ item: { flex: 1 } }}>
          <Form.Item
            label="Received"
            name="received_date"
            getValueProps={(v) => ({ value: v ? dayjs(v) : null })}
            getValueFromEvent={(d) => (d ? d.format("YYYY-MM-DD") : null)}
            style={{ flex: 1 }}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item
            label="Next FU"
            name="next_follow_up_date"
            getValueProps={(v) => ({ value: v ? dayjs(v) : null })}
            getValueFromEvent={(d) => (d ? d.format("YYYY-MM-DD") : null)}
            style={{ flex: 1 }}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
        </Space>
        <Space style={{ width: "100%" }} styles={{ item: { flex: 1 } }}>
          <Form.Item label="Est. $" name="estimated_amount" style={{ flex: 1 }}>
            <InputNumber style={{ width: "100%" }} min={0} prefix="$" />
          </Form.Item>
          <Form.Item label="Owner" name="owner" style={{ flex: 1 }}>
            <Input />
          </Form.Item>
        </Space>
      </Form>
    </Drawer>
  );

  const editDrawer = (
    <Drawer
      title="Sửa nhanh"
      open={Boolean(editRow)}
      onClose={() => setEditRow(null)}
      width="100%"
      styles={{ wrapper: { maxWidth: 420 } }}
      destroyOnHidden
      extra={
        <Space>
          {editRow && (
            <Link href={`/inquiries/${editRow.id}`}>
              <Button type="link" size="small">
                Đầy đủ
              </Button>
            </Link>
          )}
          <Button type="primary" loading={saving} onClick={saveEdit}>
            Lưu
          </Button>
        </Space>
      }
    >
      {editRow && (
        <Form form={editForm} layout="vertical" requiredMark={false}>
          <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
            {editRow.vendors?.name ?? vendorMap[editRow.vendor_id]}
          </Typography.Text>
          <Form.Item
            label="Item code"
            name="item_name"
            rules={[{ required: true, message: "Nhập item code" }]}
          >
            <Input />
          </Form.Item>
          <Space style={{ width: "100%" }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Brand" name="brand" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item label="RBO code" name="item_code" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item label="Status" name="status" rules={[{ required: true }]}>
            <Select options={STATUSES.map((s) => ({ value: s, label: s }))} />
          </Form.Item>
          {editStatus === "No Order" && (
            <Form.Item
              label="Reason for no order"
              name="reason_no_order"
              rules={[{ required: true, message: "Nhập lý do" }]}
            >
              <Input.TextArea rows={2} />
            </Form.Item>
          )}
          <Form.Item
            label="Next follow-up"
            name="next_follow_up_date"
            getValueProps={(v) => ({ value: v ? dayjs(v) : null })}
            getValueFromEvent={(d) => (d ? d.format("YYYY-MM-DD") : null)}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="Est. Amount (USD)" name="estimated_amount">
            <InputNumber style={{ width: "100%" }} min={0} prefix="$" />
          </Form.Item>
          <Form.Item label="Owner" name="owner">
            <Input />
          </Form.Item>
        </Form>
      )}
    </Drawer>
  );

  return (
    <div>
      <PageHeader
        title="Inquiries"
        description={
          isMobile
            ? `${filtered.length} / ${rows.length} · chạm để sửa`
            : `${filtered.length} / ${rows.length} · click ô để sửa như Excel`
        }
        extra={
          <>
            <Button icon={<DownloadOutlined />} href={exportHref}>
              Export
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Inquiry mới
            </Button>
          </>
        }
      />

      {filters}

      {filtered.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 10,
            padding: "48px 16px",
          }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              hasFilters
                ? "Không có bản ghi khớp bộ lọc"
                : "Chưa có inquiry — thêm dòng đầu tiên"
            }
          >
            {hasFilters ? (
              <Button onClick={clearFilters}>Xóa lọc</Button>
            ) : (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                Inquiry mới
              </Button>
            )}
          </Empty>
        </div>
      ) : isMobile ? (
        <Space orientation="vertical" size={8} style={{ width: "100%" }}>
          {filtered.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => openEdit(r)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: 14,
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <Typography.Text strong style={{ fontSize: 14 }}>
                  {r.vendors?.name ?? "-"}
                </Typography.Text>
                <Tag color={statusTagColor[r.status]} style={{ margin: 0 }}>
                  {r.status}
                </Tag>
              </div>
              <Typography.Text style={{ display: "block", marginTop: 4, fontSize: 13 }}>
                {r.item_name}
                {r.brand ? ` · ${r.brand}` : ""}
                {r.item_code ? ` · ${r.item_code}` : ""}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {r.received_date} · FU {r.next_follow_up_date ?? "-"} ·{" "}
                {formatUsd(r.estimated_amount)}
                {r.owner ? ` · ${r.owner}` : ""}
              </Typography.Text>
              {r.status === "No Order" && r.reason_no_order ? (
                <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                  Reason: {r.reason_no_order}
                </Typography.Text>
              ) : null}
            </button>
          ))}
        </Space>
      ) : (
        <div
          style={{
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <Table
            rowKey="id"
            dataSource={filtered}
            size="middle"
            scroll={{ x: 1200 }}
            pagination={{
              pageSize: 25,
              showSizeChanger: true,
              showTotal: (t) => `${t} records`,
            }}
            components={{ body: { cell: EditableCell } }}
            columns={desktopColumns}
          />
        </div>
      )}

      {createDrawer}
      {editDrawer}
    </div>
  );
}

type CellProps = {
  editable?: boolean;
  dataIndex?: keyof QuickEdit;
  inputType?: "text" | "number" | "date" | "status";
  record?: Inquiry;
  saving?: boolean;
  onSave?: (value: never) => Promise<boolean>;
  children?: React.ReactNode;
};

function EditableCell({
  editable,
  dataIndex,
  inputType,
  record,
  saving,
  onSave,
  children,
  ...rest
}: CellProps & React.TdHTMLAttributes<HTMLTableCellElement>) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string | number | null>(null);

  if (!editable || !record || !dataIndex || !onSave) {
    return <td {...rest}>{children}</td>;
  }

  async function commit(next: string | number | null) {
    setEditing(false);
    const prev = record![dataIndex!] as string | number | null;
    if (next === prev || (next === "" && !prev)) return;
    await onSave!(next as never);
  }

  if (editing) {
    let input: React.ReactNode;
    if (inputType === "status") {
      input = (
        <Select
          autoFocus
          open
          size="small"
          style={{ width: "100%" }}
          value={value as string}
          options={STATUSES.map((s) => ({ value: s, label: s }))}
          onChange={(v) => void commit(v)}
          onBlur={() => setEditing(false)}
        />
      );
    } else if (inputType === "date") {
      input = (
        <DatePicker
          autoFocus
          size="small"
          style={{ width: "100%" }}
          format="DD/MM/YYYY"
          value={value ? dayjs(String(value)) : null}
          onChange={(d) => void commit(d ? d.format("YYYY-MM-DD") : null)}
          onOpenChange={(open) => {
            if (!open) setEditing(false);
          }}
        />
      );
    } else if (inputType === "number") {
      input = (
        <InputNumber
          autoFocus
          size="small"
          style={{ width: "100%" }}
          min={0}
          value={value as number | null}
          onChange={(v) => setValue(v)}
          onPressEnter={() => void commit(value)}
          onBlur={() => void commit(value)}
          disabled={saving}
        />
      );
    } else {
      input = (
        <Input
          autoFocus
          size="small"
          value={(value as string) ?? ""}
          onChange={(e) => setValue(e.target.value)}
          onPressEnter={() => void commit(value)}
          onBlur={() => void commit(value)}
          disabled={saving}
        />
      );
    }
    return <td {...rest}>{input}</td>;
  }

  return (
    <td
      {...rest}
      onClick={() => {
        setValue((record[dataIndex] as string | number | null) ?? null);
        setEditing(true);
      }}
      style={{ ...rest.style, cursor: "cell" }}
    >
      {children}
    </td>
  );
}
