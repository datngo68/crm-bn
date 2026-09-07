"use client";

import Link from "next/link";
import { Button, Card, Empty, List, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { formatUsd } from "@/lib/utils";
import type { Inquiry, InquiryStatus, Vendor } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { statusTagColor } from "@/lib/theme";

type Props = { vendor: Vendor; inquiries: Inquiry[] };

export function VendorDetailClient({ vendor, inquiries }: Props) {
  return (
    <div>
      <PageHeader
        title={vendor.name}
        description={`${vendor.is_new ? "New" : "Existing"} · ${inquiries.length} inquiry`}
        extra={
          <>
            <Link href="/vendors">
              <Button>Quay lại</Button>
            </Link>
            <Link href={`/inquiries/new?vendor=${vendor.id}`}>
              <Button type="primary" icon={<PlusOutlined />}>
                Inquiry mới
              </Button>
            </Link>
          </>
        }
      />

      <Card style={{ borderRadius: 10 }} styles={{ body: { paddingTop: 8 } }}>
        {inquiries.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Chưa có inquiry"
            style={{ padding: 32 }}
          />
        ) : (
          <List
            dataSource={inquiries}
            renderItem={(i) => (
              <List.Item
                style={{ paddingInline: 0 }}
                actions={[
                  <Tag
                    key="s"
                    color={statusTagColor[i.status as InquiryStatus]}
                    style={{ marginInlineEnd: 0 }}
                  >
                    {i.status}
                  </Tag>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Link
                      href={`/inquiries/${i.id}`}
                      style={{ fontWeight: 500, color: "#0F172A" }}
                    >
                      {i.item_name}
                    </Link>
                  }
                  description={
                    <span style={{ fontSize: 12, color: "#64748B" }}>
                      {i.received_date} · FU {i.next_follow_up_date ?? "-"} ·{" "}
                      {formatUsd(i.estimated_amount)}
                    </span>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
