# Archive report — `incidencias-phase2-3` (verdict PASS)

**Change**: `incidencias-phase2-3`
**Capability**: `incidencias` (newly created baseline)
**Project**: sistema-incidencias
**Archive date**: 2026-07-14
**Verdict**: PASS (23/23 requirements — 15 functional + 8 NFR; 4/4 bug fixes B1–B4)
**Source**: `openspec/changes/archive/incidencias-phase2-3/verify-report.md` + engram topic `sdd/incidencias-phase2-3/verify-report`

## 1. Summary

The `incidencias-phase2-3` change shipped across 4 chained PRs stacked-to-main:

- PR #5 (`303bd22`) — Slice A: 4 production bug fixes (B1 handleArchivos, B2 console.log, B3 motivoRechazo, B4 orden+1 transition)
- PR #6 (`187e84a`) — Slice B: 3 new service methods (`actualizar`, `subirAdjuntos`, `eliminar`) + `ActualizarIncidenciaInput` + `IncidenciaDialogMode` types + extracted `IncidenciasHeader` / `IncidenciasPagination` / `IncidenciaEstadoProcesoBadge` components + `AbortController` + 300ms debounce
- PR #7 (`016dda9`) — Slice C: 3 new dialogs (`EditarIncidenciaDialog` 598 LOC, `SubirAdjuntosDialog` 414 LOC, `ConfirmarEliminarIncidenciaDialog` 132 LOC) + detalle page wiring (DialogMode discriminated union, toast pattern, AbortController on `cargarDetalle`, 3 header buttons)
- PR #8 (`e3cc033`) — Slice D: role-based UI gating, UUID-to-name resolution + client-side table sort, sidebar dual-badge + specific lucide icons, historial vertical timeline with ESTADO_CAMBIADO transition labels, "Añadir adjuntos" CTA on adjuntos card + verify-report

Master HEAD at archive: `e3cc033`. Lint + build clean (zero errors, zero warnings). Bundle: `dist/assets/index-5LWT7t0I.js` = 905.13 kB / gzip 262.92 kB. The chunk-size >500kB warning is pre-existing baseline (874.88 kB on the prior `users-admin-page` PR) and was NOT introduced by this change.

## 2. Sync performed

The delta spec at `openspec/changes/archive/incidencias-phase2-3/specs/incidencias/spec.md` was copied to `openspec/specs/incidencias/spec.md` and elevated from "delta" to "capability baseline" form:

- The header changed from `# Capability Spec: incidencias — phase 2 / 3 delta` to `# Capability Spec: incidencias — bug fixes, missing flows, UX polish`.
- `**Change**: incidencias-phase2-3` removed (this is a baseline, not a delta).
- New `**Scope / This capability spec is the synced baseline…**` paragraph added in the style of `openspec/specs/usuarios/spec.md`.
- `## ADDED Requirements` → `## Requirements` (delta form no longer applies; this is the post-archive baseline).
- All 3 SUGGESTION-level drifts from the verify-report were applied to the synced body (see §3 below).
- A `> Drift notes applied during archive` block was added at the top of the synced baseline, mirroring the precedent set by `openspec/specs/usuarios/spec.md` for the `users-admin-page` archive.

Since the `incidencias` capability had no prior spec at the start of this change, this sync creates the capability baseline for the first time. Future changes will use `## MODIFIED Requirements` / `## REMOVED Requirements` against the seeded baseline.

