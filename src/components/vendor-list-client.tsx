"use client";

import Link from "next/link";
import { Card, Col, Empty, Row, Tag, Typography } from "antd";
import { VendorCreate } from "@/components/vendor-create";
import { PageHeader } from "@/components/page-header";
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
    <div>
      <PageHeader
        title="Vendors"
        description="Gom inquiry theo từng khách"
        extra={<VendorCreate />}
      />

      {vendors.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có vendor — tạo ở trên"
          style={{ padding: 48, background: "#fff", borderRadius: 10, border: "1px solid #E2E8F0" }}
        />
      ) : (
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
                  <Card
                    hoverable
                    style={{ borderRadius: 10, height: "100%" }}
                    styles={{ body: { padding: 18 } }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 8,
                      }}
                    >
                      <Typography.Text
                        strong
                        style={{ fontSize: 15, letterSpacing: "-0.01em" }}
                      >
                        {v.name}
                      </Typography.Text>
                      <Tag style={{ margin: 0 }}>{v.is_new ? "New" : "Existing"}</Tag>
                    </div>
                    <Typography.Text
                      type="secondary"
                      style={{ display: "block", marginTop: 10, fontSize: 12 }}
                    >
                      {s.total} inquiry · Pending {s.pending} · Ordered {s.ordered}
                    </Typography.Text>
                    <div
                      style={{
                        marginTop: 8,
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                        color: "#0F172A",
                      }}
                    >
                      {formatUsd(s.amount)}
                    </div>
                  </Card>
                </Link>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}
