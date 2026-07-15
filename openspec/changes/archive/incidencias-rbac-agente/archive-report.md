# Archive Report — `incidencias-rbac-agente` (verdict PASS)

**Change**: `incidencias-rbac-agente`
**Capability**: `incidencias` (extended baseline)
**Project**: sistema-incidencias
**Archive date**: 2026-07-14
**Verdict**: PASS (sdd-verify: see `verify-report.md`)
**Source**: `openspec/changes/incidencias-rbac-agente/verify-report.md` + engram topic `sdd/incidencias-rbac-agente/verify-report` (observation #798)

---

## 1. Verdict

**PASS** — sdd-verify verdict in `verify-report.md` confirms all 11 requirement rows + ~25 Given/When/Then scenarios pass at code level against the merged master (`46a1042`). Zero new regressions. Pre-existing 3 lint + 4 build errors in master (introduced by PR #9 `f26424a`, before this change) are documented and remain out of scope.

---

## 2. Changes shipped

The `incidencias-rbac-agente` change shipped across **2 stacked PRs** to `master`:

- **PR #10** (`5846214`) — Slice A — T1 + T2 + symptom fix:
  - `PermisoAdministracionService.validarAutenticado(String)` helper added.
  - 4 catalog `listar` methods swapped from `validarAdministrador` → `validarAutenticado` (`CategoriaController:34`, `AplicativoClienteController:36`, `EstadoProcesoController:34`, `EstadoAprobacionController:34`).
  - Prior `Promise.allSettled` + `currentUserIsAdmin` symptom-fix absorbed (no behavior change here — just provenance).
- **PR #11** (`46a1042`) — Slice B — T3 + T4 + T5a + T5b + T5c + T6 + T7:
  - New `GET /api/usuarios/agentes-asignables` endpoint (`UsuarioController:52-57`, `UsuarioService:49-55`, `UsuarioDao:62-74`, `UsuarioSql:45-51`).
  - `IncidenciaFiltro.creadoPorUsuarioId` field added; DAO WHERE builder extended.
  - `IncidenciaController.listar` injects `@RequestHeader("Authorization")` and force-overrides filter for AGENTE/USUARIO (`IncidenciaController.java:77-84`).
  - `IncidenciaService.validarAlcance(Usuario, Incidencia, metodo)` helper wired into `obtener`, `actualizar`, `actualizarConArchivos`, `cambiarEstado`, `aprobar`, `rechazar`, `agregarComentario`, `agregarAdjunto`, `agregarAdjuntos`. `eliminar` is admin-only via `AccesoDenegadoException` (`IncidenciaService:253-255, 297-315`).
  - Frontend cleanup: `currentUserIsAdmin` catalog gate removed from `pages/incidencias/index.tsx:83-89`; `usuariosService.listarAgentesAsignables()` consumed via parent prop (drop-in for both `nueva-incidencia-view.tsx` + `editar-incidencia-dialog.tsx`); `AGENT_ROLE_CODES` client filter dropped from both children.
  - Postman: new `agentes-asignables` folder entry + 4 catalog auth notes relaxed to "authenticated".

Master HEAD at archive: `46a1042`. Backend compile clean (`./mvnw compile` silent). Frontend lint + build net-new clean (3 lint + 4 build errors pre-existing in master from PR #9 `f26424a`). Postman JSON valid. Diffstat vs base `433c1fd`: 15 files / +346 / −37 = 383 lines — within the 400-line review budget from `proposal.md §1`.

---

## 3. Requirements closed

From `docs/requerimientos.md` and the spec matrix (full mapping at `verify-report.md §Requirements coverage matrix`):

- **RF-05** (Visualizar lista de incidencias con filtros) — partially closed for AGENTE (scope=asignadas) and USUARIO (scope=creadas-por-él); ADMINISTRADOR keeps the free filter.
- **RF-12..28** (Incidencia CRUD + workflow) — RBAC scope enforced at the service layer (`validarAlcance`); ADMINISTRADOR unaffected.
- **RNF-06** (RBAC enforcement) — closed at the service layer per `AGENTS.md:283-292` (imperative gate, not `@PreAuthorize`).
- **RNF-08** (No privileged data leakage to non-admins) — closed by relaxing only the minimum endpoints (`listar` of catalogs + new `agentes-asignables`); admin-only endpoints (catalog writes, full `/api/usuarios`, `eliminar`) stay admin-only.

The 75-requirement audit (`audit/requirements-coverage` engram topic) identified the gaps this change closes; **the rest of the audit (dashboard mocks, notificaciones, reportes, perfil, configuración, OpenAPI/Swagger, breadcrumb) is explicitly deferred to future SDD changes** per `proposal.md §9`.

### Combined baseline after this archive

| Source | Functional | NFR | Drift applied |
|--------|-----------|-----|---------------|
| `incidencias-phase2-3` (prior archive) | 15 | 8 | 3 (S1–S3) |
| `incidencias-rbac-agente` (this archive) | **7** | **2** | **1 (D1)** |
| **Combined** | **22** | **10** | **4 (S1–S3, D1)** |

---

## 4. Master commits

Stacked to master via the conventional SDD PR flow:

| Commit | PR | Slice | Description |
|--------|----|-------|-------------|
| `5846214` | #10 | T1 + T2 + symptom-fix | `feat(incidencias-rbac-agente) PR1: catalogos publicos + frontend gate` |
| `46a1042` | #11 | T3 + T4 + T5a/b/c + T6 + T7 | `feat(incidencias-rbac-agente) PR2: scope AGENTE/USUARIO + new endpoint` |

HEAD at archive: `46a1042` on `master`.

---

## 5. Drift applied

| ID | Severity | Target | Drift applied |
|----|----------|--------|---------------|
| **D1** | NOTE (resolved by intent per verify-report §Open questions #3) | REQ "USUARIO solo lista incidencias creadas por él" / Scenario "USUARIO con query param propio no se overridea" | Wording clarified. Original delta said "la regla de scope domina; el query param coincide y se acepta por consistencia, **no se cambia el resultado**". The shipped code (`IncidenciaController.java:82`) **does** force-overwrite `filtro.setCreadoPorUsuarioId(actual.getId())` for any USUARIO caller — same pattern as the AGENTE branch. The result is byte-for-byte identical when the USUARIO passes `?creadoPorUsuarioId=<self.id>` (since `actual.getId()` equals the query param value), but the literal "no overridea" wording could mislead a future reader. Scenario body reworded to: "the controller force-overwrites with `actual.getId()`; when the USUARIO passes their own id the result is unchanged; when they pass a different id the override scopes them down to their own creations per the RBAC rule." Resolved by intent per verify-report §Open questions #3. |

**Drift applied count: 1** (D1).

The other deviations documented in `verify-report.md §Deviations` are functional / architectural notes that did not require spec-text edits:

- **WARNING (deviation, not drift)**: T6 frontend swap was moved up one level — the parent `index.tsx` calls `listarAgentesAsignables` once and feeds children via the existing `usuarios` prop. The children no longer import `usuariosService`. Functionally equivalent (single source of catalog data; no duplicate fetches). Spec scenario for "dropdown de asignación se llena desde agentes-asignables" still passes by construction.
- **NOTE (clarification)**: Defense-in-depth `usuario.activo` filter preserved in `nueva-incidencia-view.tsx:89` and `editar-incidencia-dialog.tsx:170` even though the backend already filters `activo=true`. Harmless, slightly more defensive.
- **NOTE (clarification)**: `currentUserIsAdmin` is still computed in `index.tsx:49-52` and passed as a prop to `incidencias-table.tsx:277` for the **delete-button visibility gate** (`incidencias-table.tsx:324`), not as the catalog gate. Intentional, not a regression.

---

## 6. Capability spec evolution

The synced baseline at `openspec/specs/incidencias/spec.md` evolved as follows (was 360 lines, now 593 lines):

### Header / meta
- Title: `# Capability Spec: incidencias — bug fixes, missing flows, UX polish` → `# Capability Spec: incidencias — frontend UX polish + backend RBAC + scope por rol`.
- Scope: `Frontend only. No backend changes. No Postman collection changes.` → `Frontend + Backend + Postman collection. Covers authenticated users on /incidencias and /incidencias/:id, the backend RBAC enforcement on IncidenciaController …`.

### New blocks at the top
- **`> Archive history` block** listing the two archives that contributed to the baseline (`incidencias-phase2-3` + `incidencias-rbac-agente`), with the requirements they added and the drifts they applied.
- **New drift notes block** for `incidencias-rbac-agente` (D1 — USUARIO override wording clarification) following the existing pattern from `incidencias-phase2-3` (S1–S3).

### Requirements
- All 15 functional + 8 NFR from the prior baseline preserved verbatim.
- **+7 new functional requirements** appended under `## Requirements added by incidencias-rbac-agente (archive 2026-07-14)`:
  1. `Permiso genérico "usuario autenticado"` (R-Autenticado helper)
  2. `Catálogos legibles por cualquier usuario autenticado (GET)` (R-Catalogos-Get)
  3. `Endpoint de agentes asignables para no-administradores` (R-AgentesAsignables)
  4. `AGENTE solo lista incidencias asignadas a él` (R-Agente-Scope)
  5. `USUARIO solo lista incidencias creadas por él` (R-Usuario-Scope, with drift D1 wording)
  6. `AGENTE/USUARIO solo operan sobre incidencias en su alcance` (R-ValidarAlcance)
  7. `Frontend retira gate temporal y consume agentes-asignables` (R-Frontend-Gate)
  8. `Postman collection sincronizada` (R-Postman sync)
- **+2 new NFRs** appended under `## Non-functional Requirements added by incidencias-rbac-agente (archive 2026-07-14)`:
  1. `Validación de inputs del filtro no se relaja`
  2. `Performance no degrada en listar`

### Out of scope
- B8 (backend authorization on IncidenciaController) rewritten: the premise no longer holds after this archive. The remaining "field-level permissions" work is a separate change.
- New out-of-scope items added (per delta): backend DELETE for catalogs + usuarios, USUARIO mutation scope extension, reportes + export, dashboard real, configuración UI, demo login fix, OpenAPI/Swagger, breadcrumb, `detalle/index.tsx` migration, new SQL indexes.

### Acceptance criteria
- Rewritten to reflect the combined baseline: 22 functional + 10 NFR (32/32 PASS across both verify-reports), plus the new mvnw / npm run lint / npm run build criteria from the rbac verify-report.
- The pre-existing TS/lint errors (PR #9 `f26424a`) explicitly listed as out of scope.

---

## 7. Files

### Added (under `openspec/`)

- `openspec/specs/incidencias/spec.md` — UPDATED capability baseline, **593 lines** (was 360 in the prior baseline; +233 from merge additions: archive history block, rbac drift notes block, 7 functional requirements, 2 NFRs, expanded Out of scope, expanded Acceptance criteria).

### Moved (change folder → archive)

- `openspec/changes/incidencias-rbac-agente/` → `openspec/changes/archive/incidencias-rbac-agente/`
  - `proposal.md` (16,822 bytes)
  - `design.md` (10,976 bytes)
  - `tasks.md` (7,762 bytes)
  - `verify-report.md` (16,654 bytes) — was untracked, now at new path
  - `specs/incidencias/spec.md` (the original delta, 7,985 bytes — preserved verbatim in the archive)

### Config

- `openspec/config.yaml` — **not modified**. This config file does not list active change IDs; it only declares project-level metadata. No update was required for archive.

### Source code

- **No source code changes.** Per the archive contract, only spec sync + folder move + report were performed. The 15 source files modified during the apply phase (verify-report §"Files touched this change") were already merged into master at `46a1042` (PR #10 + PR #11) before this archive began.

---

## 8. Traceability

- Spec delta (archived): `openspec/changes/archive/incidencias-rbac-agente/specs/incidencias/spec.md`
- Spec baseline (updated): `openspec/specs/incidencias/spec.md`
- Design: `openspec/changes/archive/incidencias-rbac-agente/design.md`
- Tasks: `openspec/changes/archive/incidencias-rbac-agente/tasks.md`
- Verify report: `openspec/changes/archive/incidencias-rbac-agente/verify-report.md`
- Proposal: `openspec/changes/archive/incidencias-rbac-agente/proposal.md`
- Engram topics (existing, preserved):
  - `sdd/incidencias-rbac-agente/proposal` (apply session)
  - `sdd/incidencias-rbac-agente/spec` (delta spec)
  - `sdd/incidencias-rbac-agente/design` (technical design)
  - `sdd/incidencias-rbac-agente/tasks` (T1–T8)
  - `sdd/incidencias-rbac-agente/apply-progress` (observation #796 — preserved, NOT deleted per archive constraints)
  - `sdd/incidencias-rbac-agente/verify-report` (observation #798)
- Engram topic (added by this archive):
  - `sdd/incidencias-rbac-agente/archive-report` (this report mirrored in memory)

---

## 9. Risks / follow-ups

- **`detalle/index.tsx` migration** (carried over as future SDD change): the detail page still calls the admin-only `usuariosService.listar()` at `detalle/index.tsx:158` and silently swallows the 403 via `try/catch {}`. AGENTE/USUARIO users landing on a detail page experience no error toast today. Migrating that page to the new `agentes-asignables` endpoint and polishing the 403-state UI is a follow-up change — explicitly out of scope per `proposal.md §5` and `design.md §4`.
- **Pre-existing TS/lint errors** in master (`f26424a`): 3 lint + 4 build errors unrelated to this change. Cleanup change recommended but not blocking.
- **`openspec/` commit history is shallow for this change**: most SDD artifacts (`proposal.md`, `design.md`, `tasks.md`, `specs/incidencias/spec.md`) were untracked at apply time and are being introduced to git history by this archive commit; only `verify-report.md` and the prior merged source code are tracked. Matches the precedent set by the `incidencias-phase2-3` and `users-admin-page` archives.

---

## 10. Next recommended

- Orchestrator: push to `origin/master`. Archive commit lands in master locally; orchestrator handles `git push` policy.
- Maintainer: walk the `incidencias-rbac-agente` smoke checklist at `verify-report.md` §"Spec scenarios walkthrough" (5 catalog GETs at AGENTE+USUARIO, 4 `agentes-asignables` scenarios, 4 AGENTE-list scope scenarios, 2 USUARIO-list scope scenarios, 8 `validarAlcance` mutation scope scenarios, 4 frontend cleanup scenarios, 2 Postman sync scenarios) against the live Spring Boot instance with seeded `usuarios`.
- Follow-up change 1: migrate `frontend/src/pages/incidencias/detalle/index.tsx` to consume `usuariosService.listarAgentesAsignables()` and polish the 403-state UI for AGENTE/USUARIO users landing on a non-owned detail.
- Follow-up change 2 (optional cleanup): address the pre-existing TS/lint errors from PR #9 `f26424a` (`incidencias-table.tsx:309` `EstadoProcesoClave` mismatch + `index.tsx:65-66` unused vars).

---

## 11. SDD cycle complete

The `incidencias-rbac-agente` change has been fully planned (proposal + delta spec + design + tasks), applied (PR #10 + PR #11 stacked to master), verified (PASS, all 11 requirements + ~25 scenarios), and archived (this report + spec baseline sync).

The next SDD change for `sistema-incidencias` is open. Recommended priorities (from `audit/requirements-coverage` engram topic, ordered by impact):

1. Dashboard real con `GET /api/dashboard` (RF-06..11).
2. Notificaciones reales con tiempo real (RF-37..40).
3. Reportes + export PDF/Excel (RF-41..44).
4. Self-profile / change-own-password (RF-36).
5. Demo login mapping (`POST /api/auth/demo`).
6. Migrate `detalle/index.tsx` to consume `agentes-asignables` + 403-state UI polish (this archive's open question).