---
name: gestincidencias-frontend
description: Use when creating or modifying GestIncidencias frontend pages, page-local components, shared components, layouts, routes, stores, or API services.
---

# GestIncidencias Frontend

## Overview

Use this skill for work inside `frontend/`. The project is a Vite React TypeScript app using TanStack Router, Zustand, Tailwind CSS v4, shadcn/ui, lucide-react, and Recharts.

## Required Context

Before adding or changing API services, requests, auth flows, or endpoint contracts, inspect:

`../sistemaincidencias/postman/SistemaIncidencias.postman_collection.json`

Use it as the source for paths, HTTP methods, request bodies, auth headers, and response assumptions. Do not invent endpoint names when Postman already defines them.

## Structure Rules

Keep `src/components/` for shared system components only:

- `src/components/ui/*`: shadcn-generated primitives.
- `src/components/brand/*`: brand-level reusable pieces.
- `src/components/auth/private-route.tsx`: route/auth guard shared by private views.

Every page must live in a folder:

```text
src/pages/<view-name>/
  index.tsx
  components/
    view-only-component.tsx
  data.ts          # optional, only for page-local mock/static data
  types.ts         # optional, only for page-local types
```

Do not put page-only components in `src/components/`. If a component is only used by Dashboard, it belongs in `src/pages/dashboard/components/`.

## Page Workflow

When creating or modifying a page:

1. Put the page composition in `src/pages/<view>/index.tsx`.
2. Extract non-trivial JSX into `src/pages/<view>/components/`.
3. Keep `index.tsx` small: route-level composition, data/store hooks, and major sections only.
4. Add the route in `src/router.tsx`; private pages must render inside `AppLayout`.
5. For private pages, rely on `AppLayout` + `PrivateRoute`; do not duplicate auth redirects inside page components.

## Component Workflow

Before writing custom UI, prefer existing shadcn components. If a new shadcn primitive is needed, use the shadcn skill/CLI and add components one by one:

```bash
npx shadcn@latest docs <component>
npx shadcn@latest add <component>
```

Use lucide icons for actions/navigation. Keep feature-specific variants, badges, cards, chart wrappers, and tables local to their page unless they are reused across multiple views.

## Services Workflow

When adding a service:

1. Read the matching Postman request.
2. Add/update types in `src/types/` only if shared across pages/services.
3. Use `src/lib/http.ts` and `VITE_API_URL`.
4. Put endpoint wrappers in `src/services/*-service.ts`.
5. Keep Zustand stores in `src/store/` for global state only.

## Verification

After changes, run from `frontend/`:

```bash
npm run lint
npm run build
```

For visual/layout work, verify in the in-app browser at `http://127.0.0.1:5173/`. Private layout expectations: sidebar and header are fixed; only the main content area scrolls.
