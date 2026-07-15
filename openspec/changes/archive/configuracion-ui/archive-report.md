# Archive Report — `configuracion-ui` (verdict PASS)

**Change**: `configuracion-ui`
**Capability**: `configuracion` (NEW capability baseline — closes the 6-change audit gap matrix)
**Project**: sistema-incidencias
**Archive date**: 2026-07-15
**Verdict**: PASS (sdd-verify: see `verify-report.md`)
**Source**: `openspec/changes/archive/configuracion-ui/verify-report.md` + engram topic `sdd/configuracion-ui/verify-report`

---

## 1. Verdict

**PASS** — sdd-verify verdict in `verify-report.md` confirms all 6 requirements and 20 Given/When/Then scenarios in the delta spec are aligned with master (`501063a`). 20/20 source-aligned (no dedicated `strict_tdd` runner for this change; the project runs in `strict_tdd: false` mode and depends on source-level audit for the new endpoints, exactly like `dashboard-real` / `perfil-self` / `notificaciones-realtime` before it).

Backend `./mvnw compile -q` exit 0 (silent). `./mvnw test -q` exit 0 with **10/10 tests passing** (1 Spring context-load + 9 `UsuarioServiceSelfTest` from `perfil-self`). Frontend `npm run lint` and `npm run build` are **net-new clean** — only 3 lint + 4 build errors remain in `frontend/src/pages/incidencias/{index.tsx,components/incidencias-table.tsx}`, all blamed to `f26424a` (PR #9) before this change. **New static regressions: 0.** `SecurityConfig.java` not touched (NFR preserved). Postman JSON valid with new "Login demo y eliminación lógica de catálogos (change F)" doc block + 5 routes (`POST /api/auth/demo`, `DELETE /api/categorias/{id}`, `DELETE /api/aplicativos/{id}`, `DELETE /api/estados-proceso/{id}`, `DELETE /api/estados-aprobacion/{id}`) and 9 sample responses (200 demo + 204 × 4 DELETEs + 401 + 403 × 3).

---

## 2. Changes shipped

The `configuracion-ui` change shipped across **2 stacked PRs** plus 7 supporting fixup commits to `master`:

- **PR #22** (`8417042`) — Slice A — Backend (T1–T5):
  - **Soft-delete for all four catalogs**: `CategoriaController`, `EstadoProcesoController`, `EstadoAprobacionController` gained `@DeleteMapping("/{id}")` returning 204 after `validarAdministrador(token)`; `AplicativoClienteController.eliminar` was converted from hard-delete (no longer drops the row from `clientes`).
  - **Catalog services**: `CategoriaService.eliminar`, `EstadoProcesoService.eliminar`, `EstadoAprobacionService.eliminar`, `AplicativoClienteService.eliminar` all chain `buscar(id)` → `cambiarActivo(id, false)`. Each is idempotent against the FK reference contract — no cascading DELETE.
  - **Catalog DAOs**: `CategoriaDao.cambiarActivo`, `AplicativoClienteDao.cambiarActivo`, `EstadoProcesoDao.cambiarActivo`, `EstadoAprobacionDao.cambiarActivo` execute a single parameterized `UPDATE <tabla> SET activo = ? WHERE id = ?` against the new `DESACTIVAR` SQL constant.
  - **Active-only lists**: `CategoriaSql.LISTAR`, `AplicativoClienteSql.LISTAR`, `EstadoProcesoSql.LISTAR`, `EstadoAprobacionSql.LISTAR` all now filter `WHERE activo = true` (was unfiltered or hard-deleted before).
  - **Demo login**: new `POST /api/auth/demo` accepting an optional `LoginDemoRequest` body (the `rol` field is accepted but ignored — design D2: the seed is authoritative). `AuthService.loginDemo(DEMO_EMAIL)` calls the new `UsuarioDao.buscarDemoPorEmail(...)` which executes `UsuarioSql.BUSCAR_DEMO_POR_EMAIL` filtering `WHERE u.activo = true AND r.activo = true AND lower(u.email) = lower(?)` — fails safely (HTTP 401) when the seed is missing or the demo user is inactive. JWT response is built identically to `login(...)` via the shared `construirRespuesta(...)`.
  - **Demo seed**: `db/scripts/002_usuarios_roles_seed.sql:42-52` inserts `demo@sistema.com` with rol ADMINISTRADOR (`00000000-0000-0000-0000-000000000001`), `activo=true`, `ON CONFLICT (email) DO NOTHING` (idempotent re-runs).
  - **Postman**: new "Login demo y eliminación lógica de catálogos (change F)" folder with 5 routes and 9 sample responses.
- **PR #24** (`501063a`) — Slice B — Frontend (T6–T10):
  - **`/configuracion` page**: new `pages/configuracion/index.tsx` (~461 LOC) gates on `useAuthStore((state) => state.user)?.rol === "ADMINISTRADOR"` and renders an access-restricted destructive Alert for non-admins. For admins it renders a `Card` with a `Tabs()` shell that owns its own `activeTab` state and mounts one of four `CatalogTab` instances per tab id (`categorias`, `aplicativos`, `estados-proceso`, `estados-aprobacion`).
  - **Generic catalog shell**: `pages/configuracion/components/catalog-tab.tsx` (~478 LOC) backs all four tabs. Each instance owns loader state, modal state (`cerrado | nuevo | editar`), values state, and the soft-delete flow. The `CatalogService<TItem, TInput>` interface (lines 64-69) abstracts `listar/crear/actualizar/eliminar` so the same shell handles Categorías, Aplicativos, Estados Proceso, and Estados Aprobación.
  - **`ELIMINAR` confirmation modal**: `pages/configuracion/components/catalog-delete-dialog.tsx` (~175 LOC) requires the operator to type the literal word `ELIMINAR` (case-insensitive trim) before the destructive submit button enables. Cancel and incorrect text send no DELETE request.
  - **State services**: new `frontend/src/services/estados-proceso-service.ts` and `estados-aprobacion-service.ts` exposing `listar / crear / actualizar / eliminar` over `apiRequest`. The existing `categorias-service.ts` and `aplicativos-service.ts` are unchanged in shape (they already exposed DELETE).
  - **Demo login wiring**: `frontend/src/services/auth-service.ts` adds `loginDemo()` issuing `POST /api/auth/demo` with no body. `frontend/src/store/auth-store.ts` adds a `loginDemo` action that persists `{token, expiresAt, user}` identically to `login(...)`. `pages/login/components/login-form.tsx` exposes an outline "Acceso demo" `<Button>` calling the action and navigating to `/dashboard` on success. Both buttons are gated by the same `isLoading` flag so they cannot double-fire.
  - **Route + sidebar**: `frontend/src/router.tsx:128-136` registers `path: "/configuracion"` inside `<AppLayout>` (which applies `PrivateRoute`). `frontend/src/layout/app-sidebar.tsx:36` adds a `Configuración` link with the `Settings` icon in the "Configuración" section.

Master HEAD at archive: `501063a`. **New static regressions introduced by this change: 0.** No new Maven dependencies; no new npm packages.

---

## 3. Requirements closed

From `docs/requerimientos.md` and the spec matrix:

- **RF-02** — Acceso demo sin credenciales (`POST /api/auth/demo` + seeded `demo@sistema.com` + "Acceso demo" login button).
- **RF-49** — Administración unificada de catálogos (page-local CRUD for `categorias`, `clientes/aplicativos`, `estados-proceso`, `estados-aprobacion` with four tabs).
- **RF-50** — Soft-delete para catálogos (admin-only `DELETE` returning 204, sets `activo=false`, hides inactive rows from lists, preserves FK references).

The change closes the unified-configuration gap that the `users-admin-page` baseline left out-of-scope and complements `incidencias-rbac-agente` (which added the `validarAdministrador` helper that all four DELETE controllers now use).

---

## 4. Master commits

| SHA | Subject |
| --- | --- |
| `76cbefc` | feat(catalogos): add admin-only soft delete for categorias |
| `3949c60` | feat(catalogos): add admin-only soft delete for estados (proceso, aprobacion) |
| `3a08dc2` | refactor(catalogos): convert aplicativo DELETE from hard to soft delete |
| `b49545d` | feat(auth): make /api/auth/demo credential-free and seed demo@sistema.com |
| `429cf24` | docs(postman): document demo login + four catalog DELETEs |
| `8417042` | feat(configuracion-ui) PR1: backend soft-delete for four catalogs + demo login (#22) |
| `ca41f95` | feat(configuracion): add /configuracion admin page with four tabs |
| `0647c6a` | feat(auth): add Acceso demo button to login form |
| `8c3013f` | docs(sdd): mark T6-T10 completed for configuracion-ui PR2 |
| `6837aa5` | docs(sdd): commit planning artifacts for configuracion-ui change |
| `501063a` | feat(configuracion) PR2: /configuracion page + demo login fix (#24) |

---

## 5. Drift applied

Two minor deviations documented for traceability, neither breaks a spec scenario:

1. **`AuthController.loginDemo` accepts an optional `LoginDemoRequest` body** — design D2 says the endpoint "resolves this exact active account, avoiding role-based first-user ambiguity". The implementation honors that intent (the `rol` field is parsed but intentionally ignored) but accepts the body shape for backward compatibility with any prior client that already posts `{"rol":"ADMINISTRADOR"}` to `/api/auth/demo`. The behavior is identical to the spec scenario "Complete demo login": the same active seeded ADMINISTRADOR is returned regardless of what the body says. Spec intent preserved; surface widened slightly.
2. **`catalog-tab.tsx` renders a generic shared shell instead of four specialized tabs** — the proposal sketched per-tab implementations; the implementation centralizes the list / create / edit / delete UI in one generic `CatalogTab` parameterized by a `CatalogService<TItem, TInput>` adapter, plus a `columns[]` / `fields[]` descriptor. Each tab (`CategoriasTab`, `AplicativosTab`, `EstadosProcesoTab`, `EstadosAprobacionTab`) is now ~25 LOC of declarative wiring (lines 317-461 of `pages/configuracion/index.tsx`). Same UX, less duplication. Net-new lines 478 (catalog-tab) + 461 (index.tsx) vs the proposal's forecast ~250-350 LOC for the page — the generic shell adds upfront cost but makes future catalog additions a one-line adapter.

No blocking drift. All other spec scenarios match the implementation 1:1.

---

## 6. Capability spec evolution

`openspec/specs/configuracion/spec.md` is now the canonical baseline (NEW capability). It contains:

- All 6 ADDED requirements + 20 Given/When/Then scenarios from `openspec/changes/archive/configuracion-ui/specs/configuracion/spec.md` (delta).
- Header rewritten from "Configuration Specification" delta language to "Capability Spec: `configuracion` — Unified configuration catalog management" baseline language.
- Archive history blockquote noting `configuracion-ui` as the seed (2026-07-15, archived).
- Resolved open questions block confirming Q1 (demo seed), Q2 (soft delete), Q3 (exact `ELIMINAR` confirmation) as defaults accepted during implementation.
- Auth boundary block clarifying the `validarAdministrador` requirement on POST/PUT/DELETE and the `validarAutenticado` requirement on GET, plus the single permitted-when-anonymous exception (`POST /api/auth/demo`).
- Soft-delete contract block documenting the FK-preservation guarantee.

---

## 7. Files

### Added (8 Java backend + 8 frontend + 1 Postman + 1 SQL)

Backend (`sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/`):
- `auth/dto/LoginDemoRequest.java` (already existed in change A's seed; reused)
- `auth/service/AuthService.java` (modified: added `loginDemo`, `DEMO_EMAIL`, `buscarDemoPorEmail` call)
- `auth/controller/AuthController.java` (modified: added `loginDemo` mapping)
- `usuarios/dao/UsuarioDao.java` (modified: added `buscarDemoPorEmail` method)
- `usuarios/sql/UsuarioSql.java` (modified: added `BUSCAR_DEMO_POR_EMAIL` constant)
- `catalogos/service/CategoriaService.java` (modified: added `eliminar`)
- `catalogos/service/EstadoProcesoService.java` (modified: added `eliminar`)
- `catalogos/service/EstadoAprobacionService.java` (modified: added `eliminar`)
- `catalogos/service/AplicativoClienteService.java` (modified: rewrote `eliminar` to use `cambiarActivo`)
- `catalogos/dao/CategoriaDao.java` (modified: added `cambiarActivo`)
- `catalogos/dao/EstadoProcesoDao.java` (modified: added `cambiarActivo`)
- `catalogos/dao/EstadoAprobacionDao.java` (modified: added `cambiarActivo`)
- `catalogos/dao/AplicativoClienteDao.java` (modified: added `cambiarActivo`)
- `catalogos/sql/CategoriaSql.java` (modified: added `DESACTIVAR`, `LISTAR` filters `activo=true`)
- `catalogos/sql/EstadoProcesoSql.java` (modified: added `DESACTIVAR`, `LISTAR` filters `activo=true`)
- `catalogos/sql/EstadoAprobacionSql.java` (modified: added `DESACTIVAR`, `LISTAR` filters `activo=true`)
- `catalogos/sql/AplicativoClienteSql.java` (modified: added `DESACTIVAR`, `LISTAR` filters `activo=true`)
- `catalogos/controller/CategoriaController.java` (modified: added `@DeleteMapping`)
- `catalogos/controller/EstadoProcesoController.java` (modified: added `@DeleteMapping`)
- `catalogos/controller/EstadoAprobacionController.java` (modified: added `@DeleteMapping`)
- `catalogos/controller/AplicativoClienteController.java` (modified: existing `@DeleteMapping` now soft-deletes)

Frontend (`frontend/src/`):
- `pages/configuracion/index.tsx` (new, 461 LOC)
- `pages/configuracion/components/catalog-tab.tsx` (new, 478 LOC)
- `pages/configuracion/components/catalog-delete-dialog.tsx` (new, 175 LOC)
- `services/estados-proceso-service.ts` (new, 48 LOC)
- `services/estados-aprobacion-service.ts` (new, 44 LOC)
- `services/auth-service.ts` (modified: added `loginDemo`, +6 LOC)
- `store/auth-store.ts` (modified: added `loginDemo` action, +29 LOC)
- `pages/login/components/login-form.tsx` (modified: added demo button + handler, +53 LOC)
- `router.tsx` (modified: added `configuracionRoute`, +12 LOC)
- `layout/app-sidebar.tsx` (modified: added `Configuración` link, +4 LOC)

Postman + SQL:
- `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json` (modified: +95 LOC for the change-F folder)
- `sistemaincidencias/src/main/resources/db/scripts/002_usuarios_roles_seed.sql` (modified: +19 LOC for the demo seed)

### Modified files (no new Maven dependencies, no new npm packages)

None beyond what's listed above. `pom.xml` and `frontend/package.json` are unchanged.

### Not modified (deliberate)

- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/shared/config/SecurityConfig.java` — existing `.requestMatchers("/api/**").authenticated()` chain already covers the new routes; admin-only and demo endpoints inherit the same `Bearer` validation (or, in the demo case, the `permitAll` default which was already permissive for `/api/auth/**` via the chained `permitAll` on the login path — confirmed by inspecting the existing filter order).
- `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/usuarios/service/PermisoAdministracionService.java` — the `validarAutenticado` and `validarAdministrador` helpers (added by `incidencias-rbac-agente`) are reused as-is.
- `frontend/src/lib/http.ts` — the centralized HTTP layer (with `Authorization: Bearer` attachment and `payload.mensaje ?? payload.message` normalization) is used unchanged through `apiRequest`.

---

## 8. Traceability

- **Proposal**: `openspec/changes/archive/configuracion-ui/proposal.md`
- **Spec (delta)**: `openspec/changes/archive/configuracion-ui/specs/configuracion/spec.md` — **synced into** `openspec/specs/configuracion/spec.md` (NEW baseline).
- **Design**: `openspec/changes/archive/configuracion-ui/design.md`
- **Tasks**: `openspec/changes/archive/configuracion-ui/tasks.md`
- **Verify**: `openspec/changes/archive/configuracion-ui/verify-report.md`
- **Apply progress**: master commits `76cbefc` → `501063a` (11 commits across both PRs).
- **Verify verdict**: engram topic `sdd/configuracion-ui/verify-report` (this report and the topic key).
- **Archive verdict**: engram topic `sdd/configuracion-ui/archive-report`.

---

## 9. Risks / follow-ups

1. **Manual smoke pending** — sdd-verify performed code-level audit plus the full Maven suite (10/10 tests pass). A real end-to-end smoke (ADMIN token hitting `/api/categorias/{id}` DELETE + inactive-row exclusion + `/api/auth/demo` returning a valid JWT + AGENTE token getting 403 on the same DELETE) was not run against a live PostgreSQL instance. Recommended as a follow-up validation step (can be done with Playwright CLI on the dev server, following the canonical smoke checklist used by previous archives).
2. **JWT revocation on soft delete (catalog row)** — the same caveat as `perfil-self`: the auth filter validates JWT claims without a fresh lookup of every referenced catalog row. Catalog soft-delete does not invalidate any session; it only hides rows from `LISTAR`. No tokens to revoke.
3. **In-app audit logging for DELETE** — the four DELETE endpoints do not log the operator id + target id + resource. For an admin action that touches the catalog shape, a follow-up could route the four `eliminar` calls through a shared `CatalogAuditService.registrarEliminacion(rol, id, recurso)` for traceability.
4. **No dedicated JUnit coverage** — the project runs in `strict_tdd: false`; this change adds no test class. A follow-up could add `CategoriaServiceTest`, `EstadoProcesoServiceTest`, `EstadoAprobacionServiceTest`, `AplicativoClienteServiceTest`, and `AuthServiceDemoTest` mirroring the `UsuarioServiceSelfTest` pattern from `perfil-self`, to lock the soft-delete + demo contracts against future regressions.
5. **`asignadoA` UUID display** — N/A here (dashboard concern from `dashboard-real` archive). Carry-over risk log entry preserved for cross-referencing.
6. **Pre-existing `incidencias/*` lint/build errors** — 3 unused-var + 1 type-mismatch errors in `pages/incidencias/{index.tsx,components/incidencias-table.tsx}` from PR #9 remain in master. Out of scope for `configuracion-ui`; recommended as a dedicated cleanup PR. Carry-over from `dashboard-real` and `perfil-self` archives.

---

## 10. Next recommended

With the audit gap matrix (changes A–F) closed, the remaining work is **operational hardening** rather than feature gaps:

1. **Pre-existing `incidencias/*` lint/build cleanup** — 3 + 4 errors from PR #9. Low risk, isolated, fast PR.
2. **Migration of `frontend/src/pages/incidencias/detalle/index.tsx`** to consume `/api/usuarios/agentes-asignables` (callers in `detalle/index.tsx:117, 158` still hit the admin-only `/api/usuarios` — carry-over from `dashboard-real` and `perfil-self` archives).
3. **Audit-logging for catalog DELETEs** — see risk #3 above.
4. **Dedicated test class for catalog services + AuthService.loginDemo** — see risk #4 above.
5. **Restore/reactivate UI for soft-deleted catalog rows** — out-of-scope for `configuracion-ui`. A future change could add a "Mostrar inactivos" toggle and a "Reactivar" action to the `/configuracion` page, gated on the same admin role.
6. **Production demo-account policy** — the seeded `demo@sistema.com` is appropriate for dev environments but should be disabled or removed before production deploy. Out of scope for `configuracion-ui`; a deployment-config follow-up.

---

## 11. SDD cycle complete

Change F `configuracion-ui` shipped through the full SDD lifecycle:

- ✅ `sdd-propose` → `proposal.md` (67 lines, 8 sections, 3 open questions resolved with defaults).
- ✅ `sdd-spec` → `specs/configuracion/spec.md` (6 requirements, 20 Given/When/Then scenarios).
- ✅ `sdd-design` → `design.md` (79 lines, 5 decisions D1–D5, mermaid data flow, security threat matrix, threat matrix RED tests marked N/A).
- ✅ `sdd-tasks` → `tasks.md` (10 dependency-ordered tasks across 2 PRs, 400-line review workload forecast).
- ✅ `sdd-apply PR1` → backend (PR #22 + 5 supporting fixup commits, +20 catalogos files / +auth demo / +Postman / +seed; BUILD SUCCESS).
- ✅ `sdd-apply PR2` → frontend (PR #24 + 4 supporting fixup commits, +3 new page files / +2 new services / -0 deletions; lint+build net-new clean).
- ✅ `sdd-verify` → `verify-report.md` (PASS, 6/6 requirements aligned, 20/20 source-audit aligned, 0 regressions).
- ✅ `sdd-archive` → this report + `openspec/specs/configuracion/spec.md` NEW baseline synced.

### 11.1 Audit gap matrix closure

The audit gap matrix spanned **6 sequential changes** (A–F), each closing one or more `requerimientos.md` gaps. With `configuracion-ui` archived, the full matrix is now closed:

| Change | Capability | RFs closed | Commit | Archive |
| --- | --- | --- | --- | --- |
| **A** `incidencias-rbac-agente` | `incidencias` (extended) | RF-04, RF-05 (admin/scope/agent assignment) | `46a1042` + `5846214` | ✅ `archive/incidencias-rbac-agente/archive-report.md` |
| **B** `dashboard-real` | `dashboard` (NEW) | RF-06, RF-07, RF-08, RF-09, RF-10, RF-11, RNF-01 (1.5s p95) | `062e33c` + `1258ca4` | ✅ `archive/dashboard-real/archive-report.md` |
| **C** `reportes-export` | `reportes` (NEW) | RF-12, RF-13, RF-14 (PDF + XLSX export) | `31fc319` + `7b18b00` | ✅ `archive/reportes-export/archive-report.md` |
| **D** `notificaciones-realtime` | `notificaciones` (NEW) | RF-22, RF-23, RF-24 (in-app notifications + topbar polling) | `aa5b2b4` + `8371f82` + `2568f15` (verify-gaps fix) | ✅ `archive/notificaciones-realtime/archive-report.md` |
| **E** `perfil-self` | `usuarios` (extended) | RF-33, RF-36 (self-profile + own password change + admin soft delete) | `71d963f` + `7c22c9f` | ✅ `archive/perfil-self/archive-report.md` |
| **F** `configuracion-ui` | `configuracion` (NEW) | RF-02, RF-49, RF-50 (demo login + unified catalog CRUD with soft delete) | `8417042` + `501063a` | ✅ `archive/configuracion-ui/archive-report.md` (this report) |

Total: **6 changes, 6 archived, 1 NEW + 1 extended capability baseline, 0 open audit gaps.** Master HEAD at archive: `501063a`.

Verdict: **PASS**. Archived.