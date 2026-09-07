# Daily Follow-up Ritual — Design Spec

**Date:** 2026-09-07  
**Status:** Ready for user review  
**Product:** CRM Inquiry (`crm-bn`)  
**Primary user:** Solo sales (1 person) tracking RFQs / quotes by vendor

## Goal

When the user opens the app, they immediately see **who to follow up today**, mark each item done in one tap, and move on. Success = fewer missed follow-ups without learning a new “CRM system.”

## Context (why this)

Original pain: Excel is slow/messy, easy to forget follow-up, hard to know ordered vs not.  
App is new; no field usage data yet. We optimize for the **daily ritual**, not team features.

## Approach (chosen)

**A — “Hôm nay” inbox + one-tap “Đã FU”**

Rejected for this round:

- **B** (list-only polish): helps navigation but does not change the follow-up habit.
- **C** (full activity log): valuable later; too heavy before the ritual exists.

## User flow

1. Open `/` (Dashboard).
2. See block **Hôm nay** first: Pending inquiries where `next_follow_up_date < today` (overdue) or `= today` (due).
3. Per row: Item code · Vendor · Next FU · Est.$ · actions **Đã FU** | **Sửa** (link to `/inquiries/[id]` — no new drawer on Dashboard).
4. Tap **Đã FU** (instant):
   - `last_follow_up_date` = today (ISO date)
   - `next_follow_up_date` = today + `default_follow_up_days` from `app_settings` (fallback 3)
   - Toast: “Next FU = DD/MM/YYYY” with **Undo 5s** (restores previous last/next dates)
   - Row leaves “Hôm nay” immediately (optimistic UI)
5. Empty state: “Không có việc hôm nay” + link to Pending inquiries.
6. KPI cards remain; each navigates to Inquiries with filters applied (see mapping below).

Telegram digest / per-item reminders stay as today; messages should deep-link to `/inquiries/[id]` when possible.

## UI details

### Dashboard

- **Hôm nay** is the primary above-the-fold block (not buried under stats).
- Overdue rows: subtle red/warning treatment; due-today: neutral.
- Stats row click targets (URL query; list must honor on mount):
  - **Pending** → `/inquiries?status=Pending`
  - **Quá hạn** → `/inquiries?focus=overdue`
  - **Hôm nay** → `/inquiries?focus=due`
  - **Ordered tháng** → `/inquiries?status=Ordered` (month filter not required this round)
- Keep Export + Inquiry mới shortcuts.

### Inquiries list + quick-edit drawer

- Same **Đã FU** control on rows that are Pending and due/overdue (desktop table action + mobile card + edit drawer), identical semantics and Undo.
- Sort option remains Newest/Oldest; optionally add “Next FU” later — **out of this spec**.

### Instant + Undo (not confirm dialog)

- Prefer speed: no confirm modal.
- Undo window: 5 seconds; only undoes that last Đã FU on that inquiry.
- If user navigates away before Undo expires, change stays (no background queue).

## Data & behavior

| Field | On Đã FU |
|-------|----------|
| `last_follow_up_date` | Set to today |
| `next_follow_up_date` | today + `default_follow_up_days` |
| `status` | Unchanged (still Pending unless user edits) |
| `action_plan` / notes | Unchanged (no required note this round) |
| New tables | **None** |

Settings already expose `default_follow_up_days`; Đã FU must read the current value (client cache from page props or a one-shot fetch is fine).

### Deep-link / filter bug (in scope)

Dashboard “Xem tất cả” / KPI currently can land on `/inquiries?focus=due` while the list does **not** apply URL `focus`. Fix so opening with `focus=due|overdue` (and related KPI targets) actually filters the list. Prefer client-side filter init from URL on mount (list already filters client-side).

### Telegram (in scope, light)

Ensure reminder / digest lines include a working link to the inquiry detail URL (`NEXT_PUBLIC_APP_URL` + `/inquiries/{id}`). Do not change cron schedule or quiet-hours logic.

## Out of scope

- Activity / timeline log table
- Required note on Đã FU
- Asking user to pick Next FU each time
- Bulk Đã FU
- Multi-user / owner assignment UX
- Pipeline board
- Re-adding archive/hide UI
- Hard delete
- Migrating off Supabase

## Error handling

- If patch fails: revert optimistic row, `message.error`, no Undo toast.
- If settings missing `default_follow_up_days`: use **3**.
- Undo after failed patch: no-op.

## Testing (minimal, runnable)

1. Seed/create a Pending inquiry with `next_follow_up_date` = yesterday → appears in Hôm nay as overdue.
2. Click Đã FU → leaves list; `last_follow_up_date` = today; `next_follow_up_date` = today+N.
3. Click Undo within 5s → dates restored; row returns to Hôm nay.
4. Open `/inquiries?focus=due` → list shows due/overdue Pending only.
5. (Optional) Trigger reminder text contains `https://…/inquiries/{id}`.

## Success criteria

- Solo user can clear today’s follow-ups without opening the full form.
- Zero extra screens beyond Dashboard enhancement + shared Đã FU action.
- KPI / focus links from Dashboard work.

## Follow-ups (later, not this plan)

- Optional note on Đã FU / activity trail  
- Sort by Next FU  
- Clickable digest grouped by day  
- Per-inquiry “snooze” presets (+1 / +3 / +7)