The change folder was moved in full to `openspec/changes/archive/incidencias-phase2-3/` (plain `mv` rather than `git mv` because most SDD artifacts were untracked at archive time — `verify-report.md` was the only tracked file, and its rename will be detected by git's similarity heuristic on commit). All SDD artifacts (proposal, exploration, spec, design, tasks, apply-progress, verify-report) are preserved for future audit.

## 3. Spec drifts applied (verify-report SUGGESTIONs S1, S2, S3)

| ID | Severity | Target | Drift applied |
|----|----------|--------|---------------|
| **S1** | SUGGESTION | REQ-12 "Asignado column", Scenario "Unassigned renders dash" | Empty-state copy for unassigned (`asignadoA === null` or assignee not in catalog) updated from the literal em-dash `"—"` to the neutral Spanish string `"Sin asignar"`. Matches the actual implementation at `frontend/src/pages/incidencias/components/incidencias-table.tsx:291`. Functionally equivalent; the new copy is friendlier and consistent with NFR-3 (Spanish copy). Both the requirement body sentence and the scenario heading/body were updated. |
| **S2** | SUGGESTION | NFR-7 "Page sizes come down" | Refactor LOC target relaxed from `~200 LOC` per file to a band: `index.tsx` ~250 LOC (shipped: 252 LOC, slightly over the original target but well-managed) and `detalle/index.tsx` to a relaxed `~400–850 LOC` band (shipped: 811 LOC). The original `~200 LOC` was unattainable for `detalle/index.tsx` because wiring the 3 new dialogs + `DialogMode` union + toast pattern + `AbortController` + catalog loading + approval/revision/rejection cards cannot realistically fit inside 200 LOC. **Design §10 explicitly accepted this deviation**: extracted dialogs (`EditarIncidenciaDialog` 598 LOC, `SubirAdjuntosDialog` 414 LOC, `ConfirmarEliminarIncidenciaDialog` 132 LOC) carry ~1450 LOC elsewhere; `detalle/index.tsx` retains the wiring/coordination layer. The scenario body and the requirement body's `(drift S2; absolute target ~200 LOC was relaxed)` note document the relaxation. |
| **S3** | SUGGESTION | NFR-1 "Modern shadcn Field en formularios" | The `Field` / `FieldLabel` / `FieldDescription` / `FieldError` / `FieldGroup` primitive requirement is **explicitly scoped to the 3 new dialogs** (`EditarIncidenciaDialog`, `SubirAdjuntosDialog`) **only**. Title changed to `Modern shadcn Field en los diálogos nuevos (Field migration restricted to new dialogs)`. The pre-existing `nueva-incidencia-view.tsx` (425 LOC) continues to use raw `<label>` + `<select>` + `<textarea>` markup — that legacy create form was **out of scope** per design §3.2 ("modern Field applied only to the 3 new dialogs in this change"). The scenario body now distinguishes "Field primitives are used in new dialogs" from "No raw markup in newly-introduced forms" so the intent (Field for new code, raw markup permitted in legacy pre-existing forms) is unambiguous. A "Field migration of `nueva-incidencia-view.tsx`" item was added to the **Out of scope** section as an explicit follow-up. |

The `> Drift notes applied during archive` block at the top of `openspec/specs/incidencias/spec.md` records these 3 resolutions inline for future readers, in the same format used by the `usuarios` baseline.

## 4. Files

### Added (under `openspec/`)

- `openspec/specs/incidencias/spec.md` — NEW capability baseline, **360 lines** (delta was 347 lines; +13 from drift edits, drift-notes block at top, and explicit out-of-scope follow-up line).

### Moved (change folder → archive)

- `openspec/changes/incidencias-phase2-3/` → `openspec/changes/archive/incidencias-phase2-3/`
  - `proposal.md` (16,493 bytes)
  - `exploration.md` (6,570 bytes)
  - `design.md` (51,026 bytes)
  - `tasks.md` (32,148 bytes)
  - `apply-progress.md` (30,524 bytes) — was tracked in git (created at apply time)
  - `verify-report.md` (23,856 bytes) — was tracked in git (committed at `e843f81` and `e3cc033`)
  - `specs/incidencias/spec.md` (27,574 bytes — original delta, preserved verbatim)
  - `specs/incidencias-phase2-3.md` (9,678 bytes — change-level overview)

### Config

- `openspec/config.yaml` — **not modified**. This config file does not list active change IDs; it only declares project-level metadata (mode, phases, conventions, testing capabilities). No update was required for archive.

### Source code

- **No source code changes.** Per the archive contract, only spec sync + folder move + report were performed. The 15 source files modified during the apply phase (verify-report §"Files touched this change") were already merged into master at `e3cc033` before this archive began.

## 5. Traceability

- Spec delta: `openspec/changes/archive/incidencias-phase2-3/specs/incidencias/spec.md`
- Spec baseline: `openspec/specs/incidencias/spec.md`
- Change-level overview: `openspec/changes/archive/incidencias-phase2-3/specs/incidencias-phase2-3.md`
- Design: `openspec/changes/archive/incidencias-phase2-3/design.md`
- Tasks: `openspec/changes/archive/incidencias-phase2-3/tasks.md`
- Apply progress: `openspec/changes/archive/incidencias-phase2-3/apply-progress.md`
- Verify report: `openspec/changes/archive/incidencias-phase2-3/verify-report.md`
- Proposal: `openspec/changes/archive/incidencias-phase2-3/proposal.md`
- Exploration: `openspec/changes/archive/incidencias-phase2-3/exploration.md`
- Engram topics: `sdd/incidencias-phase2-3/proposal`, `sdd/incidencias-phase2-3/spec`, `sdd/incidencias-phase2-3/design`, `sdd/incidencias-phase2-3/tasks`, `sdd/incidencias-phase2-3/apply-progress`, `sdd/incidencias-phase2-3/verify-report`, `sdd/incidencias-phase2-3/archive-report` (this report mirrored in memory)

## 6. Risks / follow-ups

- **Manual smoke pending**: the 29-item manual checklist in `verify-report.md` (lines 67-95 of the archived copy) must be walked by a maintainer against a running Spring Boot instance + seeded `usuarios` catalog. The CI environment does not have Spring Boot reachable.
- **NFR-1 / drift S3 follow-up**: migrate `nueva-incidencia-view.tsx` (425 LOC, raw `<label>`+`<select>`) to the modern `Field` / `FieldLabel` / `FieldGroup` primitive for full parity with `EditarIncidenciaDialog` and `SubirAdjuntosDialog`. Listed in **Out of scope** §NFR-1 and drift S3.
- **NFR-7 / drift S2 — `detalle/index.tsx` 811 LOC**: design §10 explicitly accepted this; however, a future refactor could further decompose the wiring/coordination layer if the file size continues to grow. The relaxed band (400–850 LOC) in the synced baseline reflects shipped behavior, not a permanent ceiling.
- **`openspec/` commit history is shallow for this change**: `verify-report.md` and `apply-progress.md` were tracked at apply time; most other SDD artifacts (`proposal.md`, `exploration.md`, `design.md`, `tasks.md`, `specs/`, `openspec/specs/incidencias/spec.md`) are being introduced in this archive commit. This matches the precedent set by the `users-admin-page` archive.
- **PR4 size:exception — already accepted at apply time**: total chain LOC was +2201/−335 = +1866 net source-only (+2293 with verify-report.md). The chained-prs delivery strategy (`ask-on-risk` preflight + orchestrator decision to use 4 PRs with size:exception, well above the 400-line review budget) was pre-approved; this archive simply records the outcome.

## 7. Next recommended

- Orchestrator: decide push / pause. Archive commit lands in master locally; orchestrator handles `git push` policy.
- Maintainer: walk through the 29-item manual smoke checklist at `openspec/changes/archive/incidencias-phase2-3/verify-report.md` (lines 67-95) against the running Spring Boot + seeded `usuarios` catalog.
- Follow-up change 1: migrate `nueva-incidencia-view.tsx` to the modern `Field` primitive for full UX parity (drift S3 follow-up).
- Follow-up change 2 (optional): revisit `detalle/index.tsx` size if new functionality in a future change pushes it beyond the 850 LOC ceiling (drift S2 follow-up).
