// Run: node src/components/inquiry-list-client-check.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

// Exercise the component's actual filter state block without a browser/test framework.
const source = readFileSync(new URL("./inquiry-list-client.tsx", import.meta.url), "utf8");
const block = source.slice(source.indexOf("  const searchParams = useSearchParams();"), source.indexOf("  const [sort, setSort]"));
assert.ok(block.includes("setPrevUrlFilters"));
const code = ts.transpile(`(() => { ${block}
  return { q, status, vendorId, focus, setQ, setStatus, setVendorId, setFocus };
})()`);
const types = ts.transpile(readFileSync(new URL("../lib/types.ts", import.meta.url), "utf8"), { module: ts.ModuleKind.CommonJS });
const exports = {};
runInNewContext(types, { exports });
const slots = [];
let index = 0;
let dirty = false;
function render(query) {
  let result;
  let attempts = 0;
  do {
    assert.ok(++attempts < 5, "render must converge");
    index = 0;
    dirty = false;
    result = runInNewContext(code, {
      STATUSES: exports.STATUSES,
      useSearchParams: () => new URLSearchParams(query),
      useState(initial) {
        const slot = index++;
        if (!(slot in slots)) slots[slot] = initial;
        return [slots[slot], (value) => { slots[slot] = value; dirty = true; }];
      },
    });
  } while (dirty);
  return result;
}
function values(state) {
  return [state.q, state.status, state.vendorId, state.focus];
}
const firstUrl = "q=zip&status=Pending&vendor=v1&focus=due";
let state = render(firstUrl);
assert.deepEqual(values(state), ["zip", "Pending", "v1", "due"]);
state.setQ("instant local edit");
assert.equal(render(firstUrl).q, "instant local edit");
state = render("status=Ordered&focus=overdue");
assert.deepEqual(values(state), ["", "Ordered", undefined, "overdue"]);
assert.deepEqual(values(render(firstUrl)), ["zip", "Pending", "v1", "due"]);
assert.deepEqual(values(render("status=invalid&focus=invalid&vendor=")), ["", undefined, undefined, undefined]);
for (const status of exports.STATUSES) {
  assert.equal(render(new URLSearchParams({ status }).toString()).status, status);
}
assert.deepEqual(values(render("")), ["", undefined, undefined, undefined]);
// Exercise the actual list action functions with deferred network callbacks.
const actions = source.slice(source.indexOf("  const activeIds = useRef"), source.indexOf("  function openCreate"));
const actionCode = ts.transpile(`(() => { ${actions}
  return { handleDaFu, patch, lock, unlock, canDaFu, drawerDate };
})()`, { jsx: ts.JsxEmit.ReactJSX });
let rows = [{ id: "i1", status: "Pending", next_follow_up_date: "2026-09-06", last_follow_up_date: null, updated_at: "v0", brand: "keep" }];
const editRow = rows[0];
const fields = { next_follow_up_date: editRow.next_follow_up_date, brand: "local draft" };
const refs = [];
let refIndex;
let callbacks;
let finishFu;
let finishSave;
const writes = [];
function renderActions() {
  refIndex = 0;
  const effects = [];
  const result = runInNewContext(actionCode, {
    exports: {}, require: () => ({}),
    rows, editRow, today: "2026-09-07", defaultFollowUpDays: 3,
    useRef: (initial) => refs[refIndex++] ?? (refs[refIndex - 1] = { current: initial }),
    useState: (initial) => [initial, () => {}],
    useEffect: (fn) => effects.push(fn),
    setRows: (next) => { rows = next; },
    editForm: { getFieldValue: (key) => fields[key], setFieldValue: (key, value) => { fields[key] = value; } },
    message: { error: () => {}, destroy: () => {} },
    markDaFu: (args) => {
      callbacks = args;
      args.onOptimisticApply({ last_follow_up_date: "2026-09-07", next_follow_up_date: "2026-09-10" });
      return new Promise((resolve) => { finishFu = resolve; });
    },
    createClient: () => ({ from: () => ({ update: (data) => {
      const write = { data, filters: {} };
      writes.push(write);
      const chain = {
        eq: (key, value) => { write.filters[key] = value; return chain; },
        select: () => ({ single: () => new Promise((resolve) => { finishSave = resolve; }) }),
      };
      return chain;
    } }) }),
  });
  if (refs[2].current === null) refs[2].current = editRow.next_follow_up_date;
  effects.forEach((fn) => fn());
  return result;
}
let api = renderActions();
assert.equal(api.canDaFu(rows[0]), true);
assert.equal(api.canDaFu({ ...rows[0], status: "Ordered" }), false);
assert.equal(api.canDaFu({ ...rows[0], next_follow_up_date: null }), false);
const fu = api.handleDaFu("i1");
assert.equal(rows.length, 1, "full list keeps optimistic row");
assert.equal(rows[0].next_follow_up_date, "2026-09-10");
assert.equal(rows[0].brand, "keep");
assert.equal(await api.patch("i1", { brand: "blocked" }), false);
await api.handleDaFu("i1");
api = renderActions();
assert.equal(fields.next_follow_up_date, "2026-09-10", "drawer follows optimistic date");
assert.equal(fields.brand, "local draft", "drawer preserves other local fields");
callbacks.onSaved("v1");
finishFu(true);
await fu;
assert.equal(rows[0].updated_at, "v1");
assert.equal(callbacks.onUndoStart(), true);
assert.equal(await api.patch("i1", { brand: "blocked during Undo" }), false);
callbacks.onRevert("v2");
callbacks.onUndoEnd();
api = renderActions();
assert.equal(rows[0].updated_at, "v2");
assert.equal(fields.next_follow_up_date, "2026-09-06", "drawer follows Undo");
const save = api.patch("i1", { brand: "saved" });
assert.equal(writes[0].filters.updated_at, "v2", "save uses Undo version");
assert.equal(callbacks.onUndoStart(), false, "Undo cannot overlap save");
finishSave({ data: { updated_at: "v3" }, error: null });
assert.equal(await save, true);
assert.equal(rows[0].updated_at, "v3");
api = renderActions();
fields.next_follow_up_date = "2026-10-01";
const failedFu = api.handleDaFu("i1");
assert.equal(callbacks.prev.updated_at, "v3", "FU uses latest edit version");
api = renderActions();
assert.equal(fields.next_follow_up_date, "2026-10-01", "preserve explicit local date edit");
callbacks.onRevert();
finishFu(false);
await failedFu;
assert.equal(rows[0].next_follow_up_date, "2026-09-06");
assert.equal(rows[0].brand, "saved", "rollback restores dates only");
assert.equal(rows[0].updated_at, "v3");
const mobile = source.slice(source.indexOf("      ) : isMobile ? ("), source.indexOf("            rowKey="));
assert.ok(!mobile.includes("<button"), "mobile actions are not nested buttons");
assert.equal((source.match(/daFuButton\((?:r|currentEditRow)\)/g) ?? []).length, 3, "FU in desktop, mobile and drawer");
console.log("inquiry-list-client-check: ok (filters, FU, Undo, versions, locks, drawer drafts, mobile)");
