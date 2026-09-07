"use client";

import Link from "next/link";
import { Card, Col, Row, Space, Tag, Typography } from "antd";
import { VendorCreate } from "@/components/vendor-create";
import { formatUsd } from "@/lib/utils";
import type { Vendor } from "@/lib/types";

type Stats = {
  total: number;
  pending: number;
  ordered: number;
  amount: number;
};

type Props = {
  vendors: Vendor[];
  stats: Record<string, Stats>;
};

export function VendorListClient({ vendors, stats }: Props) {
  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Vendor
        </Typography.Title>
        <Typography.Text type="secondary">
          Gom inquiry theo từng khách
        </Typography.Text>
      </div>

      <VendorCreate />

      <Row gutter={[12, 12]}>
        {vendors.map((v) => {
          const s = stats[v.id] ?? {
            total: 0,
            pending: 0,
            ordered: 0,
            amount: 0,
          };
          return (
            <Col xs={24} sm={12} lg={8} key={v.id}>
              <Link href={`/vendors/${v.id}`}>
                <Card hoverable>
                  <Space style={{ width: "100%", justifyContent: "space-between" }}>
                    <Typography.Text strong>{v.name}</Typography.Text>
                    <Tag>{v.is_new ? "New" : "Existing"}</Tag>
                  </Space>
                  <div style={{ marginTop: 8, color: "#64748b" }}>
                    {s.total} inquiry · Pending {s.pending} · Ordered {s.ordered}
                  </div>
                  <Typography.Text style={{ color: "#0284c7", fontWeight: 600 }}>
                    {formatUsd(s.amount)}
                  </Typography.Text>
                </Card>
              </Link>
            </Col>
          );
        })}
      </Row>
      {vendors.length === 0 && (
        <Typography.Text type="secondary">Chưa có vendor — tạo ở trên.</Typography.Text>
      )}
    </Space>
  );
}
