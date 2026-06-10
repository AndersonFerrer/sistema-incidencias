# Sistema de Incidencias — Frontend

Frontend en **React + Vite** para consumir el backend Spring Boot.

## Requisitos
- Node.js 18+
- Backend corriendo en `http://localhost:8080`

## Instalación

```bash
npm install
npm run dev
```

Abre http://localhost:5173

## Estructura

```
src/
├── components/
│   └── Sidebar.jsx        # Navegación lateral
├── pages/
│   ├── Dashboard.jsx      # Estadísticas generales
│   ├── Incidencias.jsx    # CRUD de incidencias
│   ├── Usuarios.jsx       # CRUD de usuarios
│   ├── Categorias.jsx     # CRUD de categorías
│   └── Reportes.jsx       # Gráficos y reportes
├── services/
│   └── api.js             # Llamadas al backend (axios)
├── App.jsx
├── main.jsx
└── index.css
```

## Endpoints consumidos

| Módulo       | Endpoints                              |
|-------------|----------------------------------------|
| Incidencias  | GET/POST/PUT/DELETE `/incidencias`     |
| Usuarios     | GET/POST/PUT/DELETE `/usuarios`        |
| Categorías   | GET/POST/PUT/DELETE `/categorias`      |

## Ajustar endpoints

Si tus rutas del backend son diferentes (ej: `/api/incidencias`), edita `src/services/api.js` y ajusta el `baseURL` o las rutas individuales.

El proxy de Vite redirige `/api/*` → `http://localhost:8080/*` automáticamente.
