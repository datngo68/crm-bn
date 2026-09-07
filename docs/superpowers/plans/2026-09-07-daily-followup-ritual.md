# Daily Follow-up Ritual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Solo sales opens Dashboard, sees today’s due/overdue follow-ups, marks each done in one tap (Đã FU + Undo 5s), and KPI/deep-links open the Inquiries list with the correct filters.

**Architecture:** Pure helpers in `src/lib/follow-up.ts` compute due/overdue and the Đã FU date patch. Dashboard and Inquiries share the same patch semantics via a small client helper (or inline identical update). List initializes `status`/`focus` from URL search params on mount. No new DB tables.

**Tech Stack:** Next.js 16 App Router, React 19, Ant Design 6, Supabase JS client, existing `todayISO` / `addDaysISO` in `src/lib/utils.ts`.

**Spec:** `docs/superpowers/specs/2026-09-07-daily-followup-ritual-design.md`

## Global Constraints

- Primary user: solo sales (1 person) — no multi-owner UX.
- Đã FU is **instant** + toast **Undo 5s** — no confirm modal, no required note.
- On Đã FU: set `last_follow_up_date` = today; `next_follow_up_date` = today + `default_follow_up_days` (fallback **3**); leave `status` unchanged.
- No new tables / activity log.
- Out of scope: bulk, pipeline, archive UI, snooze presets, pick-Next-FU dialog.
- Labels stay: Item code (`item_name`), RBO code (`item_code`), etc.
- Tests: assert-based self-check script (no Jest/Vitest in repo) — run with `npx tsx`.

## File map

| File | Responsibility |
|------|----------------|
| Create `src/lib/follow-up.ts` | Pure: due/overdue checks, Đã FU patch + undo payload, toast date label |
| Create `src/lib/follow-up-check.ts` | Runnable asserts for helpers |
| Modify `src/app/page.tsx` | Fetch focus rows (no tiny limit), pass `defaultFollowUpDays` + richer fields |
| Modify `src/components/dashboard-client.tsx` | “Hôm nay” inbox, Đã FU + Undo, KPI links, Sửa → detail |
| Modify `src/components/inquiry-list-client.tsx` | Init filters from URL; Đã FU on due/overdue Pending rows + drawer |
| Verify `src/lib/telegram.ts` | Links already present — smoke assert only if broken |

---

### Task 1: Follow-up pure helpers + self-check

**Files:**
- Create: `src/lib/follow-up.ts`
- Create: `src/lib/follow-up-check.ts`
- Test: run `npx tsx src/lib/follow-up-check.ts`

**Interfaces:**
- Consumes: `todayISO`, `addDaysISO` from `@/lib/utils`
- Produces:
  - `isOverdue(nextFu: string | null, today: string): boolean`
  - `isDueToday(nextFu: string | null, today: string): boolean`
  - `isDueOrOverdue(nextFu: string | null, today: string): boolean`
  - `daFuPatch(today: string, defaultFollowUpDays: number): { last_follow_up_date: string; next_follow_up_date: string }`
  - `formatFuDate(iso: string): string` — `DD/MM/YYYY` for toast

- [ ] **Step 1: Write self-check (fails until helpers exist)**

Create `src/lib/follow-up-check.ts`:

```ts
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
```

- [ ] **Step 2: Run check — expect FAIL (module missing)**

Run: `npx tsx src/lib/follow-up-check.ts`  
Expected: error resolving `./follow-up` or missing exports.

- [ ] **Step 3: Implement helpers**

Create `src/lib/follow-up.ts`:

```ts
import { addDaysISO } from "@/lib/utils";

export function isOverdue(nextFu: string | null | undefined, today: string) {
  return Boolean(nextFu && nextFu < today);
}

export function isDueToday(nextFu: string | null | undefined, today: string) {
  return nextFu === today;
}

export function isDueOrOverdue(nextFu: string | null | undefined, today: string) {
  return Boolean(nextFu && nextFu <= today);
}

export function daFuPatch(today: string, defaultFollowUpDays: number) {
  const days =
    Number.isFinite(defaultFollowUpDays) && defaultFollowUpDays >= 0
      ? Math.floor(defaultFollowUpDays)
      : 3;
  return {
    last_follow_up_date: today,
    next_follow_up_date: addDaysISO(days, new Date(`${today}T12:00:00`)),
  };
}

/** Toast-friendly DD/MM/YYYY from YYYY-MM-DD */
export function formatFuDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
```

