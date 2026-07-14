# Exploration: users-admin-page

**Change**: Implement the user-management admin page in the React frontend, consuming ALL 7 admin endpoints of `UsuarioController`, plus pagination.
**Project**: sistema-incidencias (hybrid SDD: engram + openspec).
**Phase**: explore → next: propose.

## Current State

### Backend (Spring Boot 4.0.6, Java 21) — verified contracts

All seven endpoints are live in `sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/usuarios/controller/UsuarioController.java` (94 lines) and validated against `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json`:

| # | Method + Path | Body | Returns | Notes |
|---|---------------|------|---------|-------|
| 1 | `GET /api/usuarios?texto&rol&activo&limit&offset` | — | `List<UsuarioResponse>` | Flat list, NOT a paginated wrapper. Defaults: `limit=20`, `offset=0`. Service clamps `limit` to `[1,100]`. |
| 2 | `GET /api/usuarios/{id}` | — | `UsuarioResponse` | 404 if not found. |
| 3 | `POST /api/usuarios` | `CrearUsuarioRequest` | 201 + `UsuarioResponse` | Validates `@NotBlank`/`@Email`/`@Size`. |
| 4 | `PUT /api/usuarios/{id}` | `ActualizarUsuarioRequest` | 200 + `UsuarioResponse` | No password. |
| 5 | `PATCH /api/usuarios/{id}/password` | `CambiarPasswordRequest` | **204 No Content** | No body. |
| 6 | `PATCH /api/usuarios/{id}/activar` | — | 200 + `UsuarioResponse` | Soft toggle. |
| 7 | `PATCH /api/usuarios/{id}/desactivar` | — | 200 + `UsuarioResponse` | Self-deactivation guard. |

**DTOs** (all in `usuarios/dto/`):
- `CrearUsuarioRequest` — `nombre` (req, 1-150), `email` (req, valid email, 1-150, UNIQUE), `password` (req, 6-100), `rolCodigo` (req, max 50), `avatarUrl` (opt, max 500, https pattern), `activo` (opt, default true).
- `ActualizarUsuarioRequest` — same as Crear minus `password`.
- `CambiarPasswordRequest` — `password` (req, 6-100).
- `UsuarioResponse` — `id, nombre, email, rol: RolResponse, activo, avatarUrl, creadoEn, actualizadoEn`. **No `cliente` / `aplicativoId` field. No `clienteNombre`.**
- `RolResponse` — `id, codigo, nombre, descripcion, activo`.

**Service invariants** (from `UsuarioService.java`, 130 lines):
- Every endpoint calls `permisoAdministracionService.validarAdministrador(token)` → throws `AccesoDenegadoException` (HTTP 403 via `GlobalExceptionHandler`).
- Email is normalized (`trim().toLowerCase()`) and uniqueness is enforced → throws `ReglaNegocioException` (HTTP 400) with message `"Ya existe un usuario con el email indicado"`.
- Role lookup: `buscarRolActivo` → throws 400 `"Rol no encontrado o inactivo"` if code is unknown or role is inactive.
- Self-deactivation guard: admin cannot deactivate themselves → throws 400 `"No puedes desactivar tu propio usuario administrador"`.
- Validation errors from `@Valid` → `MethodArgumentNotValidException` → HTTP 400 with `detalles: ["fieldName: message", ...]`.

**Error contract** (`shared/exception/GlobalExceptionHandler.java` + `shared/response/ErrorResponse.java`):
```json
{
  "fecha": "...", "estado": 400, "error": "Bad Request",
  "mensaje": "Datos de entrada invalidos", "ruta": "/api/usuarios",
  "detalles": ["email: debe ser una dirección de correo válida", ...]
}
```
Frontend `http.ts` reads `payload.mensaje ?? payload.message` → ready to display.

**Roles endpoint** (`RolController.java`):
- `GET /api/roles` → `List<RolResponse>`. Flat list, no pagination. Admin-only.
- Seed codes: `ADMINISTRADOR`, `AGENTE`, `USUARIO` (from `sistemaincidencias/AGENTS.md`).

### Frontend (Vite + React 19 + TS 5.8) — verified state

**`frontend/src/services/usuarios-service.ts`** (8 lines, currently):
```ts
listar() → apiRequest<Usuario[]>("/api/usuarios", { method: "GET" })
```
No filters, no pagination params, no other methods. **Needs 6 more methods + filter/pagination params on listar.**

**`frontend/src/types/usuarios.ts`** (18 lines):
```ts
type Rol = { id, codigo, nombre, descripcion?, activo }
type Usuario = { id, nombre, email, rol: Rol, activo, avatarUrl?, creadoEn?, actualizadoEn? }
```
Already matches `UsuarioResponse` / `RolResponse` closely. Will be reused; only `password` request type needs adding.

**`frontend/src/router.tsx`** (100 lines): no `/usuarios` route. Existing pattern: `createRoute({ getParentRoute: () => rootRoute, path: "/usuarios", component: () => <AppLayout><UsuariosPage /></AppLayout> })`.

