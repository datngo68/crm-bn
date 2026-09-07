"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import { crmTheme } from "@/lib/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AntdRegistry>
      <ConfigProvider locale={viVN} theme={crmTheme}>
        <App>{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
