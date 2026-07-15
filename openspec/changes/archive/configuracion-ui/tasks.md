# Tasks: Unified configuration catalog management

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 400–460 authored lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 backend + Postman → PR 2 frontend |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending user choice |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Demo + four soft-delete APIs | PR 1 | `cd sistemaincidencias && ./mvnw test` | Postman admin/non-admin smoke | Backend controllers/services/DAOs/SQL, seed, collection |
| 2 | `/configuracion` and demo button | PR 2 | `cd frontend && npm run lint && npm run build` | Manual browser CRUD/demo flow | Frontend route, page components, services, login wiring |

## Phase 1: Backend and API contract

- [x] **1.1 (T1) Category DELETE** — **Where:** `catalogos/{controller,service,dao,sql}`. **Action:** add admin-only soft delete. **Done when:** 204/403 behavior and active-only list are verified.
- [x] **1.2 (T2) Application DELETE** — **Where:** `AplicativoClienteService`, `Dao`, `Sql`, controller contract. **Action:** replace hard delete with `activo=false`. **Done when:** existing FK references survive and no physical DELETE remains.
- [x] **1.3 (T3) State DELETEs** — **Where:** process/approval controllers, services, DAOs, SQL. **Action:** add both admin-only endpoints. **Done when:** each returns 204 and inactive rows are excluded.
- [x] **1.4 (T4) Demo seed and route** — **Where:** `AuthController`, `AuthService`, `002_usuarios_roles_seed.sql`. **Action:** expose no-body `/api/auth/demo` for `demo@sistema.com` / `demo123`. **Done when:** active seed returns JWT and missing seed fails safely.
- [x] **1.5 (T5) Postman synchronization** — **Where:** `SistemaIncidencias.postman_collection.json`. **Action:** document demo plus four DELETE requests, auth, 204, 403, and soft-delete semantics. **Done when:** collection paths match controllers.

## Phase 2: Frontend configuration and login

- [x] **2.1 (T6) Configuration shell** — **Where:** `pages/configuracion/`, `router.tsx`, `app-sidebar.tsx`, state types/services. **Action:** add private admin-gated route and four tabs with list/loading/error/empty states. **Done when:** admin can open each tab and inactive rows are absent.
- [x] **2.2 (T7) Category/application tabs** — **Where:** configuration page components and existing catalog services. **Action:** implement create/edit/list actions for Categorías and Aplicativos. **Done when:** successful mutations refresh data and API errors render.
- [x] **2.3 (T8) State tabs** — **Where:** new process/approval services, types, and tab components. **Action:** implement create/edit/list actions for both state catalogs. **Done when:** fields and refresh behavior match each API contract.
- [x] **2.4 (T9) Delete confirmation** — **Where:** `pages/configuracion/components/catalog-delete-dialog.tsx`. **Action:** require exact `ELIMINAR`, disable incorrect input, and refresh after one DELETE. **Done when:** cancel/incorrect text send no request.
- [x] **2.5 (T10) Login demo button** — **Where:** `auth-service.ts`, `auth-store.ts`, `login-form.tsx`. **Action:** call `/api/auth/demo`, persist JWT, disable while loading, and navigate to dashboard. **Done when:** demo works without typing credentials and normal login remains usable.

## Verification handoff

- Apply backend work first, then frontend against the documented contracts.
- High forecast: ask for chain strategy before apply; do not start oversized single-PR implementation.
