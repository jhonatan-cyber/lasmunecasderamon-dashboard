# Inventario y bar

> Estado actual: implementado el **registro en almacén** (producto +
> presentaciones con precio de compra, stock por presentación y códigos únicos
> `LM-…` + barra EAN-13 por unidad), el **bar** (`/bar`): traspaso FIFO
> almacén→bar con precio de venta y comisión por presentación, movimientos
> registrados, **etiquetas/QR**, **historial**, **descuento automático al vender
> o cobrar una cuenta** y el **control de envases vacíos** bar → almacén
> (`/bar → Envases` entrega el bar, `/products/containers` confirma el almacén).

El menú incluye **Inventario** (`/inventory`) y **Bar** (`/bar`). Ambos utilizan
las categorías existentes y los permisos de productos: lectura para consultar y
escritura para registrar ingresos y traspasos.

## Operación

1. Registra un producto, su categoría y una o varias presentaciones. La
   presentación es libre: `500 ml`, `750 ml`, `1 litro`, etc. El código de
   barras del fabricante pertenece a la presentación y no se puede repetir en
   otra presentación.
2. Indica las botellas iniciales o utiliza **Ingresar** posteriormente. Diez
   botellas generan diez registros físicos y diez SKU diferentes, persistidos en
   PostgreSQL. No se reutilizan los números de la secuencia.
3. Abre **Etiquetas**, selecciona las unidades e imprime. Cada etiqueta contiene
   nombre, presentación, SKU legible y QR del SKU. Reimprimir no genera códigos
   nuevos. La distribución actual es para hojas A4; el navegador permite guardar
   PDF.
4. Usa **Traspasar** para elegir cantidad, precio y comisión por botella. Se
   seleccionan primero las unidades más antiguas del inventario. La operación es
   atómica y registra quién la realizó, fecha, cantidades, unidades, precio y
   comisión.
5. La presentación aparece en el catálogo usado por pedidos y ventas. Los
   siguientes traspasos actualizan su precio y comisión para nuevas ventas; los
   importes históricos no se modifican.
6. **Historial** muestra ingresos, traspasos y ventas de cada presentación.

Puedes agregar presentaciones a un producto después de crearlo. Para incorporar
un producto del catálogo anterior, selecciona **Vincular la primera presentación
a un producto existente** al registrar el producto. Debe pertenecer a la misma
categoría: se conserva su identificador y su historial. El stock inicial siempre
requiere conteo físico, no se deduce de las ventas anteriores.

## Descuento y conservación

- El stock del bar se descuenta automáticamente al registrar la venta o cobrar
  una cuenta. Los pedidos y cuentas pendientes no reservan existencias.
- En el carrito de venta cada presentación puede venderse como **botella**
  (gasta una unidad completa) o como **shot**, que descuenta ml de la botella
  abierta: se termina la botella que ya está servida y, si no alcanza, se abre
  la siguiente. Cuando el contenido llega a 0, la botella pasa a vendida.
- Los ml por shot y los ml por botella se configuran en **Configuraciones →
  Bar**. Cada presentación puede definir su propia capacidad en ml desde su
  formulario; si no lo hace, se usa la de Configuraciones (750 por defecto).
- Las botellas abiertas siguen contando como una unidad en bar y muestran su
  contenido restante (`Abierta: N ml`) en las tarjetas del bar y en el detalle
  del producto.
- Si no quedan suficientes botellas en el bar, se rechaza la venta/cobro y se
  revierten los cambios de esa transacción. Las operaciones concurrentes
  bloquean la presentación mientras descuentan existencias.
- Los registros anteriores que aún no se han vinculado al inventario mantienen
  su comportamiento. Para exigir control de stock a todas las bebidas
  existentes, hay que registrarlas/vincularlas y cargar el conteo inicial.
- Una devolución monetaria no acredita por sí sola que una botella regresó
  físicamente. No se repone inventario automáticamente por anulaciones
  financieras.
- Los productos controlados no se editan desde el antiguo formulario de
  productos; el precio y la comisión se definen en el traspaso. Las
  restricciones de base de datos impiden borrar productos o categorías que
  tengan inventario asociado.
- Los respaldos incluyen inventario, unidades y movimientos. La restauración
  sincroniza la secuencia de SKU. La limpieza de operaciones conserva el
  inventario físico y su historial.

## Devolución de envases vacíos (bar → almacén)

El control es interno, entre el bar y el almacén, y tiene dos pasos sobre la
misma unidad:

1. **El bar entrega**: el tab **Envases** de `/bar` verifica el código escaneado
   contra las unidades que nosotros registramos (EAN-13 interno `29…` o SKU
   `LM-…`) y lo marca como entregado en el mismo paso. Exige las tres
   condiciones:
   - **Es nuestro**: el código debe existir en `inventario_unidades`; cualquier
     otro código se rechaza como no nuestro.
   - **Está vacío**: solo se aceptan unidades en estado `vendida` (consumidas
     por una venta o por shots). Las que siguen llenas o dadas de baja se
     rechazan.
   - **Todavía no se entregó**: al marcar se escriben `fecha_devolucion` y
     `devuelto_por`; un re-escaneo detecta la marca y responde con la fecha
     anterior en lugar de volver a marcar.
