"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import {
  EyeInvisibleOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { VendorCreate } from "@/components/vendor-create";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/client";
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

export function VendorListClient({
  vendors: initial,
  stats,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const { message, modal } = App.useApp();
  const showArchived = sp.get("archived") === "1";

  const [vendors, setVendors] = useState(initial);
  const [prev, setPrev] = useState(initial);
  if (initial !== prev) {
    setPrev(initial);
    setVendors(initial);
  }
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadList(archived: boolean) {
    setLoading(true);
    const supabase = createClient();
    let q = supabase.from("vendors").select("*").order("name");
    q = archived ? q.not("archived_at", "is", null) : q.is("archived_at", null);
    const { data, error } = await q;
    setLoading(false);
    if (error) {
      message.error(error.message);
      return;
    }
    setVendors((data ?? []) as Vendor[]);
    const next = new URLSearchParams(sp.toString());
    if (archived) next.set("archived", "1");
    else next.delete("archived");
    router.replace(`/vendors?${next.toString()}`, { scroll: false });
  }

  function archiveVendor(v: Vendor) {
    modal.confirm({
      title: `Ẩn vendor "${v.name}"?`,
      content: "Tất cả inquiry của vendor này cũng sẽ bị ẩn. Có thể khôi phục sau.",
      okText: "Ẩn",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        setBusyId(v.id);
        const supabase = createClient();
        const now = new Date().toISOString();
        const { error: e1 } = await supabase
          .from("vendors")
          .update({ archived_at: now })
          .eq("id", v.id);
        if (e1) {
          setBusyId(null);
          message.error(e1.message);
          return;
        }
        // Cascade: hide all active inquiries of this vendor
        await supabase
          .from("inquiries")
          .update({ archived_at: now })
          .eq("vendor_id", v.id)
          .is("archived_at", null);
        setBusyId(null);
        setVendors((prev) => prev.filter((x) => x.id !== v.id));
        message.success("Đã ẩn vendor + inquiry liên quan");
      },
    });
  }

  async function restoreVendor(v: Vendor) {
    setBusyId(v.id);
    const supabase = createClient();
    const { error: e1 } = await supabase
      .from("vendors")
      .update({ archived_at: null })
      .eq("id", v.id);
    if (e1) {
      setBusyId(null);
      message.error(e1.message);
      return;
    }
    // Cascade restore inquiries that were archived with the vendor
    // (any archived under this vendor — pragmatic; user chose cascade)
    await supabase
      .from("inquiries")
      .update({ archived_at: null })
      .eq("vendor_id", v.id)
      .not("archived_at", "is", null);
    setBusyId(null);
    setVendors((prev) => prev.filter((x) => x.id !== v.id));
    message.success("Đã khôi phục vendor + inquiry");
  }

  return (
    <div>
      <PageHeader
        title={showArchived ? "Vendor đã ẩn" : "Vendors"}
        description="Gom inquiry theo từng khách"
        extra={
          <Space>
            <Space size={8}>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                Đã ẩn
              </Typography.Text>
              <Switch
                size="small"
                checked={showArchived}
                loading={loading}
                onChange={(c) => void loadList(c)}
              />
            </Space>
            {!showArchived && <VendorCreate />}
          </Space>
        }
      />

      {vendors.length === 0 && !loading ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            showArchived ? "Không có vendor đã ẩn" : "Chưa có vendor — tạo ở trên"
          }
          style={{
            padding: 48,
            background: "#fff",
            borderRadius: 10,
            border: "1px solid #E2E8F0",
          }}
        />
      ) : loading ? (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            background: "#fff",
            borderRadius: 10,
            border: "1px solid #E2E8F0",
            color: "#94A3B8",
            fontSize: 13,
          }}
        >
          Đang tải…
        </div>
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
                <Card
                  hoverable
                  style={{ borderRadius: 10, height: "100%" }}
                  styles={{ body: { padding: 18 } }}
                  actions={[
                    showArchived ? (
                      <Button
                        key="restore"
                        type="link"
                        icon={<UndoOutlined />}
                        loading={busyId === v.id}
                        onClick={() => void restoreVendor(v)}
                      >
                        Khôi phục
                      </Button>
                    ) : (
                      <Button
                        key="hide"
                        type="link"
                        danger
                        icon={<EyeInvisibleOutlined />}
                        loading={busyId === v.id}
                        onClick={() => archiveVendor(v)}
                      >
                        Ẩn
                      </Button>
                    ),
                  ]}
                >
                  <Link href={`/vendors/${v.id}`} style={{ color: "inherit" }}>
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
                      <Tag style={{ margin: 0 }}>
                        {v.is_new ? "New" : "Existing"}
                      </Tag>
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
                  </Link>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
}
