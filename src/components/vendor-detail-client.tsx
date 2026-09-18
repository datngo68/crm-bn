"use client";

import Link from "next/link";
import { Button, Card, Empty, Space, Table, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { Inquiry, InquiryStatus, Vendor } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { statusTagColor } from "@/lib/theme";

type Props = { vendor: Vendor; inquiries: Inquiry[] };

export function VendorDetailClient({ vendor, inquiries }: Props) {
  const items = inquiries.flatMap((inquiry) =>
    (inquiry.inquiry_items?.length ? inquiry.inquiry_items : [{
      id: `${inquiry.id}-legacy`,
      inquiry_id: inquiry.id,
      sort_order: 0,
      brand: inquiry.brand,
      rbo_code: inquiry.item_code,
      quantity: inquiry.monthly_projection,
      price: inquiry.unit_price_usd,
      currency: "USD" as const,
      incoterm: null,
      created_at: inquiry.created_at,
      updated_at: inquiry.updated_at,
    }]).map((item) => ({ item, inquiry })),
  );

  return (
    <div>
      <PageHeader
        title={vendor.name}
        description={`${vendor.is_new ? "New" : "Existing"} · ${inquiries.length} inquiry · ${items.length} dòng sản phẩm`}
        extra={
          <Space>
            <Link href="/vendors"><Button>Quay lại</Button></Link>
            <Link href={`/inquiries/new?vendor=${vendor.id}`}>
              <Button type="primary" icon={<PlusOutlined />}>Inquiry mới</Button>
            </Link>
          </Space>
        }
      />
      <Card style={{ borderRadius: 10 }} styles={{ body: { padding: 8 } }}>
        {items.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có inquiry" style={{ padding: 32 }} />
        ) : (
          <Table
            rowKey={(row) => row.item.id}
            dataSource={items}
            pagination={{ pageSize: 25 }}
            scroll={{ x: 900 }}
            columns={[
              { title: "Brand", dataIndex: ["item", "brand"], render: (v: string | null) => v || "-" },
              { title: "RBO code", dataIndex: ["item", "rbo_code"], render: (v: string | null) => v || "-" },
              { title: "Quantity", dataIndex: ["item", "quantity"], render: (v: number | null) => v ?? "-" },
              { title: "Price", render: (_, row) => row.item.price == null ? "-" : `${row.item.price.toLocaleString()} ${row.item.currency}` },
              { title: "Incoterm", dataIndex: ["item", "incoterm"], render: (v: string | null) => v || "-" },
              { title: "Inquiry", render: (_, row) => <Link href={`/inquiries/${row.inquiry.id}`}>{row.inquiry.received_date}</Link> },
              { title: "Status", render: (_, row) => <Tag color={statusTagColor[row.inquiry.status as InquiryStatus]}>{row.inquiry.status}</Tag> },
              { title: "Next FU", dataIndex: ["inquiry", "next_follow_up_date"], render: (v: string | null) => v ?? "-" },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
