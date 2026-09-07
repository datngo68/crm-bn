"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Card, Form, Input, Typography } from "antd";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  async function onFinish(values: { email: string; password: string }) {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    setLoading(false);
    if (error) {
      message.error(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "radial-gradient(1200px 600px at 10% -10%, #e2e8f0 0%, transparent 55%), #F8FAFC",
      }}
    >
      <Card
        style={{ width: "100%", maxWidth: 400, borderRadius: 12 }}
        styles={{ body: { padding: 28 } }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#0F172A",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            CI
          </span>
          <Typography.Text strong>CRM Inquiry</Typography.Text>
        </div>
        <Typography.Title level={4} style={{ margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Đăng nhập
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 24, fontSize: 13 }}>
          Workspace theo dõi inquiry và follow-up
        </Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish} requiredMark={false} size="middle">
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, type: "email", message: "Nhập email hợp lệ" }]}
          >
            <Input autoComplete="email" placeholder="you@company.com" />
          </Form.Item>
          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: "Nhập mật khẩu" }]}
          >
            <Input.Password autoComplete="current-password" placeholder="••••••••" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Tiếp tục
          </Button>
        </Form>
      </Card>
    </div>
  );
}
