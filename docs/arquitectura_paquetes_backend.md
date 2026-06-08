# ARCHIVO DE CONTROL: MAPA DE PAQUETES Y CLASES REQUERIDAS

## 📦 1. Módulo de Catálogos Base (Estructura Funcional)
* **Paquete:** `com.integrador.sistemaincidencias.catalogos`
  * **controller/**: EstadoProcesoController.java, EstadoAprobacionController.java, CategoriaController.java, AplicativoClienteController.java
  * **service/**: EstadoProcesoService.java, EstadoAprobacionService.java, CategoriaService.java, AplicativoClienteService.java
  * **dao/**: EstadoProcesoDao.java, EstadoAprobacionDao.java, CategoriaDao.java, AplicativoClienteDao.java
  * **mapper/**: EstadoProcesoMapper.java, EstadoAprobacionMapper.java, CategoriaMapper.java, AplicativoClienteMapper.java
  * **model/**: EstadoProceso.java, EstadoAprobacion.java, Categoria.java, AplicativoCliente.java, UsuarioExterno.java
  * **sql/**: EstadoProcesoSql.java, EstadoAprobacionSql.java, CategoriaSql.java, AplicativoClienteSql.java
  * **dto/**: EstadoProcesoRequest.java, EstadoProcesoResponse.java, EstadoAprobacionRequest.java, EstadoAprobacionResponse.java, CategoriaRequest.java, CategoriaResponse.java, AplicativoClienteRequest.java, AplicativoClienteResponse.java

## 📦 2. Módulo de Incidencias Core (Estructura de Negocio)
* **Paquete:** `com.integrador.sistemaincidencias.incidencias`
  * **controller/**: IncidenciaController.java, ComentarioController.java, AdjuntoController.java
  * **service/**: IncidenciaService.java, ComentarioService.java, AdjuntoService.java, HistorialService.java
  * **dao/**: IncidenciaDao.java, ComentarioDao.java, AdjuntoDao.java, HistorialIncidenciaDao.java