Note: pass noon local via `T12:00:00` so `addDaysISO` does not slip a day near UTC midnight on Windows/VPS.

- [ ] **Step 4: Run check — expect PASS**

Run: `npx tsx src/lib/follow-up-check.ts`  
Expected: `follow-up-check: ok`

- [ ] **Step 5: Commit**

```bash
git add src/lib/follow-up.ts src/lib/follow-up-check.ts
git commit -m "feat: follow-up date helpers for Đã FU ritual"
```

---

### Task 2: Dashboard data — richer focus list + defaultFollowUpDays

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/dashboard-client.tsx` (Props only in this task if needed; UI in Task 3)

**Interfaces:**
- Consumes: `createClient`, `todayISO`, `AppSettings`
- Produces: `DashboardClient` props:
  - existing counts + `today`
  - `focus: Inquiry[]` (fields: `id`, `item_name`, `status`, `next_follow_up_date`, `last_follow_up_date`, `estimated_amount`, `vendors`)
  - `defaultFollowUpDays: number`

- [ ] **Step 1: Update page fetch**

In `src/app/page.tsx`:

1. Also load `app_settings` for `default_follow_up_days`.
2. Expand focus select: add `last_follow_up_date`.
3. Raise/remove `.limit(8)` → use `.limit(50)` (enough for solo daily inbox; avoid unbounded).
4. Pass `defaultFollowUpDays={s?.default_follow_up_days ?? 3}`.

Sketch:

```tsx
const [{ count: pending }, { count: overdue }, { count: dueToday }, { count: orderedMonth }, { data: focusRows }, { data: settings }] =
  await Promise.all([
    base().eq("status", "Pending"),
    base().eq("status", "Pending").lt("next_follow_up_date", today).not("next_follow_up_date", "is", null),
    base().eq("status", "Pending").eq("next_follow_up_date", today),
    base().eq("status", "Ordered").gte("updated_at", monthStart),
    supabase
      .from("inquiries")
      .select("id, item_name, status, next_follow_up_date, last_follow_up_date, estimated_amount, vendors(id, name)")
      .is("archived_at", null)
      .eq("status", "Pending")
      .lte("next_follow_up_date", today)
      .not("next_follow_up_date", "is", null)
      .order("next_follow_up_date", { ascending: true })
      .limit(50),
    supabase.from("app_settings").select("default_follow_up_days").eq("id", 1).maybeSingle(),
  ]);

const days = (settings as { default_follow_up_days?: number } | null)?.default_follow_up_days ?? 3;

return (
  <DashboardClient
    today={today}
    pending={pending ?? 0}
    overdue={overdue ?? 0}
    dueToday={dueToday ?? 0}
    orderedMonth={orderedMonth ?? 0}
    focus={(focusRows ?? []) as unknown as Inquiry[]}
    defaultFollowUpDays={days}
  />
);
```

- [ ] **Step 2: Extend DashboardClient props type**

Add `defaultFollowUpDays: number` to Props (UI can ignore until Task 3). Typecheck must pass.

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`  
Expected: exit 0

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/components/dashboard-client.tsx
git commit -m "feat: dashboard loads FU inbox data and follow-up days"
```

---

### Task 3: Dashboard UI — Hôm nay inbox + Đã FU + Undo + KPI links

**Files:**
- Modify: `src/components/dashboard-client.tsx`

**Interfaces:**
- Consumes: `daFuPatch`, `formatFuDate`, `isOverdue` from `@/lib/follow-up`; `createClient` from `@/lib/supabase/client`; `App.useApp().message`; `todayISO` if needed
- Produces: user-visible Đã FU / Undo / KPI navigation

- [ ] **Step 1: Rewrite DashboardClient behavior**

Requirements (must match spec):

1. Keep PageHeader + Export + Inquiry mới.
2. KPI cards become `Link` wrappers:
   - Pending → `/inquiries?status=Pending`
   - Quá hạn → `/inquiries?focus=overdue`
   - Hôm nay → `/inquiries?focus=due`
   - Ordered / tháng → `/inquiries?status=Ordered`
3. Rename focus card title to **Hôm nay**; “Xem tất cả” → `/inquiries?focus=due`.
4. Empty copy: `Không có việc hôm nay` + `Link` to `/inquiries?status=Pending`.
5. Local state `items` synced from `focus` prop (same prev-prop pattern as inquiry list).
6. Each row:
   - Visual: overdue (`next_follow_up_date < today`) → light danger border/background `#FEF2F2` or text `#DC2626` on FU date.
   - Title: `{vendor} · {item_name}` linking to `/inquiries/{id}` (Sửa = same link or secondary button).
   - Actions: Button **Đã FU** + Link/Button **Sửa** → `/inquiries/{id}`.
