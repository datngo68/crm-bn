"use client";

import { createElement } from "react";
import { Button } from "antd";
import type { MessageInstance } from "antd/es/message/interface";
import { createClient } from "@/lib/supabase/client";
import { daFuPatch, formatFuDate } from "@/lib/follow-up";

export type FuDateSnapshot = {
  last_follow_up_date: string | null;
  next_follow_up_date: string | null;
};

type MarkDaFuArgs = {
  id: string;
  prev: FuDateSnapshot & { updated_at: string };
  today: string;
  defaultFollowUpDays: number;
  message: MessageInstance;
  /** Dashboard: remove row; List: set dates in place */
  onOptimisticApply: (patch: FuDateSnapshot) => void;
  /** Restore UI after failure; successful Undo supplies the new row version. */
  onRevert: (updatedAt?: string) => void;
};

/** One-tap Đã FU + Undo toast (5s). Shared by Dashboard and Inquiry list. */
export async function markDaFu({
  id,
  prev,
  today,
  defaultFollowUpDays,
  message,
  onOptimisticApply,
  onRevert,
}: MarkDaFuArgs): Promise<boolean> {
  const patch = daFuPatch(today, defaultFollowUpDays);
  onOptimisticApply(patch);

  async function save(dates: FuDateSnapshot, expectedVersion: string) {
    try {
      if (!expectedVersion) throw new Error("Thiếu phiên bản inquiry. Vui lòng tải lại trang.");
      const { data, error } = await createClient().from("inquiries")
        .update(dates).eq("id", id).eq("updated_at", expectedVersion)
        .select("updated_at").single();
      if (error?.code === "PGRST116" || (!error && !data?.updated_at)) {
        throw new Error("Inquiry đã thay đổi hoặc không còn quyền cập nhật. Vui lòng tải lại trang.");
      }
      if (error) throw error;
      return data.updated_at as string;
    } catch (error) {
      message.error(
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Không thể lưu ngày follow-up. Vui lòng thử lại.",
      );
      return false;
    }
  }

  const savedVersion = await save(patch, prev.updated_at);
  if (!savedVersion) {
    onRevert();
    return false;
  }

  let undone = false;
  const key = `dafu-${id}`;
  message.open({
    key,
    type: "success",
    content: createElement(
      "span",
      null,
      `Next FU = ${formatFuDate(patch.next_follow_up_date)} `,
      createElement(
        Button,
        {
          type: "link",
          size: "small",
          onClick: async () => {
            if (undone) return;
            undone = true;
            message.destroy(key);
            const restoredVersion = await save({
              last_follow_up_date: prev.last_follow_up_date,
              next_follow_up_date: prev.next_follow_up_date,
            }, savedVersion);
            if (restoredVersion) onRevert(restoredVersion);
          },
        },
        "Undo",
      ),
    ),
    duration: 5,
  });
  return true;
}
