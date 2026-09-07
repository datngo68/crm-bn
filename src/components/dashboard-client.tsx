"use client";

import Link from "next/link";
import { Button, Card, Col, Empty, List, Row, Tag, Typography } from "antd";
import { DownloadOutlined, PlusOutlined } from "@ant-design/icons";
import type { Inquiry, InquiryStatus } from "@/lib/types";
import { formatUsd } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { statusTagColor } from "@/lib/theme";

type Props = {
  today: string;
  pending: number;
  overdue: number;
  dueToday: number;
  orderedMonth: number;
  focus: Inquiry[];
};

export function DashboardClient({
  today,
  pending,
  overdue,
  dueToday,
  orderedMonth,
  focus,
}: Props) {
  const stats = [
    { label: "Pending", value: pending, hint: "Đang theo dõi" },
    {
      label: "Quá hạn",
      value: overdue,
      hint: "Cần follow-up",
      danger: overdue > 0,
    },
    { label: "Hôm nay", value: dueToday, hint: today },
    { label: "Ordered / tháng", value: orderedMonth, hint: "Đã chốt" },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Theo dõi inquiry và follow-up trong ngày"
        extra={
          <>
            <Button icon={<DownloadOutlined />} href="/api/export">
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

      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {stats.map((s) => (
          <Col xs={12} lg={6} key={s.label}>
            <Card size="small" styles={{ body: { padding: "16px 18px" } }}>
              <Typography.Text
                type="secondary"
                style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}
              >
                {s.label}
              </Typography.Text>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 650,
                  letterSpacing: "-0.03em",
                  marginTop: 4,
                  color: s.danger ? "#DC2626" : "#0F172A",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {s.value}
              </div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {s.hint}
              </Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title={
          <Typography.Text strong style={{ fontSize: 14 }}>
            Cần follow-up
          </Typography.Text>
        }
        extra={
          <Link href="/inquiries?focus=due" style={{ fontSize: 13, color: "#0369A1" }}>
            Xem tất cả
          </Link>
        }
        styles={{ body: { paddingTop: 8 } }}
      >
        {focus.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Không có mục đến hạn"
            style={{ padding: "24px 0" }}
          />
        ) : (
          <List
            dataSource={focus}
            split
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
                      {i.vendors?.name ?? "-"} · {i.item_name}
                    </Link>
                  }
                  description={
                    <span style={{ fontSize: 12, color: "#64748B" }}>
                      FU {i.next_follow_up_date ?? "-"} · {formatUsd(i.estimated_amount)}
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
