"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { DownloadOutlined, PlusOutlined } from "@ant-design/icons";
import type { Inquiry, InquiryStatus, Vendor } from "@/lib/types";
import { STATUSES } from "@/lib/types";
import { formatUsd } from "@/lib/utils";

const statusColor: Record<InquiryStatus, string> = {
  Pending: "gold",
  Ordered: "green",
  Lost: "red",
  "No Order": "default",
};

type Props = {
  inquiries: Inquiry[];
  vendors: Vendor[];
};

export function InquiryListClient({ inquiries, vendors }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  function set(key: string, value?: string) {
    const next = new URLSearchParams(sp.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    router.push(`/inquiries?${next.toString()}`);
  }

  const exportQs = sp.toString();

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Inquiry
          </Typography.Title>
          <Typography.Text type="secondary">{inquiries.length} bản ghi</Typography.Text>
        </div>
        <Space wrap>
          <Button icon={<DownloadOutlined />} href={`/api/export${exportQs ? `?${exportQs}` : ""}`}>
            Export
          </Button>
          <Link href="/inquiries/new">
            <Button type="primary" icon={<PlusOutlined />}>
              Mới
            </Button>
          </Link>
        </Space>
      </div>

      <Card size="small">
        <Space wrap style={{ width: "100%" }}>
          <Input.Search
            allowClear
            placeholder="Tìm item / brand / code…"
            defaultValue={sp.get("q") ?? ""}
            onSearch={(v) => set("q", v || undefined)}
            style={{ width: 220 }}
          />
          <Select
            allowClear
            placeholder="Status"
            style={{ width: 140 }}
            value={sp.get("status") || undefined}
            onChange={(v) => set("status", v)}
            options={STATUSES.map((s) => ({ value: s, label: s }))}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Vendor"
            style={{ width: 180 }}
            value={sp.get("vendor") || undefined}
            onChange={(v) => set("vendor", v)}
            options={vendors.map((v) => ({ value: v.id, label: v.name }))}
          />
          <Select
            allowClear
            placeholder="Follow-up"
            style={{ width: 180 }}
            value={sp.get("focus") || undefined}
            onChange={(v) => set("focus", v)}
            options={[
              { value: "due", label: "Quá hạn / Hôm nay" },
              { value: "overdue", label: "Chỉ quá hạn" },
            ]}
          />
          <Input
            allowClear
            placeholder="Owner"
            defaultValue={sp.get("owner") ?? ""}
            onBlur={(e) => set("owner", e.target.value || undefined)}
            style={{ width: 140 }}
          />
        </Space>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          dataSource={inquiries}
          scroll={{ x: 900 }}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          columns={[
            {
              title: "Vendor",
              dataIndex: ["vendors", "name"],
              render: (_: unknown, r) => (
                <Link href={`/inquiries/${r.id}`}>{r.vendors?.name ?? "—"}</Link>
              ),
            },
            { title: "Item", dataIndex: "item_name" },
            {
              title: "Status",
              dataIndex: "status",
              render: (s: InquiryStatus) => <Tag color={statusColor[s]}>{s}</Tag>,
            },
            { title: "Received", dataIndex: "received_date", width: 120 },
            { title: "Next FU", dataIndex: "next_follow_up_date", width: 120 },
            {
              title: "Est.",
              dataIndex: "estimated_amount",
              render: (v: number | null) => formatUsd(v),
              width: 120,
            },
            { title: "Owner", dataIndex: "owner", width: 120 },
          ]}
        />
      </Card>
    </Space>
  );
}
