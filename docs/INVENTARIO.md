# Inventario y bar

El menú incluye **Inventario** (`/inventory`) y **Bar** (`/bar`). Ambos utilizan las categorías existentes y los permisos de productos: lectura para consultar y escritura para registrar ingresos y traspasos.

## Operación

1. Registra un producto, su categoría y una o varias presentaciones. La presentación es libre: `500 ml`, `750 ml`, `1 litro`, etc. El código de barras del fabricante pertenece a la presentación y no se puede repetir en otra presentación.
2. Indica las botellas iniciales o utiliza **Ingresar** posteriormente. Diez botellas generan diez registros físicos y diez SKU diferentes, persistidos en PostgreSQL. No se reutilizan los números de la secuencia.
3. Abre **Etiquetas**, selecciona las unidades e imprime. Cada etiqueta contiene nombre, presentación, SKU legible y QR del SKU. Reimprimir no genera códigos nuevos. La distribución actual es para hojas A4; el navegador permite guardar PDF.
4. Usa **Traspasar** para elegir cantidad, precio y comisión por botella. Se seleccionan primero las unidades más antiguas del inventario. La operación es atómica y registra quién la realizó, fecha, cantidades, unidades, precio y comisión.
5. La presentación aparece en el catálogo usado por pedidos y ventas. Los siguientes traspasos actualizan su precio y comisión para nuevas ventas; los importes históricos no se modifican.
6. **Historial** muestra ingresos, traspasos y ventas de cada presentación.

Puedes agregar presentaciones a un producto después de crearlo. Para incorporar un producto del catálogo anterior, selecciona **Vincular la primera presentación a un producto existente** al registrar el producto. Debe pertenecer a la misma categoría: se conserva su identificador y su historial. El stock inicial siempre requiere conteo físico, no se deduce de las ventas anteriores.

## Descuento y conservación

- Esta versión controla botellas completas. El stock del bar se descuenta automáticamente al registrar la venta o cobrar una cuenta. Los pedidos y cuentas pendientes no reservan existencias.
- Si no quedan suficientes botellas en el bar, se rechaza la venta/cobro y se revierten los cambios de esa transacción. Las operaciones concurrentes bloquean la presentación mientras descuentan existencias.
- Los registros anteriores que aún no se han vinculado al inventario mantienen su comportamiento. Para exigir control de stock a todas las bebidas existentes, hay que registrarlas/vincularlas y cargar el conteo inicial.
- Una devolución monetaria no acredita por sí sola que una botella regresó físicamente. No se repone inventario automáticamente por anulaciones financieras.
- Los productos controlados no se editan desde el antiguo formulario de productos; el precio y la comisión se definen en el traspaso. Las restricciones de base de datos impiden borrar productos o categorías que tengan inventario asociado.
- Los respaldos incluyen inventario, unidades y movimientos. La restauración sincroniza la secuencia de SKU. La limpieza de operaciones conserva el inventario físico y su historial.

## Instalación y validación

Ejecuta `corepack pnpm db:migrate` para aplicar `003_inventory.sql`. No altera las existencias ni los registros históricos del catálogo anterior.

Las pruebas `tests/postgres/inventory.test.ts` verifican códigos únicos, traspasos, concurrencia, ventas reales, cobro de cuentas, rollback, vinculación del catálogo y respaldo/restauración. Usa exclusivamente una base local con nombre terminado en `_test` al ejecutar `corepack pnpm test:postgres`.
