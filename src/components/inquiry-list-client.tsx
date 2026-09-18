"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  App,
  Badge,
  Button,
  Card,
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
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { createClient } from "@/lib/supabase/client";
import type { Inquiry, InquiryStatus, NewExisting, Vendor } from "@/lib/types";
import { NOMINATED_STATUSES, STATUSES } from "@/lib/types";
import { addDaysISO, formatUsd, todayISO } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { statusTagColor } from "@/lib/theme";
import { markDaFu } from "@/lib/mark-da-fu";
import { followUpDateForStatus, isDueOrOverdue, isOverdue } from "@/lib/follow-up";

type Props = {
  inquiries: Inquiry[];
  vendors: Vendor[];
  defaultFollowUpDays: number;
};

type QuickItem = {
  brand?: string | null;
  rbo_code?: string | null;
  quantity?: number | null;
  price?: number | null;
  currency?: "USD" | "VND";
  incoterm?: string | null;
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
  items: QuickItem[];
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
  vendors:   initialVendors,
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
  const [vendorSearch, setVendorSearch] = useState("");
  const [editForm] = Form.useForm<QuickEdit>();
  const [createForm] = Form.useForm<QuickCreate>();
  const [quickItems, setQuickItems] = useState<{ brand?: string; rbo_code?: string; quantity?: number; price?: number; currency?: "USD" | "VND"; incoterm?: string }[]>([{ currency: "USD" }]);
  const editStatus = Form.useWatch("status", editForm);
  const createStatus = Form.useWatch("status", createForm);

  const today = todayISO();
  const rowFollowUpDate = (row: Inquiry) => followUpDateForStatus(row.status, row);

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
          (i.inquiry_items ?? []).some((item) =>
            [item.brand, item.rbo_code, item.incoterm].some((value) => (value ?? "").toLowerCase().includes(needle)),
          ) ||
          (i.vendors?.name ?? "").toLowerCase().includes(needle),
      );
    }
    if (status) list = list.filter((i) => i.status === status);
    if (vendorId) list = list.filter((i) => i.vendor_id === vendorId);
    if (focus === "due") {
      list = list.filter(
        (i) =>
          isDueOrOverdue(followUpDateForStatus(i.status, i), today),
      );
    } else if (focus === "overdue") {
      list = list.filter(
        (i) =>
          isOverdue(followUpDateForStatus(i.status, i), today),
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
  const vendorMap = useMemo(
    () => Object.fromEntries(vendors.map((v) => [v.id, v.name])),
    [vendors],
  );
  const groupedByVendor = useMemo(() => {
    const groups = new Map<string, { vendor: string; inquiries: Inquiry[] }>();
    for (const row of filtered) {
      const key = row.vendor_id;
      const group = groups.get(key) ?? { vendor: row.vendors?.name ?? vendorMap[key] ?? "Không rõ vendor", inquiries: [] };
      group.inquiries.push(row);
      groups.set(key, group);
    }
    return [...groups.values()];
  }, [filtered, vendorMap]);

  function clearFilters() {
    setQ("");
    setStatus(undefined);
    setVendorId(undefined);
    setFocus(undefined);
  }

  const activeIds = useRef(new Set<string>());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const latestRows = useRef(rows);
  useEffect(() => { latestRows.current = rows; }, [rows]);

  // Sync the persisted date baseline only; never reset other unsaved fields.
  const drawerDate = useRef<string | null>(null);
  const currentEditRow = rows.find((r) => r.id === editRow?.id);
  useEffect(() => {
    if (!currentEditRow) return;
    if (editForm.getFieldValue("next_follow_up_date") === drawerDate.current) {
      editForm.setFieldValue("next_follow_up_date", currentEditRow.next_follow_up_date);
    }
    drawerDate.current = currentEditRow.next_follow_up_date;
  }, [currentEditRow, editForm]);

  function lock(id: string) {
    if (activeIds.current.has(id)) return false;
    activeIds.current.add(id);
    setBusyIds(new Set(activeIds.current));
    return true;
  }

  function unlock(id: string) {
    activeIds.current.delete(id);
    setBusyIds(new Set(activeIds.current));
  }

  function updateRow(id: string, data: Partial<Inquiry>) {
    latestRows.current = latestRows.current.map((r) => r.id === id ? { ...r, ...data } : r);
    setRows(latestRows.current);
  }

  async function patch(id: string, data: Partial<QuickEdit>, locked = false) {
    if (!locked && !lock(id)) return false;
    try {
      const row = latestRows.current.find((r) => r.id === id);
      if (!row?.updated_at) throw new Error("Vui lòng tải lại inquiry.");
      const { data: saved, error } = await createClient().from("inquiries")
        .update(data).eq("id", id).eq("updated_at", row.updated_at)
        .select("updated_at").single();
      if (error) throw error;
      if (!saved?.updated_at) throw new Error("Inquiry đã thay đổi. Vui lòng tải lại trang.");
      updateRow(id, { ...data, updated_at: saved.updated_at });
      message.destroy(`dafu-${id}`);
      return true;
    } catch (error) {
      message.error(error && typeof error === "object" && "message" in error
        ? String(error.message) : "Không thể lưu inquiry. Vui lòng thử lại.");
      return false;
    } finally {
      if (!locked) unlock(id);
    }
  }

  function canDaFu(row: Inquiry) {
    return isDueOrOverdue(followUpDateForStatus(row.status, row), today);
  }

  async function handleDaFu(id: string) {
    const row = latestRows.current.find((r) => r.id === id);
    if (!row || !canDaFu(row) || !lock(id)) return;
    const prev = {
      last_follow_up_date: row.last_follow_up_date,
      next_follow_up_date: row.next_follow_up_date,
      follow_up_date: row.follow_up_date,
      updated_at: row.updated_at,
    };
    try {
      await markDaFu({
        id, prev, today, status: row.status, defaultFollowUpDays, message,
        onOptimisticApply: (dates) => updateRow(id, dates),
        onSaved: (updated_at) => updateRow(id, { updated_at }),
        onRevert: (updatedAt) => updateRow(id, { ...prev, updated_at: updatedAt ?? prev.updated_at }),
        onUndoStart: () => lock(id),
        onUndoEnd: () => unlock(id),
      });
    } finally {
      unlock(id);
    }
  }

  function daFuButton(row: Inquiry) {
    return canDaFu(row) ? (
      <Button size="small" disabled={busyIds.has(row.id)} onClick={() => void handleDaFu(row.id)}>
        Đã FU
      </Button>
    ) : null;
  }

  function openCreate() {
    setCreating(true);
    setQuickItems([{ currency: "USD" }]);
    createForm.setFieldsValue({
      vendor_id: vendors[0]?.id,
      status: "Pending quotation",
      new_existing: "New",
      received_date: todayISO(),
      next_follow_up_date: addDaysISO(defaultFollowUpDays),
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
    drawerDate.current = row.next_follow_up_date;
    setEditRow(row);
    editForm.setFieldsValue({
      status: row.status,
      next_follow_up_date: row.next_follow_up_date,
      estimated_amount: row.estimated_amount,
      item_name: row.item_name,
      brand: row.brand,
      item_code: row.item_code,
      reason_no_order: row.reason_no_order,
      items: row.inquiry_items?.map((item) => ({
        brand: item.brand,
        rbo_code: item.rbo_code,
        quantity: item.quantity,
        price: item.price,
        currency: item.currency,
        incoterm: item.incoterm,
      })) ?? [{ brand: row.brand, rbo_code: row.item_code, quantity: row.monthly_projection, price: row.unit_price_usd, currency: "USD" }],
    });
  }

  async function createVendorInline(name: string) {
    const normalized = name.trim();
    if (!normalized) return;
    const existing = vendors.find((vendor) => vendor.name.toLowerCase() === normalized.toLowerCase());
    if (existing) {
      createForm.setFieldValue("vendor_id", existing.id);
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("vendors")
      .insert({ name: normalized })
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      message.error(error.message);
      return;
    }
    setVendors((v) => [...v, data].sort((a, b) => a.name.localeCompare(b.name)));
    createForm.setFieldValue("vendor_id", data.id);
    setVendorSearch("");
    message.success("Đã thêm vendor");
  }

  async function saveCreate() {
    try {
      const values = await createForm.validateFields();
      setSaving(true);
      const supabase = createClient();
      const items = quickItems.filter((item) => item.brand || item.rbo_code || item.quantity != null || item.price != null);
      if (!items.length) {
        setSaving(false);
        message.error("Thêm ít nhất một dòng sản phẩm");
        return;
      }
      const first = items[0];
      const amount = first.currency === "USD" && first.quantity != null && first.price != null
        ? +(Number(first.quantity) * Number(first.price)).toFixed(2)
        : null;

      const { data, error } = await supabase
        .from("inquiries")
        .insert({
          vendor_id: values.vendor_id,
          item_name: first.rbo_code || first.brand || "Multiple items",
          brand: first.brand?.trim() || null,
          item_code: first.rbo_code?.trim() || null,
          category: values.category?.trim() || null,
          nominated_status: values.nominated_status || null,
          status: values.status,
          new_existing: values.new_existing,
          received_date: values.received_date,
          next_follow_up_date: values.next_follow_up_date,
          estimated_amount: amount,
          unit_price_usd: first.currency === "USD" ? first.price ?? null : null,
          monthly_projection: first.quantity ?? null,
          reason_no_order:
            values.status === "Cancel"
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
      const { error: itemError } = await supabase.from("inquiry_items").insert(items.map((item, index) => ({
        inquiry_id: row.id,
        sort_order: index,
        brand: item.brand || null,
        rbo_code: item.rbo_code || null,
        quantity: item.quantity ?? null,
        price: item.price ?? null,
        currency: item.currency ?? "USD",
        incoterm: item.incoterm || null,
      })));
      if (itemError) {
        message.error(itemError.message);
        return;
      }
      setRows((prev) => [row, ...prev.filter((r) => r.id !== row.id)]);
      setCreating(false);
      createForm.resetFields();
      setQuickItems([{ currency: "USD" }]);
      clearFilters();
      setSort("newest");
      message.success("Đã tạo inquiry");
    } catch {
      /* validation */
    }
  }

  async function saveEdit() {
    if (!editRow || !lock(editRow.id)) return;
    try {
      const values = await editForm.validateFields();
      const items = (values.items ?? []).filter((item) => item.brand || item.rbo_code || item.quantity != null || item.price != null);
      if (!items.length) {
        message.error("Thêm ít nhất một dòng sản phẩm");
        return;
      }
      const first = items[0];
      const ok = await patch(editRow.id, {
        status: values.status,
        next_follow_up_date: values.next_follow_up_date,
        estimated_amount: values.estimated_amount,
        item_name: first.rbo_code || first.brand || "Multiple items",
        brand: first.brand || null,
        item_code: first.rbo_code || null,
        reason_no_order:
          values.status === "Cancel"
            ? values.reason_no_order || null
            : null,
      }, true);
      if (ok) {
        const supabase = createClient();
        const { error } = await supabase.from("inquiry_items").delete().eq("inquiry_id", editRow.id);
        if (error) {
          message.error(error.message);
          return;
        }
        const { error: itemError } = await supabase.from("inquiry_items").insert(items.map((item, index) => ({
          inquiry_id: editRow.id,
          sort_order: index,
          brand: item.brand || null,
          rbo_code: item.rbo_code || null,
          quantity: item.quantity ?? null,
          price: item.price ?? null,
          currency: item.currency ?? "USD",
          incoterm: item.incoterm || null,
        })));
        if (itemError) {
          message.error(itemError.message);
          return;
        }
      }
      if (ok) {
        message.success("Đã lưu");
        setEditRow((current) => current?.id === editRow.id ? null : current);
      }
    } catch {
      /* validation */
    } finally {
      unlock(editRow.id);
    }
  }

  const workspaceStats = useMemo(() => {
    const followUpRows = rows.filter((row) => row.status === "Pending quotation" || row.status === "Follow Up");
    return {
      inquiries: filtered.length,
      vendors: new Set(filtered.map((row) => row.vendor_id)).size,
      followUps: followUpRows.filter((row) => isDueOrOverdue(rowFollowUpDate(row), today)).length,
      overdue: followUpRows.filter((row) => isOverdue(rowFollowUpDate(row), today)).length,
    };
  }, [filtered, rows, today]);

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
    <Card
      size="small"
      bordered={false}
      style={{ marginBottom: 18, background: "#fff", boxShadow: "0 8px 24px rgba(15, 23, 42, .05)" }}
      bodyStyle={{ padding: 14 }}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Typography.Text strong style={{ fontSize: 13 }}>Bộ lọc công việc</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>Ưu tiên xử lý các inquiry đến hạn</Typography.Text>
        </Space>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
      </Space>
    </Card>
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
        saving: saving || busyIds.has(r.id),
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
        saving: saving || busyIds.has(r.id),
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
        saving: saving || busyIds.has(r.id),
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
        saving: saving || busyIds.has(r.id),
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
        saving: saving || busyIds.has(r.id),
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
        saving: saving || busyIds.has(r.id),
        onSave: (v: number | null) => patch(r.id, { estimated_amount: v }),
      }),
      render: (v: number | null) => (
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatUsd(v)}</span>
      ),
    },
    {
      title: "",
      width: 120,
      fixed: "right" as const,
      render: (_: unknown, r: Inquiry) => (
        <Space size={4} onClick={(e) => e.stopPropagation()}>
          {daFuButton(r)}
          <Link href={`/inquiries/${r.id}`} aria-label="Chi tiết">
            <Button type="text" size="small" icon={<EditOutlined />} />
          </Link>
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
            searchValue={vendorSearch}
            onSearch={setVendorSearch}
            placeholder={vendors.length ? "Tìm hoặc nhập vendor" : "Nhập vendor mới"}
            options={[
              ...vendors.map((v) => ({ value: v.id, label: v.name })),
              ...(vendorSearch.trim() && !vendors.some((v) => v.name.toLowerCase() === vendorSearch.trim().toLowerCase())
                ? [{ value: `__new__${vendorSearch.trim()}`, label: `Tạo vendor mới: ${vendorSearch.trim()}` }]
                : []),
            ]}
            onChange={(value) => {
              if (typeof value === "string" && value.startsWith("__new__")) {
                void createVendorInline(value.slice("__new__".length));
              }
            }}
          />
        </Form.Item>
        <Typography.Text strong>Các mã hàng & giá cả</Typography.Text>
        {quickItems.map((item, index) => (
          <Space key={index} direction="vertical" style={{ width: "100%", marginTop: 8, padding: 8, border: "1px solid #E2E8F0", borderRadius: 8 }}>
            <Space.Compact style={{ width: "100%" }}>
              <Input placeholder="Brand" value={item.brand} onChange={(e) => setQuickItems((all) => all.map((x, i) => i === index ? { ...x, brand: e.target.value } : x))} />
              <Input placeholder="RBO code" value={item.rbo_code} onChange={(e) => setQuickItems((all) => all.map((x, i) => i === index ? { ...x, rbo_code: e.target.value } : x))} />
            </Space.Compact>
            <Space.Compact style={{ width: "100%" }}>
              <InputNumber placeholder="Quantity" min={0} value={item.quantity} onChange={(value) => setQuickItems((all) => all.map((x, i) => i === index ? { ...x, quantity: value ?? undefined } : x))} style={{ width: "25%" }} />
              <InputNumber placeholder="Price" min={0} value={item.price} onChange={(value) => setQuickItems((all) => all.map((x, i) => i === index ? { ...x, price: value ?? undefined } : x))} style={{ width: "25%" }} />
              <Select value={item.currency ?? "USD"} options={[{ value: "USD" }, { value: "VND" }]} onChange={(value) => setQuickItems((all) => all.map((x, i) => i === index ? { ...x, currency: value } : x))} style={{ width: "25%" }} />
              <Input placeholder="Incoterm" value={item.incoterm} onChange={(e) => setQuickItems((all) => all.map((x, i) => i === index ? { ...x, incoterm: e.target.value } : x))} style={{ width: "25%" }} />
            </Space.Compact>
            <Button type="link" danger onClick={() => setQuickItems((all) => all.filter((_, i) => i !== index))}>Xóa dòng</Button>
          </Space>
        ))}
        <Button type="dashed" onClick={() => setQuickItems((all) => [...all, { currency: "USD" }])} style={{ marginTop: 8 }}>+ Thêm dòng</Button>
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
        {createStatus === "Cancel" && (
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
          {currentEditRow && daFuButton(currentEditRow)}
          <Button type="primary" loading={saving || (!!editRow && busyIds.has(editRow.id))} onClick={saveEdit}>
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
          <Typography.Text strong>Các mã hàng & giá cả</Typography.Text>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: "100%" }}>
                {fields.map((field) => (
                  <div key={field.key} style={{ padding: 8, border: "1px solid #E2E8F0", borderRadius: 8 }}>
                    <Space.Compact style={{ width: "100%" }}>
                      <Form.Item name={[field.name, "brand"]} style={{ width: "50%", marginBottom: 8 }}><Input placeholder="Brand" /></Form.Item>
                      <Form.Item name={[field.name, "rbo_code"]} style={{ width: "50%", marginBottom: 8 }}><Input placeholder="RBO code" /></Form.Item>
                    </Space.Compact>
                    <Space.Compact style={{ width: "100%" }}>
                      <Form.Item name={[field.name, "quantity"]} style={{ width: "25%", marginBottom: 8 }}><InputNumber min={0} placeholder="Qty" style={{ width: "100%" }} /></Form.Item>
                      <Form.Item name={[field.name, "price"]} style={{ width: "25%", marginBottom: 8 }}><InputNumber min={0} placeholder="Price" style={{ width: "100%" }} /></Form.Item>
                      <Form.Item name={[field.name, "currency"]} style={{ width: "25%", marginBottom: 8 }}><Select options={[{ value: "USD" }, { value: "VND" }]} /></Form.Item>
                      <Form.Item name={[field.name, "incoterm"]} style={{ width: "25%", marginBottom: 8 }}><Input placeholder="Incoterm" /></Form.Item>
                    </Space.Compact>
                    <Button type="link" danger onClick={() => remove(field.name)}>Xóa dòng</Button>
                  </div>
                ))}
                <Button type="dashed" onClick={() => add({ currency: "USD" })}>+ Thêm dòng</Button>
              </Space>
            )}
          </Form.List>
          <Form.Item label="Status" name="status" rules={[{ required: true }]}>
            <Select options={STATUSES.map((s) => ({ value: s, label: s }))} />
          </Form.Item>
          {editStatus === "Cancel" && (
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
        </Form>
      )}
    </Drawer>
  );

  return (
    <div>
      <PageHeader
        title="Inquiries"
        description="Một nơi để biết vendor nào cần phản hồi tiếp theo"
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

      <div className="inquiry-workspace-summary">
        <div className="inquiry-summary-lead">
          <span className="inquiry-summary-kicker">WORK QUEUE</span>
          <strong>{workspaceStats.followUps ? `${workspaceStats.followUps} việc cần xử lý` : "Không có việc đến hạn"}</strong>
          <span>{workspaceStats.inquiries} inquiry từ {workspaceStats.vendors} vendor đang hiển thị</span>
        </div>
        <div className="inquiry-summary-metrics">
          <div><InboxOutlined /><strong>{workspaceStats.inquiries}</strong><span>inquiry</span></div>
          <div><ClockCircleOutlined /><strong>{workspaceStats.followUps}</strong><span>đến hạn</span></div>
          <div className={workspaceStats.overdue ? "is-danger" : ""}><WarningOutlined /><strong>{workspaceStats.overdue}</strong><span>quá hạn</span></div>
        </div>
      </div>

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
            <div
              key={r.id}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: 14,
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 10,
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
              </Typography.Text>
              {(r.inquiry_items ?? []).slice(0, 3).map((item) => (
                <Typography.Text key={item.id} type="secondary" style={{ display: "block", fontSize: 12 }}>
                  {item.brand || "-"} · {item.rbo_code || "-"} · {item.quantity ?? "-"} · {item.price ?? "-"} {item.currency} · {item.incoterm || "-"}
                </Typography.Text>
              ))}
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {r.received_date} · FU {rowFollowUpDate(r) ?? "-"} ·{" "}
                {formatUsd(r.estimated_amount)}
              </Typography.Text>
              {r.status === "Cancel" && r.reason_no_order ? (
                <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                  Reason: {r.reason_no_order}
                </Typography.Text>
              ) : null}
              <Space style={{ display: "flex", marginTop: 8 }}>
                {daFuButton(r)}
                <Button size="small" onClick={() => openEdit(r)}>Sửa</Button>
              </Space>
            </div>
          ))}
        </Space>
      ) : (
        <div className="inquiry-vendor-stack">
          {groupedByVendor.map((group) => {
            const dueCount = group.inquiries.filter((row) => isDueOrOverdue(rowFollowUpDate(row), today)).length;
            const itemCount = group.inquiries.reduce((total, row) => total + (row.inquiry_items?.length ?? 0), 0);
            return (
              <section className={`inquiry-vendor-card${dueCount ? " has-due" : ""}`} key={group.vendor}>
                <div className="inquiry-vendor-heading">
                  <div>
                    <span className="inquiry-vendor-kicker">VENDOR</span>
                    <Typography.Title level={5} style={{ margin: "3px 0 0" }}>{group.vendor}</Typography.Title>
                  </div>
                  <div className="inquiry-vendor-meta">
                    <span>{group.inquiries.length} inquiry</span>
                    <span>{itemCount} dòng sản phẩm</span>
                    {dueCount ? <Badge status="warning" text={`${dueCount} cần xử lý`} /> : <Badge status="success" text="Đang ổn" />}
                  </div>
                </div>
                <div className="inquiry-vendor-table">
                  <Table
                    rowKey="id"
                    dataSource={group.inquiries}
                    size="middle"
                    scroll={{ x: 1200 }}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    components={{ body: { cell: EditableCell } }}
                    columns={desktopColumns}
                  />
                </div>
              </section>
            );
          })}
        </div>
      )}

      {createDrawer}
      {editDrawer}
    </div>
  );
}

type CellProps = {
  editable?: boolean;
  dataIndex?: Exclude<keyof QuickEdit, "items">;
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