7. **Đã FU** handler (instant):
   - Snapshot previous `{ last_follow_up_date, next_follow_up_date }`.
   - Optimistic: remove row from `items`.
   - `supabase.from("inquiries").update(daFuPatch(today, defaultFollowUpDays)).eq("id", id)`.
   - On error: restore row, `message.error`, return.
   - On success: `message.success` with content including `Next FU = ${formatFuDate(patch.next_follow_up_date)}` and an Undo action (Ant Design `message.open` with `key` + `duration: 5` + `btn` Undo, **or** `notification` with btn — pick `message.open`):

```tsx
const key = `dafu-${id}`;
message.open({
  key,
  type: "success",
  content: (
    <span>
      Next FU = {formatFuDate(patch.next_follow_up_date)}{" "}
      <Button
        type="link"
        size="small"
        onClick={async () => {
          message.destroy(key);
          const { error } = await supabase
            .from("inquiries")
            .update({
              last_follow_up_date: prev.last_follow_up_date,
              next_follow_up_date: prev.next_follow_up_date,
            })
            .eq("id", id);
          if (error) {
            message.error(error.message);
            return;
          }
          setItems((list) =>
            [...list, row]
              .sort((a, b) =>
                (a.next_follow_up_date ?? "").localeCompare(b.next_follow_up_date ?? ""),
              ),
          );
        }}
      >
        Undo
      </Button>
    </span>
  ),
  duration: 5,
});
```

8. Do **not** add a Dashboard quick-edit drawer.

- [ ] **Step 2: Manual smoke (local or VPS)**

1. Ensure a Pending inquiry with `next_follow_up_date` yesterday exists.
2. Open `/` → row appears under Hôm nay with overdue styling.
3. Click Đã FU → row gone; toast shows Next FU; Undo within 5s restores.
4. Click KPI Quá hạn → URL has `focus=overdue` (list filter fixed in Task 4).

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard-client.tsx
git commit -m "feat: dashboard Hôm nay inbox with one-tap Đã FU"
```

---

### Task 4: Inquiries list — honor URL filters on mount

**Files:**
- Modify: `src/components/inquiry-list-client.tsx`

**Interfaces:**
- Consumes: `useSearchParams` from `next/navigation`
- Produces: initial `status` / `focus` / `q` / `vendor` from URL so Dashboard KPI links work

- [ ] **Step 1: Init filter state from URL**

Currently:

```tsx
const [q, setQ] = useState("");
const [status, setStatus] = useState<string | undefined>();
const [vendorId, setVendorId] = useState<string | undefined>();
const [focus, setFocus] = useState<string | undefined>();
```

Change to (read once on mount from `useSearchParams()`):

```tsx
const sp = useSearchParams();
const [q, setQ] = useState(() => sp.get("q") ?? "");
const [status, setStatus] = useState<string | undefined>(
  () => sp.get("status") || undefined,
);
const [vendorId, setVendorId] = useState<string | undefined>(
  () => sp.get("vendor") || undefined,
);
const [focus, setFocus] = useState<string | undefined>(
  () => sp.get("focus") || undefined,
);
```

Keep existing client-side `filtered` logic for `focus=due|overdue` and `status`.

Optional (nice): when filters change, `router.replace` query string without full navigation — **not required** if KPI entry works; skip unless trivial.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`  
Manual: open `/inquiries?focus=due` → Follow-up select shows due filter and rows match.

- [ ] **Step 3: Commit**

```bash
git add src/components/inquiry-list-client.tsx
git commit -m "fix: apply inquiry list filters from URL on mount"
```

---

### Task 5: Inquiries list + drawer — shared Đã FU action

**Files:**
- Modify: `src/components/inquiry-list-client.tsx`

