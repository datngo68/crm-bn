"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  DownloadOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  PlusOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { createClient } from "@/lib/supabase/client";
import type { Inquiry, InquiryStatus, NewExisting, Vendor } from "@/lib/types";
import { STATUSES } from "@/lib/types";
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
};

type QuickCreate = {
  vendor_id: string;
  item_name: string;
  brand?: string;
  item_code?: string;
  category?: string;
  status: InquiryStatus;
  new_existing: NewExisting;
  received_date: string;
  next_follow_up_date: string | null;
  estimated_amount?: number | null;
  unit_price_usd?: number | null;
  monthly_projection?: number | null;
  owner?: string;
};

const { useBreakpoint } = Grid;

export function InquiryListClient({
  inquiries: initial,
  vendors: initialVendors,
  defaultOwner,
  defaultFollowUpDays,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const { message, modal } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const showArchived = sp.get("archived") === "1";

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

  const [editRow, setEditRow] = useState<Inquiry | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [editForm] = Form.useForm<QuickEdit>();
  const [createForm] = Form.useForm<QuickCreate>();

  function setFilter(key: string, value?: string) {
    const next = new URLSearchParams(sp.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    // Clear focus filter noise when changing other filters so new rows stay visible
    if (key !== "focus") next.delete("focus");
    router.push(`/inquiries?${next.toString()}`);
  }

  function clearFilters() {
    router.push("/inquiries");
  }

  /** Client fetch — no full RSC reload when flipping archived toggle */
  async function loadList(archived: boolean) {
    setListLoading(true);
    setEditRow(null);
    const supabase = createClient();
    let query = supabase
      .from("inquiries")
      .select("*, vendors(id, name)")
      .order("created_at", { ascending: false });
    query = archived
      ? query.not("archived_at", "is", null)
      : query.is("archived_at", null);

    const status = sp.get("status");
    const vendor = sp.get("vendor");
    const owner = sp.get("owner");
    if (status) query = query.eq("status", status);
    if (vendor) query = query.eq("vendor_id", vendor);
    if (owner) query = query.ilike("owner", `%${owner}%`);

    const { data, error } = await query;
    setListLoading(false);
    if (error) {
      message.error(error.message);
      return;
    }
    let list = (data ?? []) as Inquiry[];
    const q = sp.get("q")?.toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.item_name.toLowerCase().includes(q) ||
          (i.brand ?? "").toLowerCase().includes(q) ||
          (i.item_code ?? "").toLowerCase().includes(q) ||
          (i.vendors?.name ?? "").toLowerCase().includes(q),
      );
    }
    const focus = sp.get("focus");
    const today = todayISO();
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
    setRows(list);
    const next = new URLSearchParams(sp.toString());
    if (archived) next.set("archived", "1");
    else next.delete("archived");
    router.replace(`/inquiries?${next.toString()}`, { scroll: false });
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
      estimated_amount: undefined,
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
          status: values.status,
          new_existing: values.new_existing,
          received_date: values.received_date,
          next_follow_up_date: values.next_follow_up_date,
          estimated_amount: amount,
          unit_price_usd: values.unit_price_usd ?? null,
          monthly_projection: values.monthly_projection ?? null,
          owner: values.owner?.trim() || null,
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
      message.success("Đã tạo inquiry");
      // Drop focus/status filters that would hide the new Pending row
      if (sp.get("focus") || sp.get("status") || sp.get("q")) {
        router.push("/inquiries");
      } else {
        router.refresh();
      }
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
      });
      if (ok) {
        message.success("Đã lưu");
        setEditRow(null);
      }
    } catch {
      /* validation */
    }
  }

  function archiveRow(row: Inquiry) {
    modal.confirm({
      title: "Ẩn inquiry này?",
      content: `${row.vendors?.name ?? ""} · ${row.item_name}. Có thể khôi phục trong mục Đã ẩn.`,
      okText: "Ẩn",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        setSaving(true);
        const supabase = createClient();
        const { error } = await supabase
          .from("inquiries")
          .update({ archived_at: new Date().toISOString() })
          .eq("id", row.id);
        setSaving(false);
        if (error) {
          message.error(error.message);
          return;
        }
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        setEditRow(null);
        message.success("Đã ẩn");
      },
    });
  }

  async function restoreRow(row: Inquiry) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("inquiries")
      .update({ archived_at: null })
      .eq("id", row.id);
    setSaving(false);
    if (error) {
      message.error(error.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setEditRow(null);
    message.success("Đã khôi phục");
  }

  const vendorMap = useMemo(
    () => Object.fromEntries(vendors.map((v) => [v.id, v.name])),
    [vendors],
  );

  const exportQs = sp.toString();
  const hasFilters = Boolean(
    sp.get("q") || sp.get("status") || sp.get("vendor") || sp.get("focus") || sp.get("owner"),
  );

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
        placeholder="Tìm item, brand, code…"
        defaultValue={sp.get("q") ?? ""}
        onSearch={(v) => setFilter("q", v || undefined)}
        style={{ width: isMobile ? "100%" : 220 }}
      />
      <Select
        allowClear
        placeholder="Status"
        style={{ width: isMobile ? "48%" : 140, flex: isMobile ? 1 : undefined }}
        value={sp.get("status") || undefined}
        onChange={(v) => setFilter("status", v)}
        options={STATUSES.map((s) => ({ value: s, label: s }))}
      />
      <Select
        allowClear
        showSearch
        optionFilterProp="label"
        placeholder="Vendor"
        style={{ width: isMobile ? "48%" : 180, flex: isMobile ? 1 : undefined }}
        value={sp.get("vendor") || undefined}
        onChange={(v) => setFilter("vendor", v)}
        options={vendors.map((v) => ({ value: v.id, label: v.name }))}
      />
      <Select
        allowClear
        placeholder="Follow-up"
        style={{ width: isMobile ? "100%" : 180 }}
        value={sp.get("focus") || undefined}
        onChange={(v) => {
          const next = new URLSearchParams(sp.toString());
          if (!v) next.delete("focus");
          else next.set("focus", v);
          router.push(`/inquiries?${next.toString()}`);
        }}
        options={[
          { value: "due", label: "Quá hạn / Hôm nay" },
          { value: "overdue", label: "Chỉ quá hạn" },
        ]}
      />
      {hasFilters && (
        <Button type="link" onClick={clearFilters}>
          Xóa lọc
        </Button>
      )}
      <Space size={8} style={{ marginLeft: "auto" }}>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          Đã ẩn
        </Typography.Text>
        <Switch
          size="small"
          checked={showArchived}
          loading={listLoading}
          onChange={(checked) => void loadList(checked)}
        />
      </Space>
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
      title: "Item",
      dataIndex: "item_name",
      width: 200,
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
      title: "Code",
      dataIndex: "item_code",
      width: 100,
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
      width: 88,
      fixed: "right" as const,
      render: (_: unknown, r: Inquiry) => (
        <Space size={0}>
          <Link href={`/inquiries/${r.id}`} aria-label="Chi tiết">
            <Button type="text" size="small" icon={<EditOutlined />} />
          </Link>
          {showArchived ? (
            <Button
              type="text"
              size="small"
              icon={<UndoOutlined />}
              aria-label="Khôi phục"
              onClick={(e) => {
                e.stopPropagation();
                void restoreRow(r);
              }}
            />
          ) : (
            <Button
              type="text"
              size="small"
              danger
              icon={<EyeInvisibleOutlined />}
              aria-label="Ẩn"
              onClick={(e) => {
                e.stopPropagation();
                archiveRow(r);
              }}
            />
          )}
        </Space>
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
        <Space.Compact style={{ width: "100%", marginTop: -8, marginBottom: 16 }}>
          <Input
            placeholder="Tạo vendor mới"
            value={newVendorName}
            onChange={(e) => setNewVendorName(e.target.value)}
            onPressEnter={createVendorInline}
          />
          <Button loading={saving} onClick={createVendorInline}>
            Thêm
          </Button>
        </Space.Compact>

        <Form.Item
          label="Item"
          name="item_name"
          rules={[{ required: true, message: "Nhập tên item" }]}
        >
          <Input placeholder="Tên hàng" autoFocus />
        </Form.Item>
        <Space style={{ width: "100%" }} styles={{ item: { flex: 1 } }}>
          <Form.Item label="Brand" name="brand" style={{ flex: 1, marginBottom: 16 }}>
            <Input />
          </Form.Item>
          <Form.Item label="Code" name="item_code" style={{ flex: 1, marginBottom: 16 }}>
            <Input />
          </Form.Item>
        </Space>
        <Form.Item label="Category" name="category">
          <Input />
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
        <Space style={{ width: "100%" }} styles={{ item: { flex: 1 } }}>
          <Form.Item
            label="Ngày nhận"
            name="received_date"
            rules={[{ required: true }]}
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
      footer={
        editRow ? (
          showArchived ? (
            <Button
              block
              icon={<UndoOutlined />}
              loading={saving}
              onClick={() => void restoreRow(editRow)}
            >
              Khôi phục
            </Button>
          ) : (
            <Button
              block
              danger
              icon={<EyeInvisibleOutlined />}
              onClick={() => archiveRow(editRow)}
            >
              Ẩn inquiry
            </Button>
          )
        ) : null
      }
    >
      {editRow && (
        <Form form={editForm} layout="vertical" requiredMark={false}>
          <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
            {editRow.vendors?.name ?? vendorMap[editRow.vendor_id]}
          </Typography.Text>
          <Form.Item
            label="Item"
            name="item_name"
            rules={[{ required: true, message: "Nhập item" }]}
          >
            <Input />
          </Form.Item>
          <Space style={{ width: "100%" }} styles={{ item: { flex: 1 } }}>
            <Form.Item label="Brand" name="brand" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item label="Code" name="item_code" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item label="Status" name="status" rules={[{ required: true }]}>
            <Select options={STATUSES.map((s) => ({ value: s, label: s }))} />
          </Form.Item>
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
        title={showArchived ? "Đã ẩn" : "Inquiries"}
        description={
          isMobile
            ? `${rows.length} bản ghi · chạm để sửa`
            : `${rows.length} bản ghi · click ô để sửa như Excel`
        }
        extra={
          <>
            <Button
              icon={<DownloadOutlined />}
              href={`/api/export${exportQs ? `?${exportQs}` : ""}`}
            >
              Export
            </Button>
            {!showArchived && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                Inquiry mới
              </Button>
            )}
          </>
        }
      />

      {filters}

      {rows.length === 0 && !listLoading ? (
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
              showArchived
                ? "Không có inquiry đã ẩn"
                : hasFilters
                  ? "Không có bản ghi khớp bộ lọc"
                  : "Chưa có inquiry — thêm dòng đầu tiên"
            }
          >
            {showArchived ? null : hasFilters ? (
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
          {listLoading ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                background: "#fff",
                borderRadius: 10,
                border: "1px solid #E2E8F0",
                color: "#94A3B8",
                fontSize: 13,
              }}
            >
              Đang tải…
            </div>
          ) : (
            rows.map((r) => (
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
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {r.received_date} · FU {r.next_follow_up_date ?? "-"} ·{" "}
                  {formatUsd(r.estimated_amount)}
                  {r.owner ? ` · ${r.owner}` : ""}
                </Typography.Text>
              </button>
            ))
          )}
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
            loading={listLoading}
            dataSource={rows}
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
  const [val, setVal] = useState<unknown>(null);

  if (!editable || !record || !dataIndex || !onSave) {
    return <td {...rest}>{children}</td>;
  }

  function start() {
    setVal(record![dataIndex!]);
    setEditing(true);
  }

  async function commit(next?: unknown) {
    const value = next !== undefined ? next : val;
    setEditing(false);
    const current = record![dataIndex!];
    if (value === current || (value == null && current == null)) return;
    await onSave!(value as never);
  }

  let editor: React.ReactNode = null;
  if (editing) {
    if (inputType === "status") {
      editor = (
        <Select
          autoFocus
          open
          size="small"
          style={{ width: "100%" }}
          value={val as string}
          options={STATUSES.map((s) => ({ value: s, label: s }))}
          onChange={(v) => commit(v)}
          onBlur={() => setEditing(false)}
        />
      );
    } else if (inputType === "date") {
      editor = (
        <DatePicker
          autoFocus
          size="small"
          style={{ width: "100%" }}
          format="DD/MM/YYYY"
          value={val ? dayjs(val as string) : null}
          onChange={(d) => commit(d ? d.format("YYYY-MM-DD") : null)}
          onOpenChange={(open) => {
            if (!open) setEditing(false);
          }}
        />
      );
    } else if (inputType === "number") {
      editor = (
        <InputNumber
          autoFocus
          size="small"
          style={{ width: "100%" }}
          value={val as number | null}
          onChange={(v) => setVal(v)}
          onPressEnter={() => commit()}
          onBlur={() => commit()}
        />
      );
    } else {
      editor = (
        <Input
          autoFocus
          size="small"
          value={(val as string) ?? ""}
          onChange={(e) => setVal(e.target.value)}
          onPressEnter={() => commit()}
          onBlur={() => commit()}
        />
      );
    }
  }

  return (
    <td
      {...rest}
      onClick={() => {
        if (!editing && !saving) start();
      }}
      style={{
        ...rest.style,
        cursor: editing ? "default" : "cell",
        background: editing ? "#F8FAFC" : undefined,
      }}
    >
      {editing ? editor : children}
    </td>
  );
}
