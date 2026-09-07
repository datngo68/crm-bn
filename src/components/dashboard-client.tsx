"use client";

import Link from "next/link";
import { Button, Card, Col, List, Row, Space, Statistic, Tag, Typography } from "antd";
import { DownloadOutlined, PlusOutlined } from "@ant-design/icons";
import type { Inquiry, InquiryStatus } from "@/lib/types";
import { formatUsd } from "@/lib/utils";

const statusColor: Record<InquiryStatus, string> = {
  Pending: "gold",
  Ordered: "green",
  Lost: "red",
  "No Order": "default",
};

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
  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Dashboard
          </Typography.Title>
          <Typography.Text type="secondary">
            Theo dõi inquiry & follow-up hôm nay
          </Typography.Text>
        </div>
        <Space wrap>
          <Button icon={<DownloadOutlined />} href="/api/export">
            Export Excel
          </Button>
          <Link href="/inquiries/new">
            <Button type="primary" icon={<PlusOutlined />}>
              Inquiry mới
            </Button>
          </Link>
        </Space>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Pending" value={pending} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Quá hạn FU"
              value={overdue}
              valueStyle={overdue ? { color: "#cf1322" } : undefined}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Đến hạn hôm nay" value={dueToday} suffix={<span style={{ fontSize: 12 }}>{today}</span>} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Ordered tháng này" value={orderedMonth} />
          </Card>
        </Col>
      </Row>

      <Card
        title="Cần follow-up"
        extra={
          <Link href="/inquiries?focus=due">Xem tất cả</Link>
        }
      >
        <List
          locale={{ emptyText: "Không có mục đến hạn." }}
          dataSource={focus}
          renderItem={(i) => (
            <List.Item
              actions={[
                <Tag key="s" color={statusColor[i.status]}>
                  {i.status}
                </Tag>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Link href={`/inquiries/${i.id}`}>
                    {i.vendors?.name ?? "—"} · {i.item_name}
                  </Link>
                }
                description={`FU: ${i.next_follow_up_date ?? "—"} · ${formatUsd(i.estimated_amount)}`}
              />
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );
}
