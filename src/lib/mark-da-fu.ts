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
  prev: FuDateSnapshot;
  today: string;
  defaultFollowUpDays: number;
  message: MessageInstance;
  /** Dashboard: remove row; List: set dates in place */
  onOptimisticApply: (patch: FuDateSnapshot) => void;
  /** Restore UI after failed patch or successful Undo */
  onRevert: () => void;
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

  async function save(dates: FuDateSnapshot) {
    try {
      const { error } = await createClient().from("inquiries").update(dates).eq("id", id);
      if (error) throw error;
      return true;
    } catch (error) {
      message.error(
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Không thể lưu ngày follow-up. Vui lòng thử lại.",
      );
      return false;
    }
  }

  if (!(await save(patch))) {
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
            if (await save(prev)) onRevert();
          },
        },
        "Undo",
      ),
    ),
    duration: 5,
  });
  return true;
}