**Interfaces:**
- Consumes: `daFuPatch`, `formatFuDate`, `isDueOrOverdue` from `@/lib/follow-up`; existing `defaultFollowUpDays` prop; `patch` or direct supabase update for last/next dates
- Produces: Đã FU button on due/overdue Pending rows (desktop actions, mobile card, edit drawer)

- [ ] **Step 1: Add `markDaFu(row: Inquiry)`**

Same semantics as Dashboard (optimistic remove-or-update dates in `rows`, toast Undo 5s). After success, update local row dates (do **not** remove from full list — only dates change so it drops out of `focus=due` filter when that filter is on).

```tsx
async function markDaFu(row: Inquiry) {
  const today = todayISO();
  const prev = {
    last_follow_up_date: row.last_follow_up_date,
    next_follow_up_date: row.next_follow_up_date,
  };
  const patchDates = daFuPatch(today, defaultFollowUpDays);
  setRows((list) =>
    list.map((r) => (r.id === row.id ? { ...r, ...patchDates } : r)),
  );
  const supabase = createClient();
  const { error } = await supabase
    .from("inquiries")
    .update(patchDates)
    .eq("id", row.id);
  if (error) {
    setRows((list) =>
      list.map((r) => (r.id === row.id ? { ...r, ...prev } : r)),
    );
    message.error(error.message);
    return;
  }
  // message.open with Undo restoring `prev` — same pattern as Dashboard
}
```

Show **Đã FU** only when `row.status === "Pending" && isDueOrOverdue(row.next_follow_up_date, todayISO())`.

Placement:

- Desktop: actions column (next to detail edit link)
- Mobile card: small button stopPropagation
- Edit drawer footer/extra: button when eligible

- [ ] **Step 2: Typecheck + smoke**

`npx tsc --noEmit`  
Manual: filter focus=due → Đã FU → row leaves filtered view; Undo restores.

- [ ] **Step 3: Commit**

```bash
git add src/components/inquiry-list-client.tsx
git commit -m "feat: Đã FU action on inquiry list and drawer"
```

---

### Task 6: Telegram deep-link smoke + deploy

**Files:**
- Verify: `src/lib/telegram.ts` (`inquiryLink` / `formatInquiryLine` already append URL)
- Modify only if `NEXT_PUBLIC_APP_URL` missing causes bare path — then ensure `appBaseUrl()` fallback is acceptable

- [ ] **Step 1: Confirm link format**

Read `formatInquiryLine` — must include `https://crm.tudonghoa.me/inquiries/{id}` when `NEXT_PUBLIC_APP_URL` is set on VPS (already in `.env`).

If link is plain text without scheme, wrap as `<a href="...">` only if Telegram parse_mode HTML is used (check `sendMessage`). Do **not** change cron logic.

- [ ] **Step 2: Run helper check + tsc**

```bash
npx tsx src/lib/follow-up-check.ts
npx tsc --noEmit
```

Expected: both ok.

- [ ] **Step 3: Deploy VPS**

```bash
git push origin main
ssh ubuntu@134.185.93.244 'cd ~/crm-bn && git pull origin main && docker compose build web && docker compose up -d web'
```

- [ ] **Step 4: Production smoke**

1. Login → Dashboard Hôm nay shows due items.
2. Đã FU + Undo.
3. KPI Quá hạn opens filtered list.
4. Optional: Settings → test Telegram still sends; body contains inquiry URL.

- [ ] **Step 5: Final commit only if telegram fix needed**

```bash
git add -A
git commit -m "fix: ensure telegram inquiry deep links" || true
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Hôm nay inbox (overdue + due today) | 2, 3 |
| Đã FU sets last/next from settings (+3 fallback) | 1, 3, 5 |
| Instant + Undo 5s | 3, 5 |
| Sửa → detail link (no new dashboard drawer) | 3 |
| Empty state copy | 3 |
| KPI → Pending / overdue / due / Ordered | 3, 4 |
| Đã FU on list + drawer | 5 |
| URL focus/status honored | 4 |
| Telegram link present | 6 |
| No activity table / no confirm / no bulk | Global |

## Plan self-review

- No TBD/placeholder steps.
- `daFuPatch` / `formatFuDate` names consistent across tasks.
- `addDaysISO(days, new Date(\`${today}T12:00:00\`))` avoids timezone edge cases — called out in Task 1.
- Telegram already links; Task 6 is verify-first.
