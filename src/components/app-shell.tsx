"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Drawer, Grid, Layout, Menu, Typography } from "antd";
import {
  DashboardOutlined,
  UnorderedListOutlined,
  BankOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const { Sider, Header, Content } = Layout;
const { useBreakpoint } = Grid;

const NAV = [
  { key: "/", icon: <DashboardOutlined />, label: "Dashboard", href: "/" },
  {
    key: "/inquiries",
    icon: <UnorderedListOutlined />,
    label: "Inquiries",
    href: "/inquiries",
  },
  {
    key: "/vendors",
    icon: <BankOutlined />,
    label: "Vendors",
    href: "/vendors",
  },
  {
    key: "/settings",
    icon: <SettingOutlined />,
    label: "Settings",
    href: "/settings",
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const screens = useBreakpoint();
  const isDesktop = Boolean(screens.md);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const selected = useMemo(
    () =>
      NAV.find((i) =>
        i.key === "/" ? pathname === "/" : pathname.startsWith(i.key),
      )?.key ?? "/",
    [pathname],
  );

  if (pathname.startsWith("/login")) return <>{children}</>;

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const menu = (
    <Menu
      mode="inline"
      selectedKeys={[selected]}
      onClick={() => setMobileOpen(false)}
      style={{ border: "none", background: "transparent", paddingTop: 8 }}
      items={NAV.map((item) => ({
        key: item.key,
        icon: item.icon,
        label: <Link href={item.href}>{item.label}</Link>,
      }))}
    />
  );

  const brand = (
    <Link
      href="/"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: collapsed && isDesktop ? "0 12px" : "0 20px",
        height: 56,
        textDecoration: "none",
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: "#0F172A",
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        CI
      </span>
      {!(collapsed && isDesktop) && (
        <Typography.Text strong style={{ fontSize: 14, color: "#0F172A" }}>
          CRM Inquiry
        </Typography.Text>
      )}
    </Link>
  );

  return (
    <Layout style={{ minHeight: "100dvh", background: "#F8FAFC" }}>
      {isDesktop ? (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={232}
          collapsedWidth={72}
          theme="light"
          style={{
            borderRight: "1px solid #E2E8F0",
            position: "sticky",
            top: 0,
            height: "100dvh",
            overflow: "auto",
          }}
        >
          {brand}
          <div style={{ height: 1, background: "#F1F5F9", margin: "0 12px 4px" }} />
          {menu}
          <div style={{ position: "absolute", bottom: 48, left: 0, right: 0, padding: "0 8px" }}>
            <Button
              type="text"
              block
              icon={<LogoutOutlined />}
              onClick={logout}
              style={{
                justifyContent: collapsed ? "center" : "flex-start",
                height: 40,
                color: "#64748B",
              }}
            >
              {!collapsed && "Đăng xuất"}
            </Button>
          </div>
        </Sider>
      ) : null}

      <Layout>
        <Header
          style={{
            height: 56,
            lineHeight: "56px",
            padding: "0 20px",
            background: "#FFFFFF",
            borderBottom: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            gap: 12,
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          {!isDesktop && (
            <>
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileOpen(true)}
                aria-label="Mở menu"
              />
              {brand}
            </>
          )}
          <div style={{ marginLeft: "auto" }}>
            {!isDesktop && (
              <Button type="text" icon={<LogoutOutlined />} onClick={logout} aria-label="Đăng xuất" />
            )}
          </div>
        </Header>

        <Content
          style={{
            padding: isDesktop ? "24px 28px 40px" : "16px 16px 32px",
            maxWidth: 1280,
            width: "100%",
            margin: "0 auto",
          }}
        >
          {children}
        </Content>
      </Layout>

      <Drawer
        placement="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        width={260}
        styles={{ body: { padding: 0 } }}
        title={null}
        closable={false}
      >
        {brand}
        <div style={{ height: 1, background: "#F1F5F9", margin: "0 12px" }} />
        {menu}
      </Drawer>
    </Layout>
  );
}
