# AGENTS.md - Frontend

Estas reglas aplican a todo trabajo dentro de `frontend/`.

## Skill Obligatoria

Antes de crear o modificar vistas, componentes, layouts, rutas, stores o servicios del frontend, usar la skill:

`../.agents/skills/gestincidencias-frontend/SKILL.md`

Si se trabaja con shadcn/ui, usar tambien:

`../.agents/skills/shadcn/SKILL.md`

## Stack

- Vite + React + TypeScript.
- TanStack Router para rutas.
- Zustand para estado global.
- Tailwind CSS v4.
- shadcn/ui para componentes base.
- lucide-react para iconos.
- Recharts para graficos del dashboard.

## Estructura

`src/components/` es solo para componentes compartidos del sistema:

- `src/components/ui/*`: componentes generados por shadcn.
- `src/components/brand/*`: piezas reutilizables de marca.
- `src/components/auth/private-route.tsx`: guard compartido.

Cada vista debe vivir en su propia carpeta:

```text
src/pages/<vista>/
  index.tsx
  components/
  data.ts
  types.ts
```

Los componentes que pertenecen solo a una vista deben ir dentro de `src/pages/<vista>/components/`, no en `src/components/`.

## Backend y Servicios

Antes de crear o modificar servicios, revisar siempre:

`../sistemaincidencias/postman/SistemaIncidencias.postman_collection.json`

Usar ese Postman para confirmar metodo HTTP, ruta, body, headers, token Bearer y forma esperada de respuesta.

Los servicios deben usar:

- `src/lib/http.ts` para requests.
- `src/lib/env.ts` y `VITE_API_URL` para la URL base.
- `src/services/*-service.ts` para wrappers de endpoints.
- `src/types/` solo para tipos compartidos.

## Rutas Privadas

Las vistas privadas deben renderizarse dentro de `AppLayout`, que ya aplica `PrivateRoute`.

No duplicar redirecciones de autenticacion dentro de cada page.

El layout privado debe conservar:

- Sidebar fixed.
- Header fixed.
- Scroll solo en el area `main`.

## Verificacion

Antes de terminar cambios en frontend, ejecutar:

```bash
npm run lint
npm run build
```

Para cambios visuales, verificar en el navegador local:

`http://127.0.0.1:5173/`
