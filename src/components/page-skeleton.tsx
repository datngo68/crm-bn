"use client";

import { Card, Col, Row, Skeleton, Space } from "antd";

/** Instant feedback while RSC/data loads — kills "blank hang" on navigation */
export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <div>
        <Skeleton.Input active style={{ width: 180, height: 28 }} />
        <div style={{ marginTop: 8 }}>
          <Skeleton.Input active size="small" style={{ width: 240 }} />
        </div>
      </div>
      {cards > 0 && (
        <Row gutter={[12, 12]}>
          {Array.from({ length: cards }).map((_, i) => (
            <Col xs={12} lg={6} key={i}>
              <Card size="small">
                <Skeleton active paragraph={{ rows: 1 }} title={{ width: "40%" }} />
              </Card>
            </Col>
          ))}
        </Row>
      )}
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    </Space>
  );
}
