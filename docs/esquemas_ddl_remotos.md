# ARCHIVO DE CONTROL: ESQUEMAS SQL RELACIONALES (BASE DE DATOS REMOTA)

## 🗄️ 1. Estructura de Tablas para Catálogos Base
```sql
CREATE TABLE IF NOT EXISTS estados_aprobacion (
    id uuid PRIMARY KEY,
    clave varchar(50) NOT NULL UNIQUE,
    etiqueta varchar(100) NOT NULL,
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS estados_proceso (
    id uuid PRIMARY KEY,
    clave varchar(50) NOT NULL UNIQUE,
    etiqueta varchar(100) NOT NULL,
    es_terminal boolean NOT NULL DEFAULT false,
    orden integer NOT NULL,
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS clientes (
    id uuid PRIMARY KEY,
    nombre varchar(150) NOT NULL,
    api_key varchar(255),
    activo boolean NOT NULL DEFAULT true,
    creado_en timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorias (
    id uuid PRIMARY KEY,
    cliente_id uuid NOT NULL REFERENCES clientes(id),
    nombre varchar(150) NOT NULL,
    descripcion varchar(255),
    activo boolean NOT NULL DEFAULT true,
    creado_en timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);