**`frontend/src/layout/app-sidebar.tsx`** (126 lines): "Usuarios" entry exists with `icon: Users` but **NO `to`** — renders as a disabled `<button>` stub. Needs `to: "/usuarios"`.

**`frontend/src/pages/usuarios/`**: does NOT exist yet — must be created.

**`frontend/src/components/auth/private-route.tsx`** (17 lines): guards only on token presence. No role check. Non-admin users hitting `/usuarios` will get 403 from backend → must surface in-page.

**`frontend/src/store/auth-store.ts`**: `AuthUser.rol` is a `string` (role code from JWT, e.g. `"ADMINISTRADOR"`). Available for client-side role gating.

**shadcn primitives available** (in `frontend/src/components/ui/`):
- `alert`, `avatar`, `badge`, `button`, `card`, `dialog`, `field`, `input`, `label`, `separator`, `spinner`, `table`.
- No `dropdown-menu`, no `select` (shadcn), no `popover`, no `sheet`. **Currently the codebase uses native `<select>` + raw `<input>` in CRUD forms** (`categoria-form.tsx`, `cliente-form.tsx`); the modern `Field`/`FieldLabel`/`FieldError` pattern is used only in `login-form.tsx`.

**CRUD page conventions** (validated by reading `pages/categorias/index.tsx` 421 lines + `pages/clientes/index.tsx` 302 lines):
- Single `index.tsx` with `useState<Modal>("cerrado" | "nuevo" | "editar" | "eliminar")` pattern.
- Per-row action state machines: `togglingId`, `deletingId`, `isSubmitting`, etc.
- Error handling: top-level `error` for table actions, `formError` for modal-submit errors.
- `Alert` (destructive) used to show errors at top.
- `Spinner` for loading + empty-state ("Aún no hay ... registradas").
- Form components live in `pages/<view>/components/<view>-form.tsx` and are reset via `key={modal === "editar" ? \`editar-${id}\` : "nuevo"}` trick.
- Delete confirmation uses a separate `Dialog` branch (not `window.confirm`).

**Pagination precedent**: `pages/incidencias/components/incidencias-table.tsx` shows the canonical pattern (Prev/Next + page numbers + "Mostrando X-Y de TOTAL") but **requires `total` from backend**. Backend `IncidenciaController` returns `PageResult<IncidenciaResponse>` (with `contenido`, `total`, `page`, `size`). `UsuarioController` does **NOT** use `PageResult` — it returns `List<UsuarioResponse>`. **This is the most important contract mismatch.**

### Cross-cutting findings

- **lucide-react is pinned at `1.17.0`** (very low for current era). Icons already used in the codebase: `Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, AlertTriangle, Power, PowerOff, RefreshCcw, Copy, AppWindow, LogIn, LogOut, PanelLeft, Bell, LayoutGrid, Users, Briefcase, Tags, GitBranch, BarChart3, Shield, Loader2Icon`. New icons needed (User, UserCheck, UserX, Mail, KeyRound, MoreHorizontal) must be verified in `lucide-react@1.17` before use; fall back to existing icons if missing.
- **No test runner** in frontend (`package.json` has no vitest/jest). Verification = lint + build + manual smoke at `http://127.0.0.1:5173/` (per `openspec/config.yaml` and frontend AGENTS.md).
- **No `types/index.ts` barrel** — types are imported directly via `@/types/<name>` (no change needed).

## Affected Areas

| Path | Why affected |
|---|---|
| `frontend/src/services/usuarios-service.ts` | Extend from 1 → 7 methods; add filter/pagination params to `listar()`. |
| `frontend/src/types/usuarios.ts` | Add `CrearUsuarioInput`, `ActualizarUsuarioInput`, `CambiarPasswordInput`, `UsuariosFiltros`. |
| `frontend/src/router.tsx` | Register `/usuarios` private route. |
| `frontend/src/layout/app-sidebar.tsx` | Add `to: "/usuarios"` to the "Usuarios" entry (currently dead button). |
| `frontend/src/pages/usuarios/` (NEW) | `index.tsx` + `components/usuario-form.tsx` + `components/usuario-password-dialog.tsx` + `components/usuario-estado-badge.tsx` + optional `components/usuario-rol-badge.tsx`. |
| `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json` | NO changes required (already in sync with controllers). |
| Backend source files | NO changes — controllers, DTOs, service, SQL are stable. |

## Approaches Considered

### Approach 1 — Backend-driven `PageResult` (REJECTED)
- **What**: modify `UsuarioController.listar()` to return `PageResult<UsuarioResponse>` with `contenido`, `total`, `page`, `size`.
- **Pros**: matches `incidencias` pattern, enables full numeric pagination UI.
- **Cons**: out of scope for this change (frontend-only); requires backend regression; `limiteMaximo=100` constraint interacts oddly with full pagination UX; the spec said "consume ALL 7 admin endpoints, add pagination" — not "modify backend".
- **Effort**: Medium-High (backend + frontend). **Excluded**.

