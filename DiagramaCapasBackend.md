# Diagrama interno resumido del backend

Este diagrama muestra la estructura interna del backend en una vista compacta para exposición. No lista todas las clases una por una; agrupa las piezas por capa para que pueda entrar completa en una diapositiva.

## Diagrama PlantUML

```plantuml
@startuml
skinparam packageStyle rectangle
skinparam classAttributeIconSize 0
skinparam shadowing false
skinparam linetype ortho
left to right direction

package "Entrada HTTP" {
  class Controllers <<controller>> {
    AuthController
    UsuarioController / RolController
    CatalogosControllers
    IncidenciaController
  }
}

package "Reglas de negocio" {
  class Services <<service>> {
    AuthService
    UsuarioService / RolService
    CatalogosServices
    IncidenciaService
  }

  class SharedServices <<shared>> {
    JwtService
    PermisoAdministracionService
    ArchivoStorageService
  }
}

package "Acceso a datos" {
  class DAOs <<dao>> {
    UsuarioDao / RolDao
    CatalogosDaos
    IncidenciaDao
    ComentarioDao / AdjuntoDao
    AprobacionDao / HistorialDao
  }

  class Mappers <<mapper>> {
    UsuarioMapper / RolMapper
    CatalogosMappers
    IncidenciaMapper
    ComentarioMapper / AdjuntoMapper
    DtoMappers
  }
}

package "Infraestructura" {
  database PostgreSQL
  folder FileStorage
  class JwtAuthenticationFilter <<filter>>
  class ArchivosConfig <<config>>
  class Exceptions <<exceptions>>
}

Controllers ..> Services : delega operaciones
Controllers ..> SharedServices : valida token/permisos
Services ..> DAOs : consulta y persiste
Services ..> SharedServices : reutiliza seguridad/archivos
DAOs o-- Mappers : transforma filas a objetos
DAOs --> PostgreSQL : JDBC/DataSource
SharedServices --> FileStorage : guarda adjuntos
JwtAuthenticationFilter --|> OncePerRequestFilter : herencia
ArchivosConfig ..|> WebMvcConfigurer : implementación
Exceptions --|> RuntimeException : herencia
@enduml
```

## Cómo leerlo

El diagrama se lee de izquierda a derecha:

1. **Entrada HTTP**: los controladores reciben las peticiones del frontend.
2. **Reglas de negocio**: los servicios ejecutan validaciones y coordinan el caso de uso.
3. **Acceso a datos**: los DAOs trabajan con JDBC y usan mappers para transformar resultados.
4. **Infraestructura**: PostgreSQL guarda datos, FileStorage guarda archivos físicos y las piezas de Spring/JWT dan soporte transversal.

## Relaciones UML usadas

| Relación | Significado en este proyecto | Ejemplo del diagrama |
|---|---|---|
| `..>` Dependencia | Una capa necesita usar otra, pero no es dueña de ella. | `Controllers ..> Services` |
| `-->` Asociación | Comunicación directa con un recurso o componente. | `DAOs --> PostgreSQL` |
| `o--` Agregación | Una clase usa/agrupa otra pieza auxiliar que puede existir como componente separado. | `DAOs o-- Mappers` |
| `--|>` Herencia | Una clase hereda comportamiento de otra. | `JwtAuthenticationFilter --|> OncePerRequestFilter` |
| `..|>` Implementación | Una clase implementa un contrato/interfaz. | `ArchivosConfig ..|> WebMvcConfigurer` |

## Texto sugerido para exposición

> En este diagrama estoy mostrando la estructura interna del backend de forma resumida. La idea no es listar todas las clases, sino explicar cómo fluye una petición dentro del sistema.

> Primero, la petición entra por un controlador. El controlador no debería contener toda la lógica; por eso delega hacia un servicio. El servicio representa las reglas de negocio y coordina qué validaciones o acciones se deben ejecutar.

> Cuando el servicio necesita datos, usa los DAOs. Los DAOs son la capa encargada de comunicarse con PostgreSQL mediante JDBC. Para no mezclar datos crudos de base de datos con objetos del sistema, los DAOs se apoyan en mappers.

> También hay servicios compartidos. `JwtService` ayuda con la autenticación por token, `PermisoAdministracionService` valida permisos administrativos y `ArchivoStorageService` maneja los archivos adjuntos físicamente.

> En cuanto a relaciones UML, la dependencia aparece entre capas porque una capa usa a la siguiente. La agregación aparece entre DAOs y mappers porque los DAOs se apoyan en mappers como piezas auxiliares. La herencia aparece en clases como el filtro JWT y las excepciones personalizadas. La implementación aparece en configuraciones que cumplen contratos de Spring, como `WebMvcConfigurer`.

## Puntos clave para recordar

- Controller recibe la petición.
- Service aplica reglas de negocio.
- DAO accede a PostgreSQL con JDBC.
- Mapper transforma datos entre base de datos, modelos y DTOs.
- SharedServices concentra seguridad, permisos y archivos.
- El diagrama está resumido para que sea visible en una sola diapositiva.
