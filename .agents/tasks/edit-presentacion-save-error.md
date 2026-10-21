# Reporte: Error al guardar presentación editada

## Resumen ejecutivo

**El error NO es una regresión de los últimos commits.** Es un efecto secundario
del sistema de idempotencia de registro (`registrationFetch` +
`runRegistration`) que envuelve **todos** los PATCH del cliente. El flujo que lo
dispara es:

1. El usuario edita una presentación y pulsa "Guardar".
2. `registrationFetch` asigna una clave de registro (UUID) y la guarda en
   `sessionStorage` asociada a la huella del request (método + URL + cuerpo).
3. El servidor (`runRegistration` → `runIdempotent`) crea una fila `pendiente`
   en `sync_operations` y ejecuta el PATCH. Si el handler lanza
   (`SyncOperationRepository.fail`), la fila pasa a estado `fallida`.
4. El usuario vuelve a pulsar "Guardar" con exactamente el mismo payload (mismo
   campo, mismo valor). La huella del request es idéntica → `registrationFetch`
   recupera la misma clave de `sessionStorage` → el servidor encuentra la fila
   `fallida` → `buildReplayResponse` devuelve:

   ```json
   {
     "success": false,
     "code": "IDEMPOTENCY_FALLIDA",
     "message": "Esta operación quedó en revisión y no se reintenta automáticamente para no duplicarla."
   }
   ```

   con HTTP 409, que el hook muestra como toast de error.

La condición exacta que perpetúa el bloqueo está en
`registrationFetch.ts:87-99`:

```ts
if (response.status < 500) {
  try {
    const result = await response.clone().json();
    if (
      response.status !== 409 ||
      result?.code === 'IDEMPOTENCY_OWNER_MISMATCH'
    )
      saveKey(fingerprint); // ← borra la clave guardada
  } catch {}
}
```

Un 409 con `code: IDEMPOTENCY_FALLIDA` **no limpia la clave**. El próximo
intento reutiliza la misma clave y recibe el mismo 409, bloqueando al usuario
indefinidamente hasta que cierra la pestaña o el `sessionStorage` expira.

---

## Evidencia detallada

### 1. Origen del mensaje de error

**Archivo:** `lib/api/idempotency.ts`, línea 68

```ts
: 'Esta operación quedó en revisión y no se reintenta automáticamente para no duplicarla.';
```

Condición: `operation.estado` no es `'pendiente'` ni `'aplicada'` ni
`'rechazada'` — en la práctica es `'fallida'`. La función `buildReplayResponse`
se llama desde `runIdempotent` cuando `claimed === false && operation !== null`.

### 2. Condición que lo dispara

En `lib/api/idempotency.ts:94-112` (`runIdempotent`):

```ts
const { claimed, operation } = await SyncOperationRepository.claim(key, { ... });
if (!claimed && operation) {
  // ...
  return buildReplayResponse(operation);   // ← devuelve el 409
}
```

`claim` devuelve `claimed: false` cuando la clave ya existe en
`sync_operations`. `buildReplayResponse` devuelve 409 para estados `fallida` o
`pendiente`.

La fila llega a `fallida` si el handler del PATCH lanzó una excepción no
capturada (error de red interno, error de BD). La lleva a ese estado
`SyncOperationRepository.fail` en `lib/database/sync-operations.ts:138-148`.

### 3. ¿Es una regresión de los últimos commits?

**No.** El mecanismo de idempotencia de registro preexiste a los últimos
commits. Los commits recientes solo tocaron:

- `300e0d13`
  (`feat(inventario): igualar selector de presentacion en modal editar`): añadió
  `ml_botella` al draft de edición y al payload del PATCH.
- `fbd6d341`
  (`feat: remove ml_botella input from presentation edit/create forms`): eliminó
  el campo `ml_botella` del UI y del payload del PATCH.
- `f6977e69` (`fix: remove col-span-2 from Presentacion field in edit form`):
  ajuste de grid puro.

Ninguno de estos commits introduce la lógica de idempotencia. Lo que sí podría
haber sucedido es que una sesión anterior disparara un PATCH que quedó `fallida`
en la BD, y al reabrir el modal con el mismo usuario/sesión la clave aún esté en
`sessionStorage`.

### 4. ¿Llega algún campo undefined o malformado al payload?

Al analizar `saveEditPres` en `hooks/personal/useProductForm.ts:595-650`, el
payload JSON del PATCH es:

```ts
{
  id: editingPresId,
  stock_minimo: getNumericValue(editPresDraft.stock_minimo) || null,
  stock_maximo: getNumericValue(editPresDraft.stock_maximo) || null,
  nombre: editPresDraft.nombre.trim(),
  codigo_barras: editPresDraft.codigo_barras.trim(),
  precio_compra: getNumericValue(editPresDraft.precio_compra) || '0',
  precio_venta:  getNumericValue(editPresDraft.precio_venta)  || '0',
  comision:      getNumericValue(editPresDraft.comision)      || '0'
}
```

Tras el commit `fbd6d341` ya **no se envía `ml_botella`**. Los campos que van
como `''` (código de barras vacío) o `null` (stock_min/max vacíos) son válidos
para la ruta PATCH — el servidor los acepta explícitamente
(`if (payload[key] !== undefined)` en
`app/api/products/presentations/route.ts:102-111`). No hay campo undefined.

