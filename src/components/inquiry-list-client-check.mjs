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
console.log("inquiry-list-client-check: ok");
