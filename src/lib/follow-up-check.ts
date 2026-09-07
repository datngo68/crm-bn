import assert from "node:assert/strict";
import {
  daFuPatch,
  formatFuDate,
  isDueOrOverdue,
  isDueToday,
  isOverdue,
} from "./follow-up";

const today = "2026-09-07";

assert.equal(isOverdue("2026-09-06", today), true);
assert.equal(isOverdue("2026-09-07", today), false);
assert.equal(isOverdue(null, today), false);
assert.equal(isDueToday("2026-09-07", today), true);
assert.equal(isDueToday("2026-09-08", today), false);
assert.equal(isDueOrOverdue("2026-09-06", today), true);
assert.equal(isDueOrOverdue("2026-09-07", today), true);
assert.equal(isDueOrOverdue("2026-09-08", today), false);

const patch = daFuPatch(today, 3);
assert.equal(patch.last_follow_up_date, "2026-09-07");
assert.equal(patch.next_follow_up_date, "2026-09-10");

const patchFallback = daFuPatch(today, Number.NaN);
assert.equal(patchFallback.next_follow_up_date, "2026-09-10"); // NaN → 3

assert.equal(formatFuDate("2026-09-10"), "10/09/2026");

console.log("follow-up-check: ok");
