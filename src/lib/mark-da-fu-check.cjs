/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS Node check. */
// Run: node src/lib/mark-da-fu-check.cjs (no database writes).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, dependencies) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(`${__dirname}/${file}`, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (name) => dependencies[name] });
  return exports;
}

const followUp = load("follow-up.ts", {
  "@/lib/utils": { addDaysISO: (days, date) => new Date(+date + days * 86400000).toISOString().slice(0, 10) },
});

function clientStub(writes, results) {
  return {
    createClient: () => ({
      from: (table) => {
        assert.equal(table, "inquiries");
        return {
          update: (dates) => {
            const filters = {};
            const chain = {
              eq: (column, value) => {
                filters[column] = value;
                return chain;
              },
              select: () => ({
                single: async () => {
                  assert.equal(filters.id, "test-id");
                  writes.push({ dates: JSON.parse(JSON.stringify(dates)), filters: { ...filters } });
                  const queued = results.shift();
                  const result = typeof queued === "function" ? queued(filters, dates) : queued;
                  if (result instanceof Error) throw result;
                  if (result && typeof result === "object" && "error" in result) return result;
                  return { data: result ?? null, error: null };
                },
              }),
            };
            return chain;
          },
        };
      },
    }),
  };
}

async function check(results, { undo = true, expectWrites = 2, conflict = false } = {}) {
  const writes = [];
  const errors = [];
  let applied = 0;
  let reverted = 0;
  let restoredAt;
  let savedAt;
  let undoAllowed = false;
  let undoEnded = 0;
  let toast;
  const { markDaFu } = load("mark-da-fu.ts", {
    react: { createElement: (type, props, ...children) => ({ type, props, children }) },
    antd: { Button: "button" },
    "@/lib/follow-up": followUp,
    "@/lib/supabase/client": clientStub(writes, results),
  });
  const prev = {
    last_follow_up_date: null,
    next_follow_up_date: "2026-09-06",
    updated_at: "v0",
  };
  const promise = markDaFu({
    id: "test-id",
    prev,
    today: "2026-09-07",
    defaultFollowUpDays: 3,
    message: {
      error: (error) => errors.push(error),
      open: (value) => {
        toast = value;
      },
      destroy: () => {},
    },
    onOptimisticApply: () => {
      applied++;
    },
    onRevert: (updatedAt) => {
      reverted++;
      restoredAt = updatedAt;
    },
    onSaved: (updatedAt) => { savedAt = updatedAt; },
    onUndoStart: () => undoAllowed,
    onUndoEnd: () => { undoEnded++; },
  });
  assert.equal(applied, 1, "optimistic callback is synchronous");
  const success = await promise;
  assert.deepEqual(writes[0]?.dates, {
    last_follow_up_date: "2026-09-07",
    next_follow_up_date: "2026-09-10",
  });
  assert.equal(writes[0]?.filters.updated_at, "v0");
  if (!success) {
    assert.equal(reverted, 1);
    assert.equal(toast, undefined);
    assert.equal(errors.length, 1);
    assert.equal(writes.length, 1);
    return;
  }
  assert.equal(toast.duration, 5);
  assert.equal(toast.key, "dafu-test-id");
  assert.equal(toast.content.children[0], "Next FU = 10/09/2026 ");
  assert.equal(savedAt, "v1", "save publishes current row version");
  const click = toast.content.children[1].props.onClick;
  await click();
  assert.equal(writes.length, 1, "busy inquiry blocks Undo without consuming it");
  undoAllowed = true;
  await click();
  await click();
  assert.equal(undoEnded, 1, "Undo releases its lock on success or failure");
  assert.equal(writes.length, expectWrites, "write count matches scenario");
  if (expectWrites > 1) {
    assert.deepEqual(writes[1].dates, {
      last_follow_up_date: null,
      next_follow_up_date: "2026-09-06",
    });
    assert.equal(writes[1].filters.updated_at, "v1", "Undo uses version from save");
  }
  assert.equal(reverted, undo ? 1 : 0);
  assert.equal(errors.length, undo ? 0 : 1);
  if (undo) assert.equal(restoredAt, "v2");
  if (conflict) assert.match(String(errors[0]), /thay đổi|quyền/);
}