2. **El almacén recibe**: la página **Envases devueltos** del almacén
   (`/products/containers`) escanea el mismo código y confirma la recepción con
   `fecha_confirmacion` + `confirmado_por`. Se rechaza si el bar todavía no lo
   entregó (`no_entregado`), si el código no es nuestro o si ya se había
   confirmado. Quien entrega no puede confirmar: el permiso es distinto.

En los dos pasos la lectura bloquea la fila (`FOR UPDATE`) y la marca es
condicional dentro de la misma transacción, así que dos escaneos simultáneos no
pueden marcar el mismo envase dos veces.

El escaneo es continuo: el campo se limpia y recupera el foco después de cada
lectura, así que una devolución completa se pasa sin tocar el teclado. El lote
de la sesión lleva sus propios contadores (aceptados y rechazados), la lista de
los últimos escaneos con el motivo de cada rechazo y un aviso sonoro distinto
para aceptado y rechazado (`playScanSound` en `lib/utils/audioUtils.ts`), que se
puede silenciar y la preferencia sobrevive al refresco de la página. El
historial se refresca una sola vez por ráfaga de escaneos, no por cada código.

Sin conexión el lote no se interrumpe: cada lectura se guarda en una cola local
(`localStorage`, con clave propia por paso; no se mezcla con la cola genérica de
`lib/utils/offlineStore.ts`, que al limpiar el ítem no devuelve el diagnóstico),
suena su tercer tono y se cuenta como **En cola**. La verificación se reintenta
sola con el evento `online`, con el botón **Reintentar** y tras cualquier
lectura que vuelva a responder, siempre en orden cronológico y deteniéndose en
el primer fallo de red. **Nunca se descarta una lectura pendiente**: tampoco al
limpiar el lote ni al recortar la lista, y la cola sobrevive a un refresco de
página. Al sincronizar cada ítem recibe su veredicto y pasa a su contador, y se
avisa el resumen de una vez. Los errores de cliente (4xx) no se encolan porque
no se arreglan reintentando. Ninguno de los pasos crea movimientos de inventario
ni repone stock: la botella ya salió con la venta y el control es únicamente el
tránsito físico del envase.

La alerta de recepciones atrasadas avisa al almacén cuando un envase entregado
lleva más de `HORAS_ENVASE_SIN_CONFIRMAR` (2) horas sin confirmación. El
servidor emite el evento SSE `warehouse_container_alert` (audiencia declarada en
`sseEvents.ts`) **cada vez que cambia** el número de atrasados, y solo cuando
ese número crece crea la campana `warehouse_container_alert` y manda el push a
los roles de almacén y administrador. El chequeo corre desde el cron
(`cron/check-timers`) y también con `GET /api/bar/containers/summary`, así que
el panel mantiene su contador vivo con el evento y con un refresco cada minuto,
aunque el cron externo no corra. El estado del último aviso vive en `globalThis`
(mismo patrón que `__attendanceCheckDate` de check-timers): un chequeo repetido
con los mismos números no vuelve a avisar, y cuando todo se confirma se publica
el estado limpio para que el panel apague su banner.

El historial (`GET /api/bar/containers`) muestra fecha, SKU, producto,
presentación, compra, quién entregó y quién confirmó, y lo ven las dos partes
(lectura de productos). Marcar la entrega exige `products/return_container`
(migración 032, rol Barman) y confirmar la recepción exige
`products/confirm_container_return` (migración 033, roles de almacén y
administrador; el administrador pasa siempre). El flujo completo —entrega,
re-escaneo, envases llenos, códigos ajenos, confirmación, recepción sin entrega
y doble confirmación— está cubierto por
`tests/postgres/bar-containers-flow.test.ts`.

## Instalación y validación

Ejecuta `corepack pnpm db:migrate` para aplicar `003_inventory.sql`. No altera
las existencias ni los registros históricos del catálogo anterior.

Las pruebas de unidad `tests/unit/lib/repositories/InventoryRepository.test.ts`
cubren códigos únicos, traspasos, stock por ubicación y el descuento de venta:
bloqueo de la presentación, marcado de unidades, movimiento histórico y rechazo
por stock insuficiente sin modificar nada.
`tests/unit/lib/services/SaleService.test.ts` comprueba que el descuento se
dispara dentro de la transacción de la venta (y por lo tanto también en el cobro
de cuenta) y que un rechazo revierte la venta entera. No existe hoy una prueba
de Postgres que ejercite el flujo completo venta + inventario.
