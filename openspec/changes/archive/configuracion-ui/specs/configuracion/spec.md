# Configuration Specification

## Purpose

Define RF-02 demo access and RF-49/RF-50 administrator catalog management.

## Requirements

### Requirement: Credential-free demo access

The system MUST authenticate a seeded demo user without typed credentials and MUST preserve normal login.

#### Scenario: Start demo session
- GIVEN the login page
- WHEN “Acceso demo” is selected
- THEN demo authentication runs without form credentials

#### Scenario: Complete demo login
- GIVEN `demo@sistema.com` is active
- WHEN authentication succeeds
- THEN JWT session is stored and `/dashboard` opens

#### Scenario: Demo account unavailable
- GIVEN the demo user is absent or inactive
- WHEN demo access is requested
- THEN an error appears and no session is stored

### Requirement: Administrator-only catalog soft delete

The API MUST expose all four DELETE routes, require `ADMINISTRADOR`, and set `activo=false`.

#### Scenario: Delete category
- GIVEN an active category and admin token
- WHEN `DELETE /api/categorias/{id}` runs
- THEN it returns 204 and deactivates the row

#### Scenario: Delete application
- GIVEN an active application and admin token
- WHEN `DELETE /api/aplicativos/{id}` runs
- THEN it returns 204 and deactivates the row

#### Scenario: Delete process state
- GIVEN an active process state and admin token
- WHEN `DELETE /api/estados-proceso/{id}` runs
- THEN it returns 204 and deactivates the row

#### Scenario: Delete approval state
- GIVEN an active approval state and admin token
- WHEN `DELETE /api/estados-aprobacion/{id}` runs
- THEN it returns 204 and deactivates the row

#### Scenario: Reject non-admin delete
- GIVEN an authenticated AGENTE or USUARIO
- WHEN any catalog DELETE runs
- THEN it returns 403 and changes nothing

### Requirement: Active-only catalog lists

Catalog list endpoints MUST omit rows with `activo=false`.

#### Scenario: Hide inactive rows
- GIVEN active and inactive rows in each catalog
- WHEN the four lists are requested
- THEN only active rows are returned

#### Scenario: Preserve foreign-key references
- GIVEN an incident references a catalog row
- WHEN that row is soft-deleted
- THEN the incident reference remains valid

### Requirement: Administrator-only configuration page

The frontend MUST expose `/configuracion` to authenticated administrators only.

#### Scenario: Administrator opens configuration
- GIVEN an authenticated ADMINISTRADOR
- WHEN `/configuracion` is opened
- THEN the page renders

#### Scenario: Non-admin opens configuration
- GIVEN an authenticated non-admin
- WHEN `/configuracion` is opened
- THEN an access-restricted state renders

### Requirement: Four-tab catalog management

The page MUST provide four named tabs with list, create, edit, loading, error, and empty states.

#### Scenario: Select catalog tab
- GIVEN an authorized configuration page
- WHEN a catalog tab is selected
- THEN the four tabs are available and active entries/actions render

#### Scenario: Create entry
- GIVEN valid catalog input
- WHEN the admin creates an entry
- THEN the tab refreshes and shows it

#### Scenario: Edit entry
- GIVEN an existing entry
- WHEN valid changes are saved
- THEN the tab refreshes with updated data

#### Scenario: Surface operation failure
- GIVEN a catalog request fails
- WHEN the operation completes
- THEN an actionable error is shown

### Requirement: Explicit delete confirmation

The frontend MUST require exact text `ELIMINAR` before catalog DELETE.

#### Scenario: Open confirmation
- GIVEN an entry selected for deletion
- WHEN delete is chosen
- THEN a modal identifies it and requests `ELIMINAR`

#### Scenario: Reject incorrect text
- GIVEN confirmation differs from `ELIMINAR`
- WHEN the modal is open
- THEN the destructive action is disabled

#### Scenario: Confirm deletion
- GIVEN confirmation equals `ELIMINAR`
- WHEN the admin confirms
- THEN one DELETE runs and the tab refreshes

#### Scenario: Cancel deletion
- GIVEN the confirmation modal is open
- WHEN the admin cancels
- THEN no DELETE request is sent
