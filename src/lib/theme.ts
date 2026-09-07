import type { ThemeConfig } from "antd";

/** Enterprise Soft UI — navy/slate, accent sky restrained (Twenty/Linear-ish) */
export const crmTheme: ThemeConfig = {
  token: {
    colorPrimary: "#0F172A",
    colorInfo: "#0369A1",
    colorSuccess: "#15803D",
    colorWarning: "#B45309",
    colorError: "#DC2626",
    colorBgBase: "#F8FAFC",
    colorBgContainer: "#FFFFFF",
    colorBgLayout: "#F1F5F9",
    colorBorder: "#E2E8F0",
    colorBorderSecondary: "#F1F5F9",
    colorText: "#0F172A",
    colorTextSecondary: "#64748B",
    colorTextTertiary: "#94A3B8",
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    fontFamily:
      'var(--font-jakarta), "Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
    fontSize: 14,
    controlHeight: 36,
    controlHeightLG: 40,
    boxShadow:
      "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
    boxShadowSecondary:
      "0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.04)",
  },
  components: {
    Layout: {
      siderBg: "#FFFFFF",
      headerBg: "#FFFFFF",
      bodyBg: "#F8FAFC",
      triggerBg: "#0F172A",
    },
    Menu: {
      itemBorderRadius: 8,
      itemMarginInline: 8,
      itemHeight: 40,
      iconSize: 16,
      itemSelectedBg: "#F1F5F9",
      itemSelectedColor: "#0F172A",
      itemHoverBg: "#F8FAFC",
      activeBarBorderWidth: 0,
    },
    Button: {
      primaryShadow: "none",
      defaultShadow: "none",
      fontWeight: 500,
    },
    Card: {
      paddingLG: 20,
      headerFontSize: 15,
    },
    Table: {
      headerBg: "#F8FAFC",
      headerColor: "#64748B",
      headerSplitColor: "transparent",
      rowHoverBg: "#F8FAFC",
      borderColor: "#F1F5F9",
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
      fontSize: 13,
    },
    Form: {
      itemMarginBottom: 16,
      verticalLabelPadding: "0 0 6px",
      labelFontSize: 13,
      labelColor: "#475569",
    },
    Input: {
      activeBorderColor: "#0F172A",
      hoverBorderColor: "#94A3B8",
    },
    Select: {
      optionSelectedBg: "#F1F5F9",
    },
    Tabs: {
      titleFontSize: 14,
      horizontalItemGutter: 24,
      inkBarColor: "#0F172A",
      itemSelectedColor: "#0F172A",
      itemHoverColor: "#334155",
    },
    Tag: {
      defaultBg: "#F1F5F9",
      defaultColor: "#334155",
    },
    Statistic: {
      contentFontSize: 28,
      titleFontSize: 13,
    },
  },
};

export const statusTagColor: Record<string, string> = {
  Pending: "processing",
  Ordered: "success",
  Lost: "error",
  "No Order": "default",
};
