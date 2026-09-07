"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Layout, Menu, Button, Grid, Drawer } from "antd";
import {
  DashboardOutlined,
  UnorderedListOutlined,
  BankOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const { Header, Content } = Layout;
const { useBreakpoint } = Grid;

const items = [
  { key: "/", icon: <DashboardOutlined />, label: <Link href="/">Dashboard</Link> },
  {
    key: "/inquiries",
    icon: <UnorderedListOutlined />,
    label: <Link href="/inquiries">Inquiry</Link>,
  },
  {
    key: "/vendors",
    icon: <BankOutlined />,
    label: <Link href="/vendors">Vendor</Link>,
  },
  {
    key: "/settings",
    icon: <SettingOutlined />,
    label: <Link href="/settings">Cài đặt</Link>,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const screens = useBreakpoint();
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/login")) return <>{children}</>;

  const selected =
    items.find((i) =>
      i.key === "/" ? pathname === "/" : pathname.startsWith(i.key),
    )?.key ?? "/";

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const menu = (
    <Menu
      mode={screens.md ? "horizontal" : "inline"}
      selectedKeys={[selected]}
      items={items}
      onClick={() => setOpen(false)}
      style={screens.md ? { flex: 1, minWidth: 0, border: "none" } : undefined}
    />
  );

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f7fb" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "#fff",
          borderBottom: "1px solid #eef2f7",
          padding: "0 16px",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        {!screens.md && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setOpen(true)}
          />
        )}
        <Link href="/" style={{ fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
          CRM Inquiry
        </Link>
        {screens.md && menu}
        <div style={{ marginLeft: "auto" }}>
          <Button type="text" icon={<LogoutOutlined />} onClick={logout}>
            {screens.md ? "Thoát" : null}
          </Button>
        </div>
      </Header>
      <Drawer
        title="Menu"
        placement="left"
        open={open}
        onClose={() => setOpen(false)}
        width={260}
      >
        {menu}
      </Drawer>
      <Content style={{ maxWidth: 1200, width: "100%", margin: "0 auto", padding: 16 }}>
        {children}
      </Content>
    </Layout>
  );
}
