// Run: node src/lib/mark-da-fu-check.cjs (no database writes).
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, dependencies) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(`${__dirname}/${file}`, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (name) => dependencies[name] });
  return exports;
}

const followUp = load("follow-up.ts", {
  "@/lib/utils": { addDaysISO: (days, date) => new Date(+date + days * 86400000).toISOString().slice(0, 10) },
});

async function check(results, undo) {
  const writes = [];
  const errors = [];
  let applied = 0;
  let reverted = 0;
  let toast;
  const { markDaFu } = load("mark-da-fu.ts", {
    react: { createElement: (type, props, ...children) => ({ type, props, children }) },
    antd: { Button: "button" },
    "@/lib/follow-up": followUp,
    "@/lib/supabase/client": { createClient: () => ({ from: (table) => {
      assert.equal(table, "inquiries");
      return { update: (dates) => ({ eq: async (column, id) => {
        assert.equal(column, "id");
        assert.equal(id, "test-id");
        writes.push(JSON.parse(JSON.stringify(dates)));
        const result = results.shift();
        if (result instanceof Error) throw result;
        return { error: result };
      } }) };
    } }) },
  });
  const prev = { last_follow_up_date: null, next_follow_up_date: "2026-09-06" };
  const promise = markDaFu({
    id: "test-id", prev, today: "2026-09-07", defaultFollowUpDays: 3,
    message: { error: (error) => errors.push(error), open: (value) => { toast = value; }, destroy: () => {} },
    onOptimisticApply: () => { applied++; }, onRevert: () => { reverted++; },
  });
  assert.equal(applied, 1, "optimistic callback is synchronous");
  const success = await promise;
  assert.deepEqual(writes[0], { last_follow_up_date: "2026-09-07", next_follow_up_date: "2026-09-10" });
  if (!success) {
    assert.equal(reverted, 1);
    assert.equal(toast, undefined);
    assert.equal(errors.length, 1);
    return;
  }
  assert.equal(toast.duration, 5);
  assert.equal(toast.key, "dafu-test-id");
  assert.equal(toast.content.children[0], "Next FU = 10/09/2026 ");
  const click = toast.content.children[1].props.onClick;
  await click();
  await click();
  assert.equal(writes.length, 2, "double Undo writes only once");
  assert.deepEqual(writes[1], prev);
  assert.equal(reverted, undo ? 1 : 0);
  assert.equal(errors.length, undo ? 0 : 1);
}

(async () => {
  await check([null, null], true);
  await check([{ message: "write failed" }]);
  await check([new Error("network failed")]);
  await check([null, { message: "undo failed" }], false);
  console.log("mark-da-fu-check: ok (success, rollback, network error, Undo failure, double Undo)");
})().catch((error) => { console.error(error); process.exitCode = 1; });
