"use client";

import Link from "next/link";
import { useState } from "react";
import { App, Button, Card, Col, Empty, List, Row, Typography } from "antd";
import { DownloadOutlined, PlusOutlined } from "@ant-design/icons";
import type { Inquiry } from "@/lib/types";
import { formatUsd } from "@/lib/utils";
import { isOverdue } from "@/lib/follow-up";
import { markDaFu } from "@/lib/mark-da-fu";
import { PageHeader } from "@/components/page-header";

type Props = {
  today: string;
  pending: number;
  overdue: number;
  dueToday: number;
  orderedMonth: number;
  focus: Inquiry[];
  defaultFollowUpDays: number;
};

const KPI_HREF: Record<string, string> = {
  Pending: "/inquiries?status=Pending",
  "Quá hạn": "/inquiries?focus=overdue",
  "Hôm nay": "/inquiries?focus=due",
  "Ordered / tháng": "/inquiries?status=Ordered",
};

export function DashboardClient({
  today,
  pending,
  overdue,
  dueToday,
  orderedMonth,
  focus,
  defaultFollowUpDays,
}: Props) {
  const { message } = App.useApp();
  const [items, setItems] = useState(focus);
  const [prevFocus, setPrevFocus] = useState(focus);
  const [fuCounts, setFuCounts] = useState({ overdue, dueToday });
  if (focus !== prevFocus) {
    setPrevFocus(focus);
    setItems(focus);
    setFuCounts({ overdue, dueToday });
  }

  const stats = [
    { label: "Pending", value: pending, hint: "Đang theo dõi" },
    {
      label: "Quá hạn",
      value: fuCounts.overdue,
      hint: "Cần follow-up",
      danger: fuCounts.overdue > 0,
    },
    { label: "Hôm nay", value: fuCounts.dueToday, hint: today },
    { label: "Ordered / tháng", value: orderedMonth, hint: "Đã chốt" },
  ];

  async function handleDaFu(row: Inquiry) {
    const prev = {
      last_follow_up_date: row.last_follow_up_date,
      next_follow_up_date: row.next_follow_up_date,
      updated_at: row.updated_at,
    };
    let delta = { overdue: 0, dueToday: 0 };
    await markDaFu({
      id: row.id,
      prev,
      today,
      defaultFollowUpDays,
      message,
      onOptimisticApply: (patch) => {
        delta = {
          overdue: Number(isOverdue(patch.next_follow_up_date, today)) - Number(isOverdue(prev.next_follow_up_date, today)),
          dueToday: Number(patch.next_follow_up_date === today) - Number(prev.next_follow_up_date === today),
        };
        setFuCounts((counts) => ({ overdue: counts.overdue + delta.overdue, dueToday: counts.dueToday + delta.dueToday }));
        setItems((list) => list.filter((i) => i.id !== row.id));
      },
      onRevert: (updatedAt) => {
        setFuCounts((counts) => ({ overdue: counts.overdue - delta.overdue, dueToday: counts.dueToday - delta.dueToday }));
        setItems((list) =>
          [...list.filter((i) => i.id !== row.id), { ...row, updated_at: updatedAt ?? row.updated_at }].sort((a, b) =>
            (a.next_follow_up_date ?? "").localeCompare(b.next_follow_up_date ?? ""),
          ),
        );
      },
    });
  }

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

      <Card
        title={
          <Typography.Text strong style={{ fontSize: 14 }}>
            Hôm nay
          </Typography.Text>
        }
        extra={
          <Link href="/inquiries?focus=due" style={{ fontSize: 13, color: "#0369A1" }}>
            Xem tất cả
          </Link>
        }
        styles={{ body: { paddingTop: 8 } }}
      >
        {items.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                Không có việc hôm nay ·{" "}
                <Link href="/inquiries?status=Pending">Pending</Link>
              </span>
            }
            style={{ padding: "24px 0" }}
          />
        ) : (
          <List
            dataSource={items}
            split
            renderItem={(i) => {
              const overdueRow = isOverdue(i.next_follow_up_date, today);
              return (
                <List.Item
                  style={{
                    paddingInline: 0,
                    ...(overdueRow
                      ? {
                          background: "#FEF2F2",
                          borderRadius: 8,
                          paddingInline: 8,
                          marginInline: -8,
                        }
                      : {}),
                  }}
                  actions={[
                    <Button
                      key="dafu"
                      type="primary"
                      size="small"
                      onClick={() => handleDaFu(i)}
                    >
                      Đã FU
                    </Button>,
                    <Link key="sua" href={`/inquiries/${i.id}`}>
                      Sửa
                    </Link>,
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
                        FU{" "}
                        <span style={overdueRow ? { color: "#DC2626" } : undefined}>
                          {i.next_follow_up_date ?? "-"}
                        </span>{" "}
                        · {formatUsd(i.estimated_amount)}
                      </span>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>

      <Row gutter={[12, 12]} style={{ marginTop: 20 }}>
        {stats.map((s) => (
          <Col xs={12} lg={6} key={s.label}>
            <Link href={KPI_HREF[s.label]} style={{ display: "block" }}>
              <Card size="small" hoverable styles={{ body: { padding: "16px 18px" } }}>
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
            </Link>
          </Col>
        ))}
      </Row>
    </div>
  );
}
