# Proposal: Unified configuration catalog management

## 1. Title & metadata

| Field | Value |
|---|---|
| Change name | `configuracion-ui` |
| Status | proposed |
| Scope | Change F; RF-02, RF-49, RF-50 |
| Delivery | Medium; one PR or two focused PRs |

## 2. Why

RF-02 has partial backend plumbing (`AuthService.loginDemo`, `LoginDemoRequest`, and a permitted route), but no controller route or working login action. RF-49/RF-50 lack a unified administration surface. `aplicativos` currently hard-deletes; the other three catalogs have no DELETE. Soft deletion is required to preserve foreign-key references.

## 3. What changes

### Backend
- Seed active `demo@sistema.com` / `demo123` and expose credential-free demo login.
- Provide admin-only soft DELETE for `/api/categorias/{id}`, `/api/aplicativos/{id}`, `/api/estados-proceso/{id}`, and `/api/estados-aprobacion/{id}`.
- Convert aplicativo deletion to `activo=false` and filter inactive rows from lists.

### Frontend
- Add admin-gated `/configuracion` with tabs Categorías, Aplicativos, Estados Proceso, and Estados Aprobación.
- Each tab provides list, create, edit, and soft-delete actions; add `ELIMINAR` confirmation.
- Wire “Acceso demo” without credential entry.

## 4. Files affected

Backend catalog controllers/services/DAOs/SQL, auth controller/service, seed script, and Postman collection. Frontend router/sidebar, login, auth service/store, new configuration page/components, and catalog types/services.

## 5. Open questions

- **Q1 — Demo mechanism:** seed user vs environment bypass? **Default:** `demo@sistema.com` / `demo123` seed and demo endpoint.
- **Q2 — DELETE mode:** soft vs hard? **Default:** soft (`activo=false`), preserving references.
- **Q3 — Confirmation:** modal text input? **Default:** exact `ELIMINAR`, matching profile confirmation.

## 6. Out of scope

Restore UI, bulk/import/export operations, catalog reordering, non-admin writes, and production demo-account policy management.

## 7. Dependencies

Depends on change A (`incidencias-rbac-agente`) for administrator permission validation. Postman remains the endpoint-contract source.

## 8. Effort

Medium, approximately 250–350 authored LOC; one PR or backend/frontend split.

## Capabilities

### New Capabilities
- `configuracion`: Admin catalog CRUD, soft-delete API behavior, inactive filtering, demo access, and `/configuracion` UI.

### Modified Capabilities
- None; no standalone auth spec exists.

## Approach, risks, and rollback

Reuse the DAO → service → controller pattern and `CategoriasPage` composition. Add contracts before UI wiring. Mitigate seed drift and hard-delete regressions with idempotent SQL, Postman examples, and soft-delete checks. Roll back by reverting implementation commits; inactive rows remain recoverable by data repair.

## Success criteria

- [ ] Demo authenticates without typed credentials.
- [ ] Four DELETE routes return 204 for admins and reject non-admins.
- [ ] Inactive rows remain stored and absent from lists.
- [ ] Admin completes CRUD for all four catalogs at `/configuracion`.