### Approach 2 — Frontend Prev/Next + counter (RECOMMENDED)
- **What**: keep backend flat-list contract. Frontend tracks `page` (offset/limit), fetches one page at a time, renders Prev/Next + "Mostrando X-Y" counter. Detect "no more" by `items.length < limit`. Disable Next when items.length < limit.
- **Pros**: matches backend contract exactly (zero backend changes); clean UX; reuses `Button + ChevronLeft/Right` already used in `incidencias-table.tsx`; very testable through manual smoke.
- **Cons**: no page-number jump; no "X de TOTAL" copy (will say "Mostrando X-Y (al menos)" or just "Mostrando X-Y"). For a small user table (<100) this is fine.
- **Effort**: Low.

### Approach 3 — "Load more" infinite scroll
- **What**: button at bottom "Cargar más", offset advances by `limit` each click.
- **Pros**: simplest implementation; no pagination math.
- **Cons**: not consistent with the existing pagination UX (incidencias uses page numbers); worse for admin table where users may want to jump.
- **Effort**: Low. **Acceptable alternative** if proposal prefers it.

### Recommendation: Approach 2

Aligns with the existing `incidencias-table.tsx` UX language (Prev/Next buttons + counter) without pretending we have a `total` we don't. For an admin table of internal users (typically <50), Prev/Next is sufficient. The "no total" limitation is honest — labels read `Mostrando 1-20` (no "de N").

## Open Questions for the Proposal Phase

1. **Sidebar admin gating**: should "Usuarios" be hidden for non-admins (`user?.rol !== "ADMINISTRADOR"`), or shown to all and surface a 403 state in-page? **Recommend**: shown to all (avoids sidebar flicker on role changes); the page itself surfaces 403.

2. **Self-deactivation guard**: when the admin viewing the table tries to deactivate themselves, the backend returns 400 with the exact message. Should the toggle button be **disabled proactively** in the UI when `usuario.id === currentUser.id`? **Recommend**: yes — better UX, mirrors the backend rule.

3. **Delete action**: backend has NO `DELETE /api/usuarios/{id}` endpoint. The user-provided UI mock shows a trash icon in the actions column. Three options: (a) omit delete entirely from v1, (b) hide it when not present, (c) wire "delete" → "desactivar" (intentional naming deception, NOT recommended). **Recommend**: option (a) — three actions only (edit, change-password, toggle-active), match backend surface exactly. Flag this for the user in the proposal.

4. **Rol dropdown source**: the create/edit form needs a Rol select. `GET /api/roles` returns the flat list — no separate fetch wrapper exists yet. **Recommend**: introduce `rolesService.listar()` as part of this change (one extra method, ~6 lines), or inline the fetch in the page. The skill prefers a dedicated service file: `frontend/src/services/roles-service.ts`.

5. **Cliente column**: the UI mock shows a "Cliente" column. Backend `UsuarioResponse` has no `cliente`/`aplicativoId`. **Recommend**: include the column, render `"—"` for every row in v1. Add a code comment explaining the gap and a follow-up note in `tasks.md`.

6. **Form field component choice**: codebase has two patterns — raw `<label>+<input>` (cliente-form, categoria-form) vs modern shadcn `Field/FieldLabel/FieldError` (login-form). **Recommend**: use the modern Field pattern for this new page since it's the current shadcn style and the dialog space is dense (password, role, avatar URL, etc.).

7. **lucide-react@1.17 icon availability**: the proposed action icons (`KeyRound` for change-password, `UserCheck`/`UserX` for toggle, `MoreHorizontal` for a kebab menu) may not exist in 1.17. **Mitigation**: before adding new icons, verify in a quick `node -e` check; fall back to existing icons (`Pencil, Power, PowerOff, Trash2` are confirmed present).

## Risks

- **Risk 1 (medium)**: review budget exceeded. This change likely totals 600-900 lines (1 page + 4-5 components + 7-method service + types + router/sidebar). **400-line budget** per preflight → may trigger ask-on-risk chain strategy. Proposal must forecast line count early.
- **Risk 2 (low)**: pagination UX without `total` may confuse users expecting "of N". Mitigation: honest copy ("Mostrando X-Y").
- **Risk 3 (low)**: lucide-react@1.17 icon drift — if a new icon is missing at build time, switch to an existing one.
- **Risk 4 (low)**: backend may be down/stale during development. No automated smoke backend; verification relies on visual checks. Acceptable per `openspec/config.yaml`.
- **Risk 5 (info)**: `rol.nombre` may differ from `rol.codigo` (e.g. `codigo="ADMINISTRADOR"` `nombre="Administrador"`). UI mock shows "Administrador" (Spanish, capitalized) — should display `rol.nombre` not `rol.codigo`. Backend provides both; we use `nombre` for the badge label.

## Ready for Proposal

**Yes.** All 7 endpoints are confirmed against the Postman collection; DTO field names validated; error contract understood; pagination mismatch surfaced with a clear frontend-only mitigation; frontend conventions surveyed; no blockers. The proposal should:
1. Confirm Approach 2 (Prev/Next + counter, no total).
2. Surface the 3-4 open questions above to the user before locking the design.
3. Forecast the line count and decide whether to chain PRs.
4. List the tasks in dependency order: types → service → page index → modals/forms → router+sidebar wire → manual smoke.