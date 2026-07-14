# Archive report — `users-admin-page` (verdict PASS)

**Change**: `users-admin-page`
**Capability**: `usuarios` (newly created baseline)
**Project**: sistema-incidencias
**Archive date**: 2026-07-14
**Verdict**: PASS (12/12 functional requirements, 6/6 non-functional requirements)
**Source**: `openspec/changes/users-admin-page/verify-report.md` + engram topic `sdd/users-admin-page/verify-report`

## 1. Summary

The `users-admin-page` change shipped across 3 chained PRs stacked-to-main:

- PR #2 (`28d1afc`) — Slice A: foundation (services, types, sidebar wiring, router)
- PR #3 (`0a40125`) — Slice B: list view with filters, pagination, 403 state
- PR #4 (`1aa2c88`) — Slice C+D: create/edit dialog, password dialog, toggle wiring, verify checklist

Master tip at archive: `1aa2c88`. Lint + build clean. 29-item manual smoke checklist deferred (no backend in this CI environment) but preserved for a maintainer to walk through against a running Spring Boot instance.

## 2. Sync performed

The delta spec at `openspec/changes/users-admin-page/specs/usuarios/spec.md` was copied to `openspec/specs/usuarios/spec.md` and elevated from "delta" to "capability baseline" form. Since the `usuarios` capability had no prior spec (only the previously-disabled sidebar entry in `app-sidebar.tsx`), this sync creates the capability baseline for the first time.

The change folder was moved in full to `openspec/changes/archive/users-admin-page/`, preserving all SDD artifacts (proposal, exploration, spec, design, tasks, apply-progress, verify-report) for future audit.

## 3. Spec drifts applied (verify-report SUGGESTIONs S1, S2, S3)

| ID | Severity | Target | Drift applied |
|----|----------|--------|---------------|
| **S1** | SUGGESTION | REQ-5 "Change another user's password" | Client-side password minimum updated from **6 to 8 characters** to match implementation. The backend `@Size(min=6, max=100)` constraint is unchanged; the frontend is intentionally stricter for UX consistency with the create form. Both the requirement body and the "Client-side validation" scenario were updated. |
| **S2** | SUGGESTION | REQ-1 "Empty state" | Empty-state copy updated from **"No hay usuarios registrados"** to **"No se encontraron usuarios con los filtros aplicados."** (covers both unfiltered and filtered empty cases, matching the categorias-page precedent). |
| **S3** | SUGGESTION | REQ-1 "Inactive-only toggle" | Inactive-only filter description rewritten as a **3-option native `<select>`** ("Todos / Solo activos / Solo inactivos") instead of a `Switch` primitive. The "Solo activos" and "Todos" branches are now explicitly specified. Request parameters are unchanged. |
| **S4** | SUGGESTION | NFR-3 "Spanish UI copy" | **Left as-is.** The pre-existing English "Admin" default in `app-sidebar.tsx:88` is out of scope for this change. |

The `> Drift notes applied during archive` block at the top of `openspec/specs/usuarios/spec.md` records these four resolutions inline for future readers.

## 4. Files

### Added (under `openspec/`)

- `openspec/specs/usuarios/spec.md` — NEW capability baseline, 282 lines (was 272 in delta; +10 from drift edits + drift-notes block at top).

### Moved (change folder → archive)

- `openspec/changes/users-admin-page/` → `openspec/changes/archive/users-admin-page/`
  - `proposal.md` (13,223 bytes)
  - `exploration.md` (14,495 bytes)
  - `design.md` (25,119 bytes)
  - `tasks.md` (17,187 bytes)
  - `apply-progress.md` (17,587 bytes) — was tracked in git, now at new path
  - `verify-report.md` (24,353 bytes) — was tracked in git, now at new path
  - `specs/usuarios/spec.md` (18,251 bytes, the original delta)
  - `specs/usuarios-admin-page.md` (5,798 bytes, change-level overview)

### Config

- `openspec/config.yaml` — **not modified**. This config file does not list active change IDs; it only declares project-level metadata (mode, phases, conventions, testing capabilities). No update was required for archive.

### Source code

- **No source code changes.** Per the archive contract, only spec sync + folder move + report were performed.

## 5. Traceability

- Spec delta: `openspec/changes/archive/users-admin-page/specs/usuarios/spec.md`
- Spec baseline: `openspec/specs/usuarios/spec.md`
- Design: `openspec/changes/archive/users-admin-page/design.md`
- Tasks: `openspec/changes/archive/users-admin-page/tasks.md`
- Apply progress: `openspec/changes/archive/users-admin-page/apply-progress.md`
- Verify report: `openspec/changes/archive/users-admin-page/verify-report.md`
- Engram topic: `sdd/users-admin-page/archive-report` (this report mirrored in memory)

## 6. Risks / follow-ups

- **Manual smoke pending**: the 29-item manual checklist in `verify-report.md` lines 27-57 must be walked by a maintainer against a running backend before the change is fully production-ready. The CI environment does not have Spring Boot reachable.
- **NFR-3 (S4) out-of-scope**: the pre-existing English "Admin" fallback in `app-sidebar.tsx:88` is a separate cleanup task. Worth a small follow-up change.
- **`openspec/` commit history is shallow**: only `apply-progress.md` and `verify-report.md` were tracked in git before this archive. The remaining SDD artifacts (`config.yaml`, `specs/`, `proposal.md`, `exploration.md`, `design.md`, `tasks.md`, `specs/`, archive folder) are untracked. The archive commit will introduce them to git history.

## 7. Next recommended

- Orchestrator: decide push / pause. Archive commit lands in master locally; orchestrator handles `git push` policy.
- Maintainer: walk through the 29-item manual smoke checklist against the running backend.
- Follow-up change: address the pre-existing English "Admin" default in `app-sidebar.tsx:88` (NFR-3 / S4).