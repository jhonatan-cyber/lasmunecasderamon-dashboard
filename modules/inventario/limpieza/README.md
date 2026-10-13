# Insumos de limpieza

La página `/cleaning` y la API `/api/cleaning` administran un catálogo
independiente de productos comerciales. La migración
`070_inventario_limpieza.sql` crea artículos, saldos por ubicación y
movimientos. No agrega artículos de ejemplo.

- Administración, almacenero/bodeguero y encargado general: catálogo, ingresos,
  traspasos, consumos y resolución en cualquier ubicación.
- Barman: recibir en Bar, registrar consumo en Bar y devolver al almacén.
- Cajero: recibir en Caja, registrar consumo en Caja y devolver al almacén.
- Limpieza/Encargado local: las mismas operaciones para Local. En instalaciones
  sin ese rol, administración confirma la recepción en Local.

Las autorizaciones se verifican en el servicio; ocultar un botón no concede ni
revoca permisos. Los artículos usan unidad, litro, kilo, paquete o metro; unidad
y paquete requieren cantidades enteras. El stock mínimo se refiere al almacén.

Enviar un traspaso descuenta el origen y deja la cantidad en tránsito. Aceptarlo
acredita el destino; rechazarlo repone el origen. Las transacciones bloquean el
artículo antes de operar para serializar movimientos concurrentes y evitar
saldos negativos o recepciones duplicadas. El consumo exige un motivo.

El cliente utiliza claves de idempotencia y conserva la clave al perder una
respuesta; la lectura obtiene una instantánea coherente de saldos y tránsito. La
pantalla actualiza cada 30 segundos mientras está visible y al recuperar el
foco. El historial muestra todos los pendientes y los últimos 500 resueltos.

Validación: `pnpm test:integration:cleaning` utiliza la conexión PostgreSQL de
desarrollo en un esquema temporal `test_cleaning_*`, que elimina al terminar. No
escribe artículos o movimientos en las tablas de negocio. La prueba cubre
ingresos, consumo, devoluciones, permisos, recepción repetida y concurrencia.
