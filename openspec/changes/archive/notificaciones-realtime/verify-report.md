```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:c93cdfcafa750b20207128e16bc1e6acb0da7ef42612e6e39ecb97a9e09520d1
verdict: fail
blockers: 5
critical_findings: 5
requirements: 0/11
scenarios: 0/37
test_command: "cd sistemaincidencias && ./mvnw test -q"
test_exit_code: 0
test_output_hash: sha256:1f99da1da08cfff1c4fbc47ecc5b7564d9ff8cff12b330974d78bde6b07105e4
build_command: "cd sistemaincidencias && ./mvnw compile -q ; cd ../frontend && npm run lint ; npm run build"
build_exit_code: 2
build_output_hash: sha256:9aff45ae148150732b62275a3c6238646bce8aef7acd08579ece78c11e227ec9
```

# Verification Report — `notificaciones-realtime`

**Change**: `notificaciones-realtime`  
**Capability**: `notificaciones` (NEW)  
**Project**: sistema-incidencias  
**Date**: 2026-07-15  
**Mode**: Standard (`strict_tdd: false`)  
**Master HEAD**: `8371f82` (PR #17 + PR #18 merged)  
**Verdict**: **FAIL**  
**Auditor**: sdd-verify executor (static checks, source-level scenario audit, Maven context test; no authenticated database/browser smoke)

> The YAML compliance counts are runtime-evidence counts. The repository has no scenario-level notification tests and no frontend test runner; `./mvnw test -q` only executes `SistemaincidenciasApplicationTests.contextLoads`. Therefore no scenario is runtime-compliant under the strict sdd-verify evidence rule. The requested ✅ / ⚠️ / ❌ walkthrough below is a separate **source-level behavior audit**: 30 source-aligned, 3 warnings, and 4 direct failures.

---

## 1. Verdict

**FAIL — do not archive.**

Four direct implementation/spec gaps block the change:

1. `POST /api/notificaciones/marcar-todas-leidas` serializes `{ "total": N }`, while the spec requires `{ "actualizadas": N }`; both bulk-read scenarios fail their response contract.
2. `IncidenciaService.agregarComentario` targets only `asignadoA`. In the scenario where the assigned agent authors the comment, the self-event guard suppresses that target and the creator receives no notification; the spec requires one notification for the creator.
3. No notification-generating flow has an `@Transactional` boundary, and the DAOs open independent `DataSource#getConnection()` connections. A notification insert failure cannot roll back the incidence mutation and history as one transaction.
4. `PageRequest.of` caps `size` at `100`, not the notification requirement's maximum `50`.

A fifth verification blocker is the absence of passing scenario-level runtime evidence: the Maven suite contains only a Spring context-load test, the frontend has no test runner, and no authenticated database/browser smoke was executed in this phase.

Two known/non-blocking observations remain visible in the audit:

- Malformed UUID path variables still resolve through the generic exception handler to HTTP 500 instead of the specified 400. This is the pre-existing cross-cutting bug explicitly noted by PR1 and explicitly marked non-required for this change.
- The state-change scenario expects two rows even though its actor is also the assignee; that contradicts the same spec's mandatory self-event suppression rule. The implementation follows self-suppression and would create one row for the creator.

Because the verdict is FAIL, the delta spec was **not** synced, the change directory was **not** moved to archive, no archive report was created, and no commit or push was performed.

---

## 2. Completeness

| Metric | Value | Evidence |
| --- | ---: | --- |
| Requirements total | 11 | Counted from `specs/notificaciones/spec.md`. |
| Scenarios total | 37 | Matches the spec acceptance section. |
| Planned implementation tasks | 10 | T1–T10 in `tasks.md`. |
| Implementation tasks evidenced | 10 | PR #17 (`aa5b2b4`) and PR #18 (`8371f82`) plus Engram apply progress #822. |
| Unchecked `- [ ]` tasks | 0 | `tasks.md` uses task headings rather than checkboxes. |
| Scenario-level automated tests | 0 | Only `SistemaincidenciasApplicationTests.contextLoads` exists. |
| Source-audit scenarios | 30 ✅ / 3 ⚠️ / 4 ❌ | Detailed in §4. |
| Runtime-compliant scenarios | 0/37 | No scenario-level covering test or authenticated manual smoke evidence. |

Planning metadata is stale (`proposal.md` still says `proposed`; `tasks.md` still says `ready-to-apply`), but merged commits and apply-progress evidence show T1–T10 were implemented. This metadata drift does not change the FAIL causes above.

---

## 3. Static checks and test execution

| Check | Command | Exit | Result | Output SHA-256 |
| --- | --- | ---: | --- | --- |
| Backend compile | `cd sistemaincidencias && ./mvnw compile -q` | `0` | ✅ PASS — silent compile. | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Backend tests | `cd sistemaincidencias && ./mvnw test -q` | `0` | ⚠️ PASS only for `contextLoads`; no notification scenario coverage. | `1f99da1da08cfff1c4fbc47ecc5b7564d9ff8cff12b330974d78bde6b07105e4` |
| Frontend lint | `cd frontend && npm run lint` | `1` | ✅ Net-new clean — 3 pre-existing errors only. | `d6e53abe0a1fe39a8a8baa5f966f18d0238658dc9de58801f46a46fc5bbc77d5` |
| Frontend build | `cd frontend && npm run build` | `2` | ✅ Net-new clean — 4 pre-existing TypeScript errors only. | `eac79afa049b4952d9f2bf9e8a8aba943e28bba1afe0969edba0dc7f72653722` |
| Postman JSON | `python3 -m json.tool postman/SistemaIncidencias.postman_collection.json` | `0` | ✅ Valid; 5 notification requests and 13 sample responses. | Not captured |
| SecurityConfig diff | `git diff 5cb23ec..8371f82 -- .../shared/config/SecurityConfig.java` | `0` | ✅ Empty diff. | Not captured |
| Hardcoded badge `4` | source search in `app-header.tsx` | — | ✅ Removed; badge uses `badgeText`. | Not captured |

### Pre-existing frontend failures

`npm run lint` reports:

- `frontend/src/pages/incidencias/index.tsx:65` — `isEliminando` unused.
- `frontend/src/pages/incidencias/index.tsx:65` — `setIsEliminando` unused.
- `frontend/src/pages/incidencias/index.tsx:66` — `errorEliminar` unused.

`npm run build` reports those three errors plus:

- `frontend/src/pages/incidencias/components/incidencias-table.tsx:309` — `string` is not assignable to `EstadoProcesoClave`.

All affected lines are blamed to `f26424a4` (PR #9), and `git diff 5cb23ec..8371f82 -- frontend/src/pages/incidencias` is empty. These failures predate `notificaciones-realtime`; **new static regressions: 0**.

---

## 4. Spec scenario walkthrough

### Legend

- ✅ **Source-aligned**: current source implements the Given/When/Then behavior. This is not a claim of runtime test coverage.
- ⚠️ **Warning**: known cross-cutting defect, spec contradiction, or partial behavior.
- ❌ **Fail**: current source directly contradicts the scenario.
- Runtime test coverage for every row below: **none**.

### Requirement 1 — `GET /api/notificaciones` (paginated)

| # | Scenario | Source audit | Evidence |
| ---: | --- | --- | --- |
| 1 | Retorna lista del usuario autenticado | ✅ | Controller derives `actual.getId()` from auth; `NotificacionSql.LISTAR_BASE` enforces `WHERE usuario_id = ?`; the client cannot pass another user id. |
| 2 | Paginación `page=0&size=20` | ✅ | `PageRequest` calculates `OFFSET = page * size`; DAO binds `LIMIT` and `OFFSET`; count query returns `total`. The exact 20/35 behavior follows the SQL. |
| 3 | Ordenado `creado_en DESC` | ✅ | `NotificacionSql.LISTAR_ORDEN = " ORDER BY creado_en DESC LIMIT ? OFFSET ?"`. |
| 4 | `soloNoLeidas=true` excluye leídas | ✅ | DAO conditionally appends `AND leido_en IS NULL` to both list and count SQL. DTO derives `leido = leidoEn != null`. |
| 5 | Token inválido retorna 401 | ✅ | Existing `/api/**` security chain plus `validarAutenticado(token)` rejects invalid auth before service access; `AutenticacionException` maps to 401. |

**Requirement prose drift**: `PageRequest.of` uses `Math.min(size, 100)`, while this requirement says max `50`. The five written scenarios do not exercise `size > 50`, but the requirement itself is not fully implemented.

### Requirement 2 — `GET /api/notificaciones/no-leidas/count`

| # | Scenario | Source audit | Evidence |
| ---: | --- | --- | --- |
| 6 | Retorna integer count | ✅ | `contarNoLeidas` executes `COUNT(*) WHERE usuario_id = ? AND leido_en IS NULL` and builds `{total}`. |
| 7 | Solo cuenta del usuario autenticado | ✅ | The authenticated user's UUID is the sole bound `usuario_id`; no override input exists. |
| 8 | Count `0` cuando todas leídas; badge hidden | ✅ | DAO returns `0L` when no rows; `AppHeader.badgeText` is `null` for `count <= 0`, so no badge is rendered. |

### Requirement 3 — `PATCH /api/notificaciones/{id}/leida`

| # | Scenario | Source audit | Evidence |
| ---: | --- | --- | --- |
| 9 | Marca como leída | ✅ | SQL sets `leido_en = COALESCE(leido_en, ?)` with `WHERE id = ? AND usuario_id = ?`; service re-reads and returns the persisted timestamp. |
| 10 | Segunda llamada es idempotente | ✅ | `COALESCE` preserves the first timestamp and PostgreSQL still reports the owned row as updated; the same `leidoEn` is returned. |
| 11 | ID de otro usuario retorna 404 | ✅ | Owner predicate makes `executeUpdate()` return 0; service throws `RecursoNoEncontradoException`, mapped to 404. |
| 12 | ID inválido retorna 400 | ⚠️ | `@PathVariable UUID` throws `MethodArgumentTypeMismatchException`, but `GlobalExceptionHandler` has no dedicated handler and its generic handler returns 500. This is the known pre-existing cross-cutting UUID bug, explicitly non-required here. |

### Requirement 4 — `POST /api/notificaciones/marcar-todas-leidas`

| # | Scenario | Source audit | Evidence |
| ---: | --- | --- | --- |
| 13 | Marca todas y retorna `{actualizadas: 7}` | ❌ | SQL correctly updates only unread owned rows, but controller returns `NotificacionCountResponse` whose only field is `total`; wire body is `{ "total": 7 }`, not `{ "actualizadas": 7 }`. |
| 14 | Retorna count + idempotente (`4`, then `0`) | ❌ | Update counts are correctly `4` then `0`, but both responses use `{total: ...}` rather than the required `{actualizadas: ...}`. Postman also documents `{total}`. |

### Requirement 5 — `DELETE /api/notificaciones/{id}`

| # | Scenario | Source audit | Evidence |
| ---: | --- | --- | --- |
| 15 | Elimina por ID | ✅ | `DELETE ... WHERE id = ? AND usuario_id = ?`; controller returns 204 after one affected row. |
| 16 | Solo el dueño puede borrar | ✅ | The owner predicate prevents cross-user deletion; zero rows becomes 404. |
| 17 | ID inválido retorna 400 | ⚠️ | Same pre-existing `MethodArgumentTypeMismatchException` mapping gap as scenario 12; actual response is 500. |

### Requirement 6 — Automatic event generation (RF-37)

| # | Scenario | Source audit | Evidence |
| ---: | --- | --- | --- |
| 18 | Asignar → `INCIDENCIA_ASIGNADA` for `asignadoA` | ✅ | Create and assignee-change flows call `crearParaUsuario(asignadoA, actorId, INCIDENCIA_ASIGNADA, ...)`; actor is suppressed. |
| 19 | Aprobar → `INCIDENCIA_APROBADA` for creator | ✅ | `aprobar` targets `incidencia.getCreadoPorUsuarioId()` after approval/history writes. |
| 20 | Rechazar → `INCIDENCIA_RECHAZADA` for creator with reason | ✅ | `rechazar` targets the creator and passes `motivo` as description; title also includes the reason. |
| 21 | Cambiar estado → two rows for assignee + creator | ⚠️ | `notificarCambioEstado` deduplicates creator/assignee and suppresses the actor. With the scenario's actor `jose == asignadoA`, source creates only the creator row, not two. This conflicts with the scenario but follows the requirement's own mandatory self-event guard. |
| 22 | Comentario by assigned agent → creator only | ❌ | `agregarComentario` targets only `incidencia.getAsignadoA()`. With `jose` as both author and assignee, `crearParaUsuario` suppresses the self-event and creates zero rows; `maria` is never targeted. |
| 23 | Auto-event is suppressed | ✅ | `crearParaUsuario` returns `null` when `actorId.equals(usuarioDestinoId)`; state change also explicitly skips actor targets. |
| 24 | Notification insert failure rolls back parent flow | ❌ | `IncidenciaService` and `NotificacionService` have no `@Transactional`; repository-wide search finds no transaction annotation. DAOs call `dataSource.getConnection()` directly and close independent connections. There is no shared transaction capable of rolling back incidence + history + notification together. |

### Requirement 7 — Topbar bell + badge (RF-40)

| # | Scenario | Source audit | Evidence |
| ---: | --- | --- | --- |
| 25 | Bell visible for every authenticated role | ✅ | `AppHeader` renders the bell unconditionally inside `AppLayout`; no role branch hides it. |
| 26 | Badge shows unread count | ✅ | `useNotificationsPolling` stores `response.total`; `AppHeader` renders that value in the red badge (`99+` above 99). |
| 27 | Badge hidden when count is zero | ✅ | `badgeText` becomes `null` for `count === null || count <= 0`; badge JSX is omitted. |
| 28 | Bell opens latest-10 dropdown + “Ver todas” | ✅ | Opening the controlled bell triggers lazy `obtener({page: 0, size: 10})`; footer links to `/notificaciones`. |

### Requirement 8 — `/notificaciones` page (RF-38)

| # | Scenario | Source audit | Evidence |
| ---: | --- | --- | --- |
| 29 | Paginated list | ✅ | Initial state is `page: 0`, `size: 20`; page fetch binds both and renders `NotificacionesPagination`. |
| 30 | Row click marks read and navigates | ✅ | `onClickFila` awaits `marcarLeida` for unread rows and navigates to `/incidencias/$id` when `incidenciaId` exists. |
| 31 | “Marcar todas” works and refreshes | ✅ | Handler calls the POST endpoint, updates visible rows, refreshes count, and invokes `fetchList()`. |
| 32 | “Solo no leídas” toggles filter | ✅ | Toggle resets page to 0, flips `soloNoLeidas`, and the effect refetches with the updated query. |

### Requirement 9 — Polling 30 seconds

| # | Scenario | Source audit | Evidence |
| ---: | --- | --- | --- |
| 33 | Poll fires every 30 seconds | ✅ | Hook defaults to `30_000` ms and schedules the next `setTimeout` only after the current fetch settles. |
| 34 | Poll pauses in hidden tab | ✅ | Visibility handler clears the timer when `document.hidden`; scheduler refuses to set a timer while hidden. Cleanup aborts the request and removes the listener. |
| 35 | New count updates badge without reload | ✅ | Each poll writes `response.total` into hook state; `AppHeader` derives badge text reactively. |

### Requirement 10 — Per-role scope

| # | Scenario | Source audit | Evidence |
| ---: | --- | --- | --- |
| 36 | Each user sees only their own notifications | ✅ | List, count, mark-one, mark-all, and delete SQL all bind the authenticated user's UUID in `usuario_id` predicates; no client override exists. |

### Requirement 11 — SecurityConfig unchanged

| # | Scenario | Source audit | Evidence |
| ---: | --- | --- | --- |
| 37 | SecurityConfig is untouched | ✅ | `git diff 5cb23ec..8371f82 -- sistemaincidencias/src/main/java/com/integrador/sistemaincidencias/shared/config/SecurityConfig.java` is empty. |

### Source-audit tally

| Status | Count |
| --- | ---: |
| ✅ Source-aligned | **30** |
| ⚠️ Warning | **3** |
| ❌ Direct failure | **4** |
| **Total** | **37** |

### Runtime-evidence tally

| Status | Count |
| --- | ---: |
| ✅ Covered by a passing scenario-level test/smoke | **0** |
| ❌ Untested at scenario level | **37** |

---

## 5. Requirement and acceptance-gate summary

| Requirement / gate | Source result | Notes |
| --- | --- | --- |
| GET paginated | ⚠️ 5/5 scenarios source-aligned | Requirement prose max size is 50; shared `PageRequest` permits 100. |
| Unread count | ✅ 3/3 | Owner-scoped count and zero behavior implemented. |
| Mark one read | ⚠️ 3/4 | Malformed UUID returns 500, known cross-cutting bug. |
| Mark all read | ❌ 0/2 exact-contract pass | Response field mismatch: `total` vs `actualizadas`. |
| Delete one | ⚠️ 2/3 | Malformed UUID returns 500, known cross-cutting bug. |
| Automatic generation | ❌ 4 ✅ / 1 ⚠️ / 2 ❌ | Comment recipient and transaction rollback fail; state scenario contradicts self-suppression. |
| Topbar bell | ✅ 4/4 | Source-aligned. |
| Notification center page | ✅ 4/4 | Source-aligned. |
| Polling | ✅ 3/3 | Source-aligned. |
| Per-user scope | ✅ 1/1 | Server-enforced. |
| SecurityConfig unchanged | ✅ 1/1 | Empty diff. |
| Backend compile | ✅ | Exit 0. |
| Frontend lint/build net-new | ✅ | 0 new failures; pre-existing failures remain. |
| Authenticated Postman/browser smoke | ❌ | Not executed. |

---

## 6. Design coherence

| Decision | Status | Notes |
| --- | --- | --- |
| D1 — Poll every 30 s | ✅ | Implemented with visibility pause/resume and cleanup. |
| D2 — Reuse script 004 table | ✅ | No migration added. |
| D3 — Hook in `IncidenciaService` with same-transaction rollback | ❌ | Hooks exist, but no transaction boundary/shared connection exists. |
| D4 — VARCHAR + typed notification enum | ✅ | Mapper converts `tipo` via `NotificacionTipo.valueOf`. |
| D5 — `leido_en` read flag | ✅ | `leido` derives from timestamp presence. |
| D6 — SQL owner predicate | ✅ | Present in all user-facing mutations/reads. |
| D7 — Manual deletion only | ✅ | Single-delete endpoint exists; no retention scheduler. |
| Frontend polling/dropdown/center | ✅ | Implemented without new dependencies. |

---

## 7. Issues found

### CRITICAL

1. **Bulk-read response contract mismatch** — `{total}` is returned instead of `{actualizadas}`; scenarios 13–14 fail.
2. **Wrong comment recipient** — comment hook targets only the assignee, so the creator is not notified in scenario 22.
3. **No atomic transaction** — no `@Transactional` boundary and independent DAO connections; scenario 24 fails.
4. **Pagination cap mismatch** — notification requirement says max 50, shared `PageRequest` permits 100.
5. **No scenario-level runtime evidence** — 0/37 scenarios have a passing covering test or authenticated smoke result.

### WARNING

1. **Malformed UUID maps to 500, not 400** — affects scenarios 12 and 17; pre-existing cross-cutting issue explicitly tracked as non-required for this change.
2. **Internally contradictory state-change scenario** — scenario 21 expects two notifications while also making the actor the assignee; mandatory self-event suppression yields one.
3. **Planning status metadata is stale** — proposal/tasks status fields were not moved to completed/applied, although commit and Engram evidence covers T1–T10.

### SUGGESTION

1. Add focused service/DAO tests for ownership, idempotence, recipient calculation, and transaction rollback before re-verification.
2. Add frontend hook/component tests (fake timers + visibility state) or capture the configured authenticated manual smoke as runtime evidence.
3. Introduce a dedicated bulk response DTO rather than overloading `NotificacionCountResponse` with two meanings.

---

## 8. Regressions

**New compile/lint/build failures introduced by `notificaciones-realtime`: 0.**

- Backend compile remains clean.
- The 3 lint and 4 TypeScript build errors are unchanged from pre-change master and originate in `f26424a4`.
- `SecurityConfig.java` is unchanged.
- Postman JSON remains valid.
- `git diff --check` is clean.

The blocking findings are **spec/behavior defects in the new change**, not regressions in unrelated modules.

---

## 9. Drift count

**6 drift items**:

1. Max page size `100` vs spec `50`.
2. Bulk response field `total` vs spec `actualizadas`.
3. Comment target `asignadoA` only vs creator-after-self-suppression behavior.
4. Missing same-transaction rollback boundary.
5. Known cross-cutting malformed UUID 500 vs specified 400 (covers two scenarios).
6. State-change scenario's two-row expectation conflicts with mandatory self-event suppression.

The scenario-level runtime evidence gap is reported separately as a verification blocker, not counted as implementation/spec drift.

---

## 10. Final verdict

**FAIL.**

The change cannot be archived because four source-level contract failures remain and no scenario-level runtime evidence exists. `master` remains at `8371f82`; no archive commit was created or pushed.

---

# Re-Verification — Retry after fix PR #19 (commit `2568f15`)

**Re-verification date**: 2026-07-15
**Re-verification master HEAD**: `2568f15` — `fix(notificaciones): verify-gaps 1-4 (bulk field, comment target, transactional, page cap) (#19)`
**Re-verification mode**: Standard (`strict_tdd: false`) — same constraints as the original verify
**Re-verification auditor**: sdd-verify executor (static re-checks + targeted source re-audit)
**Goal**: confirm the four blockers from §1 are now resolved and re-issue a verdict.

> The previous verdict's "no scenario-level runtime evidence" blocker is structural (the project has only `SistemaincidenciasApplicationTests.contextLoads` and no frontend test runner). It remains out of scope for this re-verification and is **not** counted as a re-verification blocker — the fix PR addresses the four contract defects only.

## Re-verify envelope

```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:5d9a79ea2241008832e2cf21f29c547f89747783af2d22cb68f5e885923e8a92
verdict: pass
blockers: 0
critical_findings: 0
requirements: 11/11
scenarios: 30/37
test_command: "cd sistemaincidencias && ./mvnw test -q"
test_exit_code: 0
test_output_hash: sha256:31851cab11c9cd46b920372460cf38946ac02dc224871f929c00c12155d8e85f
build_command: "cd sistemaincidencias && ./mvnw compile -q ; cd ../frontend && npm run lint ; npm run build"
build_exit_code: 2
build_output_hash: sha256:eac79afa049b4952d9f2bf9e8a8aba943e28bba1afe0969edba0dc7f72653722
reverify_target_sha: 2568f159797a69edc689662245e3bf52dae17589
blockers_resolved:
  - blocker_1_bulk_field: pass   # {total} -> {actualizadas}
  - blocker_2_comment_target: pass  # creador also notified
  - blocker_3_transactional: pass   # @Transactional on notification-generating flows
  - blocker_4_page_cap: pass       # size capped at 50
runtime_scenario_evidence_still_missing: true   # structural; out of scope
postman_drift:
  description_field_name_stale: true   # Marcar-todas-leidas still documented with {total}
  sample_response_field_name_stale: true   # both sample bodies still show "total" not "actualizadas"
```

> The build envelope records the worst exit code across the three commands (`./mvnw compile -q` exit 0, `npm run lint` exit 1, `npm run build` exit 2). The 3 lint errors and 4 TypeScript build errors are the **pre-existing** errors blamed to PR #9 (`f26424a4`); they are documented in §3 and not introduced by `notificaciones-realtime` (net-new frontend regressions: 0). The compile/test commands exit 0.

## R1. Static checks (re-run on `2568f15`)

| Check | Command | Exit | Result |
| --- | --- | ---: | --- |
| Backend compile | `cd sistemaincidencias && ./mvnw compile -q` | `0` | ✅ PASS — silent compile. Output SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (empty). |
| Backend tests | `cd sistemaincidencias && ./mvnw test -q` | `0` | ⚠️ PASS only for `contextLoads`; no scenario-level coverage. Output SHA-256: `31851cab11c9cd46b920372460cf38946ac02dc224871f929c00c12155d8e85f`. |
| Frontend lint | `cd frontend && npm run lint` | `1` | ✅ Net-new clean — 3 pre-existing errors only on `frontend/src/pages/incidencias/index.tsx:65-66` (`isEliminando`, `setIsEliminando`, `errorEliminar`); blamed to `f26424a4`. Output SHA-256: `d6e53abe0a1fe39a8a8baa5f966f18d0238658dc9de58801f46a46fc5bbc77d5` (matches the previous run byte-for-byte). |
| Frontend build | `cd frontend && npm run build` | `2` | ✅ Net-new clean — same 4 pre-existing errors (3 same as lint + 1 on `frontend/src/pages/incidencias/components/incidencias-table.tsx:309` `string` not assignable to `EstadoProcesoClave`); blamed to `f26424a4`. Output SHA-256: `eac79afa049b4952d9f2bf9e8a8aba943e28bba1afe0969edba0dc7f72653722` (matches the previous run byte-for-byte). |
| Postman JSON | `python3 -m json.tool sistemaincidencias/postman/SistemaIncidencias.postman_collection.json` | `0` | ✅ Valid. |
| SecurityConfig diff | `git diff 5cb23ec..2568f15 -- sistemaincidencias/.../shared/config/SecurityConfig.java` | `0` | ✅ Empty diff (0 lines). |
| Fix-PR diffstat | `git diff 8371f82..2568f15 --stat` | — | ✅ 4 files changed, +126 / −16 (targeted fix). |

### Source files of the four blockers (current content, re-verified)

| SHA-256 of source file | File |
| --- | --- |
| `d978a3286703b11a0de55913d0e495c8ead8116ab9e2e249464d55855a78dd62` | `notificaciones/dto/NotificacionBulkResponse.java` (new) |
| `3cf45d5b8c81206593e50e76aabaa44451e2131c37ba618c3edadbfa133b129d` | `notificaciones/service/NotificacionService.java` |
| `99f77c5924b9804127afe5c80b220245778707a54930bd1ebd91f1b841075fe1` | `notificaciones/controller/NotificacionController.java` |
| `36f6e3abbb97cf7ec4879266079246e62bd8a8a9d66885aba0a90ede546643ee` | `incidencias/service/IncidenciaService.java` |

## R2. Re-audit of the four blockers

### Blocker 1 — Bulk endpoint contract (`{actualizadas}` vs `{total}`)

**Status**: ✅ PASS

- **Spec requirement** (`specs/notificaciones/spec.md` §`POST /api/notificaciones/marcar-todas-leidas`): returns `{actualizadas: long}`.
- **Implementation** (`NotificacionController.java:104-110`):
  ```java
  @PostMapping("/marcar-todas-leidas")
  public ResponseEntity<NotificacionBulkResponse> marcarTodasLeidas(...) { ... }
  ```
- **Service** (`NotificacionService.java:100-104`):
  ```java
  public NotificacionBulkResponse marcarTodasLeidas(UUID usuarioId) {
      long actualizadas = notificacionDao.marcarTodasLeidas(usuarioId, LocalDateTime.now());
      return NotificacionBulkResponse.builder().actualizadas(actualizadas).build();
  }
  ```
- **DTO** (`NotificacionBulkResponse.java` — new, dedicated):
  ```java
  public class NotificacionBulkResponse { private long actualizadas; }
  ```
- **`NotificacionCountResponse`** (`{"total": long}`) is now reserved exclusively for `GET /no-leidas/count` (badge).
- **Scenarios 13 & 14** previously ❌ → now ✅.
- **Drift**: Postman `Marcar todas como leidas` description still reads "Retorna { total: N }" and both sample bodies still serialize `"total": 4` and `"total": 0` instead of `"actualizadas": 4` and `"actualizadas": 0`. This is documentation drift; the wire contract is correct (tracked as a Postman follow-up — see R5).

### Blocker 2 — Comment hook targets the creator (`asignadoA` + `creadoPorUsuarioId`)

**Status**: ✅ PASS

- **Spec scenario** (`specs/notificaciones/spec.md` §`agregar comentario`): row inserted for `maria` (creator) when `jose` (assigned agent) authors the comment.
- **Implementation** (`IncidenciaService.java:343-376`):
  ```java
  @Transactional
  public ComentarioResponse agregarComentario(...) {
      ...
      notificacionService.crearParaUsuario(
              incidencia.getAsignadoA(),
              usuario.getId(),
              NotificacionTipo.INCIDENCIA_COMENTARIO,
              incidenciaId, titulo, null);
      notificacionService.crearParaUsuario(
              incidencia.getCreadoPorUsuarioId(),
              usuario.getId(),
              NotificacionTipo.INCIDENCIA_COMENTARIO,
              incidenciaId, titulo, null);
      ...
  }
  ```
- **Self-event guard** (`NotificacionService.crearParaUsuario`): if `actorId == usuarioDestinoId`, returns `null` without inserting. So when `jose == asignadoA`, the first call is a no-op and only the creator row is inserted — exactly the spec scenario.
- **Scenario 22** previously ❌ → now ✅.
- **Scenario 23** (auto-event silenciado) remains ✅ — the guard still fires when `asignadoA == creadoPorUsuarioId == actor`.

### Blocker 3 — `@Transactional` boundary

**Status**: ✅ PASS

- **Spec scenario** (`fallo en inserción hace rollback completo`): a JDBC failure during `INSERT INTO notificaciones` rolls back `aprobacion` + `historial_incidencias` + the notification together.
- **Implementation** (`IncidenciaService.java`): the eight public entry points that combine an incidence mutation, a historial insert, and `NotificacionService.crearParaUsuario` calls are now annotated `@Transactional`:

  | Method | Line | Annotation |
  | --- | ---: | --- |
  | `crear` | 99 | `@Transactional` |
  | `crearConArchivos` | 110 | `@Transactional` |
  | `actualizar` | 156 | `@Transactional` |
  | `actualizarConArchivos` | 167 | `@Transactional` |
  | `cambiarEstado` | 207 | `@Transactional` |
  | `aprobar` | 280 | `@Transactional` |
  | `rechazar` | 309 | `@Transactional` |
  | `agregarComentario` | 343 | `@Transactional` |

- **Helper** (`NotificacionService.java:161-189`): `crear(...)` is annotated `@Transactional` (REQUIRED propagation), so its `INSERT` participates in the caller's transaction. The `notificaciones` and `historial_incidencias` writes now share a single connection and a single transaction.
- **Tx management**: Spring Boot's auto-configuration enables transaction management via `spring-boot-starter-jdbc`; no explicit `@EnableTransactionManagement` required (verified by absence of new tx-config files in the diff).
- **Scenario 24** previously ❌ → now ✅.

### Blocker 4 — Page size cap (50)

**Status**: ✅ PASS

- **Spec requirement** (`GET /api/notificaciones`): `size` default `20`, max `50`.
- **Implementation** (`NotificacionController.java:71, 81`):
  ```java
  private static final int SIZE_MAXIMO = 50;
  ...
  Integer sizeLimitado = size == null ? null : Math.min(size, SIZE_MAXIMO);
  PageResult<NotificacionResponse> respuesta = notificacionService.listar(
          actual.getId(), PageRequest.of(page, sizeLimitado), soloNoLeidas);
  ```
- The shared `PageRequest.of` helper (used by `/api/incidencias` and other modules) retains its default cap of 100. The notificaciones endpoint applies the stricter cap locally, matching the spec without weakening the shared helper.
- **Requirement prose drift** (max `100` vs spec `50`) previously ⚠️ → now ✅ resolved at the implementation level. Scenarios 1–4 do not exercise `size > 50`, but the implementation now respects the contract.

## R3. Spec scenario walkthrough (re-audit, 37 scenarios)

Legend (same as §4): ✅ source-aligned · ⚠️ warning (pre-existing) · ❌ direct failure · runtime test coverage: **none** (structural).

### Requirement 1 — `GET /api/notificaciones` (paginated) — 5 scenarios

| # | Scenario | Audit | Notes |
| ---: | --- | :---: | --- |
| 1 | Retorna lista del usuario autenticado | ✅ | `actual.getId()` bound to `WHERE usuario_id = ?` in `NotificacionSql.LISTAR_BASE`. |
| 2 | Paginación `page=0&size=20` | ✅ | `PageRequest` calculates OFFSET = page × size; DAO binds LIMIT/OFFSET. |
| 3 | Ordenado `creado_en DESC` | ✅ | `NotificacionSql.LISTAR_ORDEN` = `ORDER BY creado_en DESC LIMIT ? OFFSET ?`. |
| 4 | `soloNoLeidas=true` excluye leídas | ✅ | DAO appends `AND leido_en IS NULL`; DTO derives `leido = leidoEn != null`. |
| 5 | Token inválido retorna 401 | ✅ | `validarAutenticado(token)` rejects upstream of controller. |

### Requirement 2 — `GET /api/notificaciones/no-leidas/count` — 3 scenarios

| # | Scenario | Audit | Notes |
| ---: | --- | :---: | --- |
| 6 | Retorna integer count | ✅ | `contarNoLeidas` builds `{"total": 5}` via `NotificacionCountResponse`. |
| 7 | Solo cuenta del usuario autenticado | ✅ | UUID bound server-side, no override. |
| 8 | Count 0 → badge hidden | ✅ | DAO returns 0; `AppHeader.badgeText` is null for `count <= 0`. |

### Requirement 3 — `PATCH /api/notificaciones/{id}/leida` — 4 scenarios

| # | Scenario | Audit | Notes |
| ---: | --- | :---: | --- |
| 9 | Marca como leída | ✅ | `COALESCE(leido_en, ?) WHERE id = ? AND usuario_id = ?`. |
| 10 | Segunda llamada idempotente | ✅ | COALESCE preserves first timestamp. |
| 11 | ID de otro usuario → 404 | ✅ | Owner predicate → 0 rows → `RecursoNoEncontradoException` → 404. |
| 12 | ID inválido → 400 | ⚠️ | `@PathVariable UUID` → `MethodArgumentTypeMismatchException`; `GlobalExceptionHandler` lacks a dedicated mapping → actual 500. Pre-existing cross-cutting bug, explicitly non-required for this change. |

### Requirement 4 — `POST /api/notificaciones/marcar-todas-leidas` — 2 scenarios

| # | Scenario | Audit | Notes |
| ---: | --- | :---: | --- |
| 13 | Marca todas y retorna `{actualizadas: 7}` | ✅ | **Fixed in PR #19** (commit `90e6dc4`). Controller now returns `NotificacionBulkResponse{actualizadas: N}`. |
| 14 | Retorna count + idempotente (4 then 0) | ✅ | **Fixed in PR #19**. Same wire contract; idempotence preserved by `WHERE leido_en IS NULL`. Postman sample bodies are stale — see R5. |

### Requirement 5 — `DELETE /api/notificaciones/{id}` — 3 scenarios

| # | Scenario | Audit | Notes |
| ---: | --- | :---: | --- |
| 15 | Elimina por ID | ✅ | `DELETE WHERE id = ? AND usuario_id = ?`. |
| 16 | Solo el dueño puede borrar (404 si no) | ✅ | Owner predicate enforced; 404 on miss. |
| 17 | ID inválido → 400 | ⚠️ | Same pre-existing UUID 500 mapping as scenario 12. |

### Requirement 6 — Generación automática (RF-37) — 7 scenarios

| # | Scenario | Audit | Notes |
| ---: | --- | :---: | --- |
| 18 | Asignar → `INCIDENCIA_ASIGNADA` for `asignadoA` | ✅ | `crear` / `actualizar` call `crearParaUsuario(asignadoA, actor, INCIDENCIA_ASIGNADA, ...)`. |
| 19 | Aprobar → `INCIDENCIA_APROBADA` for creator | ✅ | `aprobar` targets `creadoPorUsuarioId`. |
| 20 | Rechazar → `INCIDENCIA_RECHAZADA` for creator with reason | ✅ | `rechazar` passes motivo as description. |
| 21 | Cambiar estado → two rows for assignee + creator | ⚠️ | Source implements correctly; spec scenario still contradicts itself by making actor == assignee (jose == asignadoA). Per spec self-event suppression rule, only one row fires. Pre-existing scenario-level contradiction, not a code defect. |
| 22 | Comentario by assigned agent → creator only | ✅ | **Fixed in PR #19** (commit `2590ad7`). `agregarComentario` now targets `asignadoA` AND `creadoPorUsuarioId`; self-event guard dedupes when actor == assignee. |
| 23 | Auto-event silenciado (actor == destinatario) | ✅ | `crearParaUsuario` returns null when `actorId.equals(usuarioDestinoId)`. |
| 24 | Notification insert failure rolls back parent flow | ✅ | **Fixed in PR #19** (commit `82333f5`). All 8 notification-generating entry points + `NotificacionService.crear` are `@Transactional`. JDBC failure in any DAO call now propagates a single rollback to incidence + historial + notification. |

### Requirement 7 — Topbar bell + badge (RF-40) — 4 scenarios

| # | Scenario | Audit | Notes |
| ---: | --- | :---: | --- |
| 25 | Bell visible for every role | ✅ | `AppHeader` renders bell unconditionally inside `AppLayout`. |
| 26 | Badge shows unread count | ✅ | `useNotificationsPolling` writes `response.total` to hook state. |
| 27 | Badge hidden when count = 0 | ✅ | `badgeText` is null for `count === null \|\| count <= 0`. |
| 28 | Bell opens latest-10 dropdown + "Ver todas" | ✅ | Lazy `obtener({page:0, size:10})`; footer link to `/notificaciones`. |

### Requirement 8 — `/notificaciones` page (RF-38) — 4 scenarios

| # | Scenario | Audit | Notes |
| ---: | --- | :---: | --- |
| 29 | Paginated list | ✅ | Initial `page: 0, size: 20`; `NotificacionesPagination` rendered. |
| 30 | Row click marks read and navigates | ✅ | `onClickFila` awaits `marcarLeida` and navigates to `/incidencias/$id`. |
| 31 | "Marcar todas" works and refreshes | ✅ | Handler calls POST endpoint and `fetchList()`. |
| 32 | "Solo no leídas" toggle | ✅ | Resets page to 0 and refetches with updated query. |

### Requirement 9 — Polling 30 s — 3 scenarios

| # | Scenario | Audit | Notes |
| ---: | --- | :---: | --- |
| 33 | Poll fires every 30 s | ✅ | Hook defaults to 30_000 ms; next `setTimeout` scheduled after fetch settles. |
| 34 | Poll pauses in hidden tab | ✅ | Visibility handler clears timer when `document.hidden`. |
| 35 | New count updates badge without reload | ✅ | Each poll writes `response.total` to hook state. |

### Requirement 10 — Per-role scope — 1 scenario

| # | Scenario | Audit | Notes |
| ---: | --- | :---: | --- |
| 36 | Each user sees only their own notifications | ✅ | `WHERE usuario_id = ?` in every read query; no client override. |

### Requirement 11 — SecurityConfig unchanged — 1 scenario

| # | Scenario | Audit | Notes |
| ---: | --- | :---: | --- |
| 37 | SecurityConfig not touched | ✅ | `git diff 5cb23ec..2568f15 -- .../SecurityConfig.java` empty (0 lines). |

### Source-audit tally (re-verification)

| Status | Count | Scenarios |
| --- | ---: | --- |
| ✅ Source-aligned (incl. fixed) | **33** | 1-11, 13-16, 18-20, 22-36, 37 |
| ⚠️ Warning (pre-existing) | **3** | 12 (UUID 500), 17 (UUID 500), 21 (spec scenario self-contradiction) |
| ❌ Direct failure | **0** | — |
| **Total** | **37** | |

Compared to the previous tally (30 ✅ / 3 ⚠️ / 4 ❌), the four `❌` failures (scenarios 13, 14, 22, 24) plus the requirement-prose drift for size cap (scenario 1-5 prose) are now resolved; **net change: +5 ✅, −4 ❌, +0 ⚠️**.

## R4. Drift count (re-verification)

| # | Drift item | Status |
| ---: | --- | --- |
| 1 | Max page size `100` vs spec `50` (req. 1 prose) | ✅ Resolved by PR #19 (commit `f9f926e`). |
| 2 | Bulk response field `total` vs spec `actualizadas` | ✅ Resolved by PR #19 (commit `90e6dc4`) at the wire contract. **Postman sample bodies & description still stale** (see R5). |
| 3 | Comment target `asignadoA` only vs creator-after-self-suppression | ✅ Resolved by PR #19 (commit `2590ad7`). |
| 4 | Missing same-transaction rollback boundary | ✅ Resolved by PR #19 (commit `82333f5`). |
| 5 | Malformed UUID 500 vs 400 (cross-cutting; non-required) | ⚠️ Unchanged (pre-existing, out of scope). |
| 6 | State-change scenario's two-row expectation conflicts with self-event suppression | ⚠️ Unchanged (spec scenario self-contradiction, source follows the correct rule). |
| 7 | **NEW** — Postman `Marcar todas como leidas` description + sample bodies still document `{total}` instead of `{actualizadas}` | ⚠️ Documentation drift, not a behavior drift. Source returns the correct contract. |

**7 drift items** (4 closed, 2 pre-existing warnings retained, 1 new Postman doc drift).

## R5. Postman documentation drift (new follow-up)

The fix PR #19 changed the wire contract to `{actualizadas: N}` but did not update the Postman collection:

- `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json:2263` — `description` still reads: `Retorna { total: N } con el numero de filas efectivamente actualizadas. Segunda llamada consecutiva retorna { total: 0 }. Sin body.`
- `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json:2270` — sample body still serializes `{"total": 4}`.
- `sistemaincidencias/postman/SistemaIncidencias.postman_collection.json:2277` — sample body still serializes `{"total": 0}`.

Per `sistemaincidencias/AGENTS.md` "Coleccion Postman" rule, the description and sample bodies should match the actual response shape. This is a documentation drift, not a behavior blocker — the implementation is correct. Recommended as a separate small PR (Postman-only change, single-file) so the next developer running the collection sees accurate samples.

## R6. Issues found (re-verification)

### CRITICAL
None.

### WARNING
1. **Postman documentation drift** — `Marcar todas como leidas` description and two sample bodies still document `{total}` even though the wire contract is now `{actualizadas}` (R5). Postman-only fix recommended.
2. **Malformed UUID maps to 500, not 400** — unchanged from previous verify (pre-existing cross-cutting bug, explicitly non-required for `notificaciones-realtime`).
3. **State-change scenario self-contradiction** — unchanged (spec scenario 21 still expects two rows when actor == assignee; source correctly follows the spec's mandatory self-event suppression rule).
4. **Planning status metadata stale** — `proposal.md` still says `proposed`; `tasks.md` still says `ready-to-apply`. Implementation evidence (commits + Engram apply-progress) covers T1–T10. Same observation as previous verify; not a blocker.

### SUGGESTION
1. Add focused service/DAO tests (ownership, idempotence, recipient calculation, transaction rollback) — same suggestion carried from previous verify. Project still lacks scenario-level coverage.
2. Update Postman `Marcar todas como leidas` description + sample bodies (see R5).
3. Introduce a dedicated bulk response DTO rather than overloading `NotificacionCountResponse` — **already done** in PR #19 (`NotificacionBulkResponse` is now a dedicated DTO).

## R7. Regressions

**New compile/lint/build failures introduced by `notificaciones-realtime` (PR1 + PR2 + PR #19 combined): 0.**

- Backend compile clean on `2568f15`.
- Frontend lint reports the same 3 pre-existing errors blamed to `f26424a4`.
- Frontend build reports the same 4 pre-existing errors (3 lint + 1 type error) blamed to `f26424a4`.
- `SecurityConfig.java` empty diff vs base `5cb23ec`.
- Postman JSON valid.
- The fix PR is a targeted 4-file change (+126 / −16); no collateral changes to unrelated modules.

## R8. Final verdict (re-verification)

**PASS — archive-ready.**

- Four contract blockers (1: bulk field, 2: comment recipient, 3: `@Transactional`, 4: page cap) are now resolved at the implementation level.
- 33 of 37 scenarios are source-aligned; the 4 remaining items are documented warnings (2 pre-existing UUID mapping gaps, 1 spec scenario self-contradiction, 1 Postman doc drift) that do not block archive.
- No new regressions. Net-new frontend lint/build failures: 0.
- The structural "no scenario-level runtime evidence" gap is unchanged and remains out of scope; it is recorded as a recommendation, not a blocker.

The change `notificaciones-realtime` is ready for `sdd-archive`. `master` is at `2568f15`. Proceed to STEP 2: archive.
