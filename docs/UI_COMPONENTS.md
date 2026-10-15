# Componentes compartidos del dashboard

Antes de crear un componente, revisar `components/ui` y `components/shared`.

## Capas

- `lib/ui`: tokens visuales sin dependencias de React ni de módulos de negocio.
- `components/ui`: primitivas con atributos HTML, referencias y estilos base
  comunes.
- `components/shared`: composiciones reutilizables entre módulos.
- `components/<modulo>`: datos, permisos, validaciones y composición propios del
  módulo.
- `app`: rutas y composición de pantallas con esos componentes.

Los controles HTML (`input`, `select`, `textarea`, `button` y elementos de
tablas) se implementan únicamente dentro de `components/ui`. Las páginas y los
módulos usan los componentes exportados. Los elementos de estructura y contenido
como `div`, `section`, títulos y párrafos pueden usarse normalmente.

## Qué reutilizar

| Necesidad                                     | Componente                                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| Campos de texto, números, fechas y archivos   | `Input`                                                                      |
| Casillas HTML con eventos nativos             | `Input type="checkbox"`                                                      |
| Texto de varias líneas                        | `Textarea`                                                                   |
| Selector con opciones HTML y eventos nativos  | `NativeSelect`                                                               |
| Opciones de filtro o listas fijas             | `OptionSelect` / `FilterSelect`                                              |
| Tiempo y estado de asistencia                 | `TimeSelect` / `AttendanceStatusSelect`, adaptadores de `OptionSelect`       |
| Selección de entidades con reglas propias     | Los adaptadores de `shared/selects`                                          |
| Acciones comunes                              | `Button` y sus variantes                                                     |
| Control especializado con presentación propia | `Button variant="unstyled"`, conservando foco y estado deshabilitado comunes |
| Tabla de datos                                | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`    |
| Contenedor de tabla de módulo                 | `ModuleTableCard`                                                            |
| Ordenar columnas                              | `SortableTh`                                                                 |
| Pestañas de estado con contadores             | `StatusTabs`                                                                 |
| Periodos, rango de fechas y exportación       | `ReportToolbar`                                                              |
| Indicadores de resumen con icono y color      | `MetricCard`                                                                 |
| Confirmación de borrado o desactivación       | `DeleteConfirmModal`                                                         |
| Búsqueda y paginación                         | `SearchInput` / `Paginate`                                                   |

`ModuleTable*`, `CUENTA_TABLE_*` y `ORDER_FIELD_*` conservan compatibilidad con
sus consumidores; son alias de la implementación o los tokens comunes. No
representan diseños independientes. Los nuevos componentes compartidos no deben
importar estilos desde un módulo de negocio.

## Diseño y comportamiento

Los campos de una línea y selectores usan `rounded-full`. Los campos multilínea
usan `rounded-3xl`; archivos, casillas, colores y rangos conservan sus controles
nativos. Las tablas comparten espaciado, cabeceras y estados de fila.
`className` permite ajustes de contexto (ancho, alineación, columnas) sin crear
otra implementación del mismo control.

Extraer una composición cuando se repita su estructura y comportamiento.
Mantener las reglas de negocio en adaptadores de módulo: dos tablas pueden tener
columnas diferentes y seguir usando la misma base visual. No reemplazar una
composición por otra solo porque sus nombres sean parecidos.

## Verificación

`pnpm check:ui-components` detecta controles HTML directos fuera de la capa de
primitivas. También forma parte de `pnpm lint` y existe una regla equivalente en
ESLint. Después de modificar componentes compartidos, ejecutar TypeScript y las
pruebas de los módulos consumidores.

### Filtros alineados y orden

Usar FilterBar para mantener los filtros en una sola fila, con desplazamiento
horizontal en pantallas estrechas. SortSelect agrupa el selector del campo y el
botón que alterna ascendente/descendente. Ambos cambios conservan la otra parte
del orden y los consumidores reinician la paginación.

Table aplica el contenedor con borde y esquinas redondeadas desde
TABLE_CONTAINER_CLASS; no es necesario repetir ese estilo en cada página.

Todos los filtros de ordenación usan SortSelect: campo y dirección comparten
fondo, borde y contorno redondeado. La comprobación check:ui-components rechaza
selectores independientes vinculados a sortBy, sortOrder, sortField o
sortDirection. Los encabezados de tabla conservan su interacción de ordenación
propia.
