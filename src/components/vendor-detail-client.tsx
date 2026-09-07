"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { App, Button, Card, Empty, List, Tag } from "antd";
import {
  EyeInvisibleOutlined,
  PlusOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { createClient } from "@/lib/supabase/client";
import { formatUsd } from "@/lib/utils";
import type { Inquiry, InquiryStatus, Vendor } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { statusTagColor } from "@/lib/theme";

type Props = { vendor: Vendor; inquiries: Inquiry[] };

export function VendorDetailClient({ vendor, inquiries }: Props) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [busy, setBusy] = useState(false);
  const isArchived = Boolean(vendor.archived_at);

  function archiveVendor() {
    modal.confirm({
      title: `Ẩn vendor "${vendor.name}"?`,
      content: "Tất cả inquiry của vendor này cũng sẽ bị ẩn.",
      okText: "Ẩn",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        setBusy(true);
        const supabase = createClient();
        const now = new Date().toISOString();
        const { error } = await supabase
          .from("vendors")
          .update({ archived_at: now })
          .eq("id", vendor.id);
        if (error) {
          setBusy(false);
          message.error(error.message);
          return;
        }
        await supabase
          .from("inquiries")
          .update({ archived_at: now })
          .eq("vendor_id", vendor.id)
          .is("archived_at", null);
        setBusy(false);
        message.success("Đã ẩn");
        router.push("/vendors");
        router.refresh();
      },
    });
  }

  async function restoreVendor() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("vendors")
      .update({ archived_at: null })
      .eq("id", vendor.id);
    if (error) {
      setBusy(false);
      message.error(error.message);
      return;
    }
    await supabase
      .from("inquiries")
      .update({ archived_at: null })
      .eq("vendor_id", vendor.id)
      .not("archived_at", "is", null);
    setBusy(false);
    message.success("Đã khôi phục");
    router.push("/vendors");
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title={vendor.name}
        description={`${vendor.is_new ? "New" : "Existing"} · ${inquiries.length} inquiry${isArchived ? " · Đã ẩn" : ""}`}
        extra={
          <>
            <Link href="/vendors">
              <Button>Quay lại</Button>
            </Link>
            {isArchived ? (
              <Button
                icon={<UndoOutlined />}
                loading={busy}
                onClick={() => void restoreVendor()}
              >
                Khôi phục
              </Button>
            ) : (
              <>
                <Button
                  danger
                  icon={<EyeInvisibleOutlined />}
                  loading={busy}
                  onClick={archiveVendor}
                >
                  Ẩn
                </Button>
                <Link href={`/inquiries/new?vendor=${vendor.id}`}>
                  <Button type="primary" icon={<PlusOutlined />}>
                    Inquiry mới
                  </Button>
                </Link>
              </>
            )}
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
