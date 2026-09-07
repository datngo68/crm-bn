"use client";

import Link from "next/link";
import { Button, Card, List, Space, Tag, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { formatUsd } from "@/lib/utils";
import type { Inquiry, InquiryStatus, Vendor } from "@/lib/types";

const statusColor: Record<InquiryStatus, string> = {
  Pending: "gold",
  Ordered: "green",
  Lost: "red",
  "No Order": "default",
};

type Props = { vendor: Vendor; inquiries: Inquiry[] };

export function VendorDetailClient({ vendor, inquiries }: Props) {
  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "space-between",
        }}
      >
        <div>
          <Link href="/vendors">← Vendor</Link>
          <Typography.Title level={3} style={{ margin: "4px 0 0" }}>
            {vendor.name}
          </Typography.Title>
          <Typography.Text type="secondary">
            {vendor.is_new ? "New" : "Existing"} · {inquiries.length} inquiry
          </Typography.Text>
        </div>
        <Link href={`/inquiries/new?vendor=${vendor.id}`}>
          <Button type="primary" icon={<PlusOutlined />}>
            Inquiry cho vendor này
          </Button>
        </Link>
      </div>

      <Card>
        <List
          locale={{ emptyText: "Chưa có inquiry." }}
          dataSource={inquiries}
          renderItem={(i) => (
            <List.Item
              actions={[
                <Tag key="s" color={statusColor[i.status]}>
                  {i.status}
                </Tag>,
              ]}
            >
              <List.Item.Meta
                title={<Link href={`/inquiries/${i.id}`}>{i.item_name}</Link>}
                description={`${i.received_date} · FU ${i.next_follow_up_date ?? "—"} · ${formatUsd(i.estimated_amount)}`}
              />
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );
}
