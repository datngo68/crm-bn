"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  DatePicker,
  Drawer,
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
import type { Inquiry, InquiryStatus, Vendor } from "@/lib/types";
import { STATUSES } from "@/lib/types";
import { formatUsd } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { statusTagColor } from "@/lib/theme";

type Props = {
  inquiries: Inquiry[];
  vendors: Vendor[];
};

type QuickFields = {
  status: InquiryStatus;
  next_follow_up_date: string | null;
  estimated_amount: number | null;
  owner: string | null;
  item_name: string;
};

const { useBreakpoint } = Grid;

export function InquiryListClient({ inquiries: initial, vendors }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const { message } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [rows, setRows] = useState(initial);
  useEffect(() => setRows(initial), [initial]);

  const [drawer, setDrawer] = useState<Inquiry | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [form] = Form.useForm<QuickFields>();

  function setFilter(key: string, value?: string) {
    const next = new URLSearchParams(sp.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    router.push(`/inquiries?${next.toString()}`);
  }

  const patch = useCallback(
    async (id: string, data: Partial<QuickFields>) => {
      setSavingId(id);
      const supabase = createClient();
      const { error } = await supabase.from("inquiries").update(data).eq("id", id);
      setSavingId(null);
      if (error) {
        message.error(error.message);
        return false;
      }
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...data } : r)),
      );
      return true;
    },
    [message],
  );

  function openDrawer(row: Inquiry) {
    setDrawer(row);
    form.setFieldsValue({
      status: row.status,
      next_follow_up_date: row.next_follow_up_date,
      estimated_amount: row.estimated_amount,
      owner: row.owner,
      item_name: row.item_name,
    });
  }

  async function saveDrawer() {
    if (!drawer) return;
    const values = await form.validateFields();
    const ok = await patch(drawer.id, {
      status: values.status,
      next_follow_up_date: values.next_follow_up_date,
      estimated_amount: values.estimated_amount,
      owner: values.owner || null,
      item_name: values.item_name,
    });
    if (ok) {
      message.success("Đã lưu");
      setDrawer(null);
    }
  }

  const vendorMap = useMemo(
    () => Object.fromEntries(vendors.map((v) => [v.id, v.name])),
    [vendors],
  );

  const exportQs = sp.toString();

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
        onChange={(v) => setFilter("focus", v)}
        options={[
          { value: "due", label: "Quá hạn / Hôm nay" },
          { value: "overdue", label: "Chỉ quá hạn" },
        ]}
      />
    </div>
  );

  // ponytail: Ant Design onCell typing ignores custom editable props; cast is the documented pattern
  const desktopColumns = [
    {
      title: "Vendor",
      width: 160,
      render: (_: unknown, r: Inquiry) => (
        <Link href={`/inquiries/${r.id}`} style={{ fontWeight: 500, color: "#0F172A" }}>
          {r.vendors?.name ?? vendorMap[r.vendor_id] ?? "-"}
        </Link>
      ),
    },
    {
      title: "Item",
      dataIndex: "item_name",
      onCell: (r: Inquiry) => ({
        record: r,
        dataIndex: "item_name" as const,
        editable: true,
        inputType: "text" as const,
        saving: savingId === r.id,
        onSave: (v: string) => patch(r.id, { item_name: v }),
      }),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 130,
      onCell: (r: Inquiry) => ({
        record: r,
        dataIndex: "status" as const,
        editable: true,
        inputType: "status" as const,
        saving: savingId === r.id,
        onSave: (v: InquiryStatus) => patch(r.id, { status: v }),
      }),
      render: (s: InquiryStatus) => <Tag color={statusTagColor[s]}>{s}</Tag>,
    },
    {
      title: "Next FU",
      dataIndex: "next_follow_up_date",
      width: 140,
      onCell: (r: Inquiry) => ({
        record: r,
        dataIndex: "next_follow_up_date" as const,
        editable: true,
        inputType: "date" as const,
        saving: savingId === r.id,
        onSave: (v: string | null) => patch(r.id, { next_follow_up_date: v }),
      }),
      render: (v: string | null) => v ?? "-",
    },
    {
      title: "Est. $",
      dataIndex: "estimated_amount",
      width: 120,
      align: "right" as const,
      onCell: (r: Inquiry) => ({
        record: r,
        dataIndex: "estimated_amount" as const,
        editable: true,
        inputType: "number" as const,
        saving: savingId === r.id,
        onSave: (v: number | null) => patch(r.id, { estimated_amount: v }),
      }),
      render: (v: number | null) => (
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatUsd(v)}</span>
      ),
    },
    {
      title: "Owner",
      dataIndex: "owner",
      width: 120,
      onCell: (r: Inquiry) => ({
        record: r,
        dataIndex: "owner" as const,
        editable: true,
        inputType: "text" as const,
        saving: savingId === r.id,
        onSave: (v: string) => patch(r.id, { owner: v || null }),
      }),
      render: (v: string | null) => v ?? "-",
    },
    {
      title: "",
      width: 56,
      render: (_: unknown, r: Inquiry) => (
        <Link href={`/inquiries/${r.id}`} aria-label="Chi tiết">
          <Button type="text" size="small" icon={<EditOutlined />} />
        </Link>
      ),
    },
  ] as ColumnsType<Inquiry>;

  return (
    <div>
      <PageHeader
        title="Inquiries"
        description={
          isMobile
            ? `${rows.length} bản ghi · chạm để sửa nhanh`
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
            <Link href="/inquiries/new">
              <Button type="primary" icon={<PlusOutlined />}>
                Inquiry mới
              </Button>
            </Link>
          </>
        }
      />

      {filters}

      {isMobile ? (
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => openDrawer(r)}
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
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                FU {r.next_follow_up_date ?? "-"} · {formatUsd(r.estimated_amount)}
              </Typography.Text>
            </button>
          ))}
          {rows.length === 0 && (
            <Typography.Text type="secondary">Không có bản ghi.</Typography.Text>
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
            dataSource={rows}
            size="middle"
            scroll={{ x: 900 }}
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

      <Drawer
        title="Sửa nhanh"
        open={Boolean(drawer)}
        onClose={() => setDrawer(null)}
        width="100%"
        styles={{ wrapper: { maxWidth: 420 } }}
        extra={
          <Space>
            {drawer && (
              <Link href={`/inquiries/${drawer.id}`}>
                <Button type="link" size="small">
                  Đầy đủ
                </Button>
              </Link>
            )}
            <Button type="primary" loading={savingId === drawer?.id} onClick={saveDrawer}>
              Lưu
            </Button>
          </Space>
        }
      >
        {drawer && (
          <Form form={form} layout="vertical" requiredMark={false}>
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
              {drawer.vendors?.name}
            </Typography.Text>
            <Form.Item
              label="Item"
              name="item_name"
              rules={[{ required: true, message: "Nhập item" }]}
            >
              <Input />
            </Form.Item>
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
    </div>
  );
}

type CellProps = {
  editable?: boolean;
  dataIndex?: keyof QuickFields;
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
