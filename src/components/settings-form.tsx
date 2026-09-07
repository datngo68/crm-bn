"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  App,
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Space,
  Switch,
  Tabs,
  Typography,
} from "antd";
import {
  DisconnectOutlined,
  LinkOutlined,
  SendOutlined,
} from "@ant-design/icons";
import type { AppSettings } from "@/lib/types";

type Props = { settings: AppSettings };

export function SettingsForm({ settings: initial }: Props) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [s, setS] = useState(initial);
  const [tokenInput, setTokenInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const connected = Boolean(s.telegram_chat_id);

  async function api(path: string, body?: Record<string, unknown>) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Lỗi");
    return data;
  }

  async function saveToken() {
    setBusy(true);
    try {
      const data = await api("/api/settings/telegram-token", {
        token: tokenInput.trim(),
      });
      setS(data.settings);
      setTokenInput("");
      message.success("Đã lưu bot token");
      router.refresh();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  }

  async function startConnect() {
    setBusy(true);
    try {
      const data = await api("/api/settings/telegram-connect");
      setConnectUrl(data.url);
      setS(data.settings);
      window.open(data.url, "_blank", "noopener,noreferrer");
      message.success("Mở Telegram → bấm Start");
      router.refresh();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  }

  async function testSend() {
    setBusy(true);
    try {
      await api("/api/settings/telegram-test");
      message.success("Đã gửi tin thử");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    modal.confirm({
      title: "Ngắt kết nối Telegram?",
      onOk: async () => {
        setBusy(true);
        try {
          const data = await api("/api/settings/telegram-disconnect");
          setS(data.settings);
          setConnectUrl(null);
          message.success("Đã ngắt kết nối");
          router.refresh();
        } catch (e) {
          message.error(e instanceof Error ? e.message : "Lỗi");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  async function saveRemindDefaults(values: Partial<AppSettings>) {
    setBusy(true);
    try {
      const data = await api("/api/settings/update", values);
      setS(data.settings);
      message.success("Đã lưu cài đặt");
      router.refresh();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  }

  const cardProps = { style: { borderRadius: 10 } as const };

  return (
    <Tabs
      items={[
        {
          key: "telegram",
          label: "Telegram",
          children: (
            <Card title="Kết nối Telegram" {...cardProps}>
              <Typography.Paragraph type="secondary" style={{ fontSize: 13 }}>
                Bấm Kết nối, rồi Start trong Telegram. Không cần nhập Chat ID.
              </Typography.Paragraph>
              <Alert
                style={{ marginBottom: 16 }}
                type={connected ? "success" : "warning"}
                showIcon
                message={
                  connected
                    ? `Đã kết nối${s.telegram_bot_username ? ` · @${s.telegram_bot_username}` : ""} · chat ${s.telegram_chat_id}`
                    : "Chưa kết nối"
                }
              />

              {!s.has_telegram_token && (
                <Card type="inner" title="Setup bot token (1 lần)" style={{ marginBottom: 16 }}>
                  <Typography.Paragraph type="secondary">
                    Tạo bot bằng{" "}
                    <a href="https://t.me/BotFather" target="_blank" rel="noreferrer">
                      @BotFather
                    </a>{" "}
                    rồi dán token.
                  </Typography.Paragraph>
                  <Space.Compact style={{ width: "100%" }}>
                    <Input.Password
                      placeholder="Bot token"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                    />
                    <Button
                      type="primary"
                      loading={busy}
                      disabled={!tokenInput}
                      onClick={saveToken}
                    >
                      Lưu token
                    </Button>
                  </Space.Compact>
                </Card>
              )}

              {s.has_telegram_token && (
                <Typography.Paragraph type="secondary">
                  Bot token đã lưu
                  {s.telegram_bot_username ? ` (@${s.telegram_bot_username})` : ""}.
                </Typography.Paragraph>
              )}

              <Space wrap>
                <Button
                  type="primary"
                  icon={<LinkOutlined />}
                  loading={busy}
                  disabled={!s.has_telegram_token}
                  onClick={startConnect}
                >
                  Kết nối Telegram
                </Button>
                {connectUrl && (
                  <Button href={connectUrl} target="_blank">
                    Mở lại link
                  </Button>
                )}
                <Button
                  icon={<SendOutlined />}
                  loading={busy}
                  disabled={!connected}
                  onClick={testSend}
                >
                  Gửi tin thử
                </Button>
                <Button
                  danger
                  icon={<DisconnectOutlined />}
                  loading={busy}
                  disabled={!connected}
                  onClick={disconnect}
                >
                  Ngắt kết nối
                </Button>
              </Space>
            </Card>
          ),
        },
        {
          key: "remind",
          label: "Luật nhắc",
          children: (
            <Card title="Luật nhắc follow-up" {...cardProps}>
              <Form
                layout="vertical"
                initialValues={s}
                onFinish={saveRemindDefaults}
                key={`remind-${s.updated_at}`}
              >
                <Form.Item
                  label="Nhắc từng inquiry khi đến hạn"
                  name="remind_per_item_enabled"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  label="Digest hàng ngày"
                  name="remind_digest_enabled"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
                <Form.Item label="Giờ digest (0–23)" name="digest_hour">
                  <InputNumber min={0} max={23} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item label="Timezone" name="timezone">
                  <Input />
                </Form.Item>
                <Form.Item
                  label="Quiet hours"
                  name="quiet_hours_enabled"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
                <Form.Item label="Quiet bắt đầu" name="quiet_start">
                  <InputNumber min={0} max={23} style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item label="Quiet kết thúc" name="quiet_end">
                  <InputNumber min={0} max={23} style={{ width: "100%" }} />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={busy}>
                  Lưu luật nhắc
                </Button>
              </Form>
            </Card>
          ),
        },
        {
          key: "defaults",
          label: "Mặc định",
          children: (
            <Card title="Mặc định nghiệp vụ" {...cardProps}>
              <Form
                layout="vertical"
                initialValues={s}
                onFinish={saveRemindDefaults}
                key={`defaults-${s.updated_at}`}
              >
                <Form.Item label="Owner mặc định" name="default_owner">
                  <Input />
                </Form.Item>
                <Form.Item
                  label="Số ngày Next Follow-up khi tạo mới"
                  name="default_follow_up_days"
                >
                  <InputNumber min={0} max={90} style={{ width: "100%" }} />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={busy}>
                  Lưu mặc định
                </Button>
              </Form>
            </Card>
          ),
        },
      ]}
    />
  );
}