**La ruta PATCH de presentaciones no usa `runIdempotent` directamente.** La
idempotencia llega a través de `withRoute` → `runRegistration`
(`withRoute.ts:219`), que aplica el `REGISTRATION_HEADER` (`x-registration-key`)
a todos los PATCH autenticados.

### 5. ¿La API route tiene lógica propia de "en revisión"?

`app/api/products/presentations/route.ts` no llama a `runIdempotent`
directamente. La idempotencia proviene íntegramente de `withRoute.ts` →
`runRegistration` → `runIdempotent`. No hay lógica adicional de "en revisión" en
la propia ruta.

---

## Causa raíz

La combinación de dos comportamientos correctos individualmente produce el
bloqueo:

| Capa                                    | Comportamiento                                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `registrationFetch`                     | Conserva la clave en `sessionStorage` cuando el servidor devuelve 409 (excepto `OWNER_MISMATCH`). Intención: permitir reintentos seguros de operaciones de dinero. |
| `runIdempotent` / `buildReplayResponse` | Devuelve 409 `IDEMPOTENCY_FALLIDA` para no duplicar operaciones cuyo resultado se desconoce.                                                                       |

Para operaciones PATCH de inventario (bajo riesgo de duplicación real — cambiar
nombre/precio es idempotente por naturaleza), este circuito de "congelación" es
demasiado agresivo. Una fila `fallida` en `sync_operations` bloquea todos los
futuros intentos del mismo request hasta que el usuario cierra la pestaña.

---

## Recomendaciones de corrección

### Opción A (mínimo impacto, recomendada) — Excluir rutas idempotentes-por-naturaleza de la persistencia

En `registrationFetch.ts`, la lógica de "no borrar la clave en 409" tiene
sentido para POST de ventas/cobros. Para PATCH de recursos (presentaciones,
productos), el endpoint es idempotente: hacer el mismo PATCH dos veces no
duplica nada. Se puede añadir una lista de rutas exentas o usar un código de
error específico.

Concretamente: `buildReplayResponse` ya devuelve `code: 'IDEMPOTENCY_FALLIDA'`.
Ampliar la condición de borrado de clave en `registrationFetch.ts:92-95` para
incluir ese código:

```ts
// lib/api/registrationFetch.ts — línea ~92
if (
  response.status !== 409 ||
  result?.code === 'IDEMPOTENCY_OWNER_MISMATCH' ||
  result?.code === 'IDEMPOTENCY_FALLIDA' // ← añadir
)
  saveKey(fingerprint);
```

Esto permite reintentar PATCHs fallidos sin bloquear al usuario. El riesgo de
duplicación es bajo: una fila `fallida` significa que el handler lanzó, no que
la operación se aplicó parcialmente (a diferencia de los 5xx de ventas/cobros).

### Opción B (corrección de BD) — Limpiar filas `fallida` al reabrir el modal

Antes de ejecutar `saveEditPres`, hacer un GET o HEAD a la ruta que devuelva el
estado actual. Si el backend detecta que la operación anterior quedó `fallida`,
puede borrar la fila o permitir que el cliente fuerce un nuevo intento enviando
una nueva clave. Más invasivo.

### Opción C (corrección de server) — Marcar PATCHs de presentación como `rechazada` en vez de `fallida` ante errores 4xx

En `runIdempotent`, los errores de red internos del handler producen `fallida`.
Si la ruta PATCH valida y rechaza la petición antes de escribir en BD (devuelve
4xx), la fila se marca `rechazada` y `buildReplayResponse` sí la replica
correctamente. El problema ocurre cuando hay un error de BD o de red durante la
escritura.

### Recomendación prioritaria

**Opción A** es la más pequeña, más segura y resuelve el bloqueo sin alterar el
comportamiento de las operaciones críticas de dinero (ventas, cobros, pedidos).

---

## Archivos clave citados

| Archivo                                    | Función                                                      |
| ------------------------------------------ | ------------------------------------------------------------ |
| `lib/api/idempotency.ts:68`                | Origen literal del mensaje de error                          |
| `lib/api/idempotency.ts:88-112`            | `runIdempotent` — lógica de claim y replay                   |
| `lib/api/registrationFetch.ts:87-99`       | Condición que preserva la clave en 409                       |
| `lib/api/registrationFetch.ts:14`          | Instalación global sobre `window.fetch`                      |
| `instrumentation-client.ts:14`             | Dónde se instala `registrationFetch`                         |
| `lib/api/registration.ts:7-39`             | `runRegistration` — capa entre `withRoute` y `runIdempotent` |
| `lib/api/withRoute.ts:219`                 | Punto donde se llama `runRegistration` para todo PATCH       |
| `lib/database/sync-operations.ts:133-149`  | `resolve` y `fail` — estados del registro                    |
| `app/api/products/presentations/route.ts`  | Ruta PATCH sin `runIdempotent` propio                        |
| `hooks/personal/useProductForm.ts:595-650` | `saveEditPres` — construye y envía el PATCH                  |