async function checkDashboard(nextDate, days, expected) {
  const state = [];
  let index = 0;
  let callbacks;
  const element = (type, props) => ({ type, props });
  const { DashboardClient } = load("../components/dashboard-client.tsx", {
    "react/jsx-runtime": { jsx: element, jsxs: element },
    react: { useState: (initial) => {
      const slot = index++;
      if (!(slot in state)) state[slot] = initial;
      return [state[slot], (value) => { state[slot] = typeof value === "function" ? value(state[slot]) : value; }];
    } },
    "next/link": { default: "link" },
    antd: { App: { useApp: () => ({ message: {} }) }, List: { Item: { Meta: "meta" } }, Typography: { Text: "text" } },
    "@ant-design/icons": {},
    "@/lib/utils": { formatUsd: () => "" },
    "@/lib/follow-up": followUp,
    "@/components/page-header": {},
    "@/lib/mark-da-fu": { markDaFu: async (args) => {
      callbacks = args;
      args.onOptimisticApply(followUp.daFuPatch(args.today, args.defaultFollowUpDays));
    } },
  });
  const row = { id: "test-id", next_follow_up_date: nextDate, last_follow_up_date: null, updated_at: "v0" };
  const props = { today: "2026-09-07", overdue: 70, dueToday: 20, focus: [row], defaultFollowUpDays: days };
  const render = () => { index = 0; return DashboardClient(props); };
  const tree = render();
  const list = tree.props.children[1].props.children;
  await list.props.renderItem(row).props.actions[0].props.onClick();
  assert.deepEqual(JSON.parse(JSON.stringify(state[2])), expected);
  assert.equal(state[0].length, 0);
  callbacks.onRevert("v2");
  assert.deepEqual(JSON.parse(JSON.stringify(state[2])), { overdue: 70, dueToday: 20 });
  assert.equal(state[0][0].updated_at, "v2");
  render();
}

(async () => {
  await check([{ updated_at: "v1" }, { updated_at: "v2" }], { undo: true });
  await check([{ error: { message: "write failed" } }]);
  await check([new Error("network failed")]);
  await check([{ updated_at: "v1" }, { error: { message: "undo failed" } }], { undo: false });
  const laterEdit = { updated_at: "v-later", next_follow_up_date: "2026-10-01", action_plan: "Keep later edit" };
  const rejectStale = (filters, dates) => {
    if (filters.updated_at !== laterEdit.updated_at) return null;
    Object.assign(laterEdit, dates);
    return laterEdit;
  };
  await check([rejectStale], { conflict: true });
  await check([{ updated_at: "v1" }, rejectStale], { undo: false, conflict: true });
  assert.equal(laterEdit.next_follow_up_date, "2026-10-01", "stale save/Undo cannot overwrite later dates");
  assert.equal(laterEdit.action_plan, "Keep later edit");
  await check([null], { conflict: true }); // zero-row save → .single() data null
  await check([{ error: { code: "PGRST116", message: "0 rows" } }], { conflict: true });
  await check([{ updated_at: "v1" }, null], { undo: false, expectWrites: 2, conflict: true }); // stale Undo
  await checkDashboard("2026-09-06", 3, { overdue: 69, dueToday: 20 });
  await checkDashboard("2026-09-07", 3, { overdue: 70, dueToday: 19 });
  await checkDashboard("2026-09-06", 0, { overdue: 69, dueToday: 21 });
  await checkDashboard("2026-09-07", 0, { overdue: 70, dueToday: 20 });
  console.log(
    "mark-da-fu-check: ok (success, rollback, network, Undo fail, zero-row save, PGRST116, stale Undo, KPI delta)",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
