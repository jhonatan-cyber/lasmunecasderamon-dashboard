# Registros sin duplicados en el dashboard

La protección se aplica a las escrituras del navegador hacia `/api/` (`POST`,
`PUT`, `PATCH` y `DELETE`). No deduplica compras o ventas distintas por tener
los mismos productos: cada operación nueva, después de recibir confirmación,
recibe otra clave.

## Capas

- `instrumentation-client.ts` instala `registrationFetch` antes de hidratar la
  aplicación. Dos solicitudes iguales en vuelo comparten una petición, con
  respuestas clonadas para que cada consumidor pueda leer su JSON.
- El botón compartido bloquea su manejador asíncrono desde el primer clic y
  deshabilita los botones de envío mientras se procesa una escritura. Compras
  también tiene un bloqueo síncrono en `onSubmit`, independiente de React.
- La clave `x-registration-key` se conserva ante pérdida de respuesta, errores
  5xx o una operación en curso. `sessionStorage` guarda únicamente una huella
  SHA-256 y la clave, sin el contenido del formulario.
- `withRoute` autentica y comprueba permisos antes de reclamar la clave mediante
  `runRegistration`. Reutiliza `sync_operations` y su reclamación atómica con
  `ON CONFLICT`: una repetición devuelve el resultado almacenado o un 409 si
  sigue pendiente. No vuelve a ejecutar la operación de negocio.
- Las rutas que ya tienen idempotencia offline conservan su contrato. Las claves
  explícitas de esa cola no se agrupan entre sí, y el registro web evita una
  segunda reclamación interna de la misma clave.
- `useSingleFlight` protege las mutaciones genéricas y los formularios de
  pedidos y cuentas. Estos dos conservan además su código generado durante el
  reintento, y no vuelven a registrar una intención que ya se confirmó.

Se excluyen autenticación, notificaciones, cron, webhooks, lecturas y
solicitudes a otros servidores del transporte del navegador. Las solicitudes
legacy sin clave mantienen el comportamiento previo; clientes externos deben
enviar su propia clave de idempotencia cuando corresponda.

## Compras

La cantidad de unidades se genera una vez por línea, dentro de una transacción;
el stock se recalcula contando unidades, sin volver a sumarlo. El formulario
evita agregar dos líneas de la misma presentación por clics antes del render y
solo registra desde el paso de confirmación.

`tests/postgres/compras-idempotencia.test.ts` comprueba con PostgreSQL real que
dos solicitudes simultáneas y su reintento crean una compra y tres unidades; una
intención nueva puede crear otras tres. También simula perder la respuesta
después del commit y comprueba que el reintento no vuelve a ingresar stock.

Las pruebas de transporte, permisos, botones, compras, pedidos y cuentas cubren
doble envío, conservación de claves/códigos, archivos multipart, errores y
compatibilidad con los flujos existentes.
