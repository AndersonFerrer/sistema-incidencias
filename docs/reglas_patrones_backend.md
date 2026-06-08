# ARCHIVO DE CONTROL: REGLAS DE ARQUITECTURA Y DISEÑO EN CAPAS

## ⚠️ Patrones Obligatorios para Nuevas Entidades
1. **Modelos de Datos:** Usar objetos POJO puros anotados exclusivamente con Lombok (`@Getter`, `@Setter`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`).
2. **Consultas SQL Estáticas:** Implementar clases de soporte SQL finales con constructores privados, gestionando las sentencias mediante bloques de texto nativos (`"""`).
3. **Mapeadores JDBC:** Utilizar componentes `@Component` para procesar los conjuntos de resultados de la base de datos (`ResultSet`), extrayendo los identificadores mediante `.getObject("id", UUID.class)`.
4. **Persistencia de Datos (DAO):** Aplicar inyección de dependencias por constructor mediante `@RequiredArgsConstructor`. Utilizar sentencias preparadas (`PreparedStatement`) con gestión automática de recursos (Try-with-resources).
5. **Control de Excepciones:** Queda prohibido el uso de excepciones genéricas. Toda falla en la capa de datos debe ser encapsulada en la excepción de negocio personalizada.