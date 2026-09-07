"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Input, Space } from "antd";
import { createClient } from "@/lib/supabase/client";

export function VendorCreate() {
  const router = useRouter();
  const { message } = App.useApp();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function create() {
    const n = name.trim();
    if (!n) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("vendors").insert({ name: n });
    setLoading(false);
    if (error) {
      message.error(error.message);
      return;
    }
    message.success("Đã tạo vendor");
    setName("");
    router.refresh();
  }

  return (
    <Space.Compact style={{ width: "100%", maxWidth: 480 }}>
      <Input
        placeholder="Tên vendor mới…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onPressEnter={create}
      />
      <Button type="primary" loading={loading} onClick={create}>
        Thêm vendor
      </Button>
    </Space.Compact>
  );
}
