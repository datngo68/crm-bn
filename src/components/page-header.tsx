"use client";

import { Space, Typography } from "antd";

type Props = {
  title: string;
  description?: string;
  extra?: React.ReactNode;
};

export function PageHeader({ title, description, extra }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 20,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <Typography.Title
          level={3}
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 650,
            letterSpacing: "-0.02em",
            color: "#0F172A",
          }}
        >
          {title}
        </Typography.Title>
        {description ? (
          <Typography.Text
            type="secondary"
            style={{ fontSize: 13, display: "block", marginTop: 4 }}
          >
            {description}
          </Typography.Text>
        ) : null}
      </div>
      {extra ? <Space wrap>{extra}</Space> : null}
    </div>
  );
}
