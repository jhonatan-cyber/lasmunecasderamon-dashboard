# Investigación: campo `ml_botella` — ¿es redundante con el nombre de presentación?

## Respuesta corta

`ml_botella` **no es redundante** desde el punto de vista funcional: es la
fuente de verdad explícita para la capacidad de una botella en el motor de
ventas por shot. El nombre de la presentación (`nombre`, ej. `"750 ml"`) es solo
el fallback de segundo nivel cuando `ml_botella` es NULL. Ambos campos conviven
bajo una jerarquía definida de manera deliberada. Sin embargo, **el campo NO
aparece en el formulario de creación** (`NewPresentacionRow`) — solo existe en
el formulario de edición (`ExistingPresentacionCard`). La asimetría es una deuda
técnica menor, no un bug conceptual.

---

## 1. Existencia del campo en la base de datos

**Tabla:** `inventario_presentaciones`  
**Columna:** `ml_botella INTEGER DEFAULT NULL`

Añadida por `migrations/030_shots_ml_botellas.sql`:

```sql
ALTER TABLE inventario_presentaciones
  ADD COLUMN IF NOT EXISTS ml_botella integer DEFAULT NULL;
```

El schema completo en `database/lasmunecasderamon.postgres.sql` (línea 463)
confirma la columna.

---

## 2. Usos del campo en cálculos y lógica de negocio

El campo alimenta **una función central** que usa una jerarquía de tres niveles:

### `lib/business/shotMl.ts` — función `resolveBotellaMl`

```ts
export function resolveBotellaMl(
  mlBotella: number | null | undefined, // nivel 1: columna explícita
  nombrePresentacion: string | null | undefined, // nivel 2: parseo del nombre
  globalBotellaMl: number // nivel 3: default Configuraciones
): number {
  const propia = Math.floor(Number(mlBotella ?? 0));
  if (propia > 0) return propia;
  return mlDesdeNombrePresentacion(nombrePresentacion) ?? globalBotellaMl;
}
```

Esta función es llamada en **cinco lugares**:

| Archivo                                                | Propósito                                    |
| ------------------------------------------------------ | -------------------------------------------- |
| `modules/inventario/bar/consumoRepositorio.ts:177`     | Capacidad de la botella al consumir un shot  |
| `modules/inventario/anulaciones/repositorio.ts:102`    | Reponer ml al anular una venta               |
| `components/bar/BarCard.tsx:46`                        | Mostrar ml disponibles en la tarjeta del bar |
| `app/bar/page.tsx:779`                                 | Calcular saldo en el modal del bar           |
| _(transitivo: todos los tests de integración del bar)_ |                                              |

### Cálculos concretos donde `ml_botella` tiene efecto

En `consumoRepositorio.ts`:

```ts
// Si ml_botella > 0, capacidadMl usa ese valor. Si no, usa lo que dice el nombre.
const capacidadMl = resolveBotellaMl(
  presentacion.ml_botella,
  presentacion.nombre,
  botellaMl
);
// ...
plan.push({
  id: unidad.id,
  ml_restante: capacidadMl - consumido,
  ml_consumido: consumido
});
```

Es decir: `ml_botella` controla **cuántos ml quedan en la botella después del
primer shot**. Si la botella real tiene 1000 ml pero `ml_botella` dice 750, el
bar cree que quedaron 700 ml después de un shot de 50, cuando en realidad
quedaron 950.

---

## 3. ¿`presentacion_nombre` ya almacena los ml? ¿Son el mismo valor?

**Sí y no.** `nombre` como `"750 ml"` contiene el volumen implícito;
`ml_botella` lo guarda como número entero explícito.

- Son **conceptualmente equivalentes** cuando el nombre sigue el patrón
  `"NNN ml"`.
- **No son lo mismo** cuando el nombre es libre (`"Botella chica"`,
  `"Whisky Premium"`) o cuando se quiere que la capacidad real difiera del
  nombre de marketing.
- La función `mlDesdeNombrePresentacion` parsea el nombre con regex y extrae el
  número. Si tiene éxito, el sistema ni siquiera mira `ml_botella` (a menos que
  `ml_botella > 0` tenga prioridad explícita — nivel 1).

### Evidencia de la deuda histórica

La migración `057_presentaciones_capacidad_desde_nombre.sql` documenta que
`ml_botella` quedó en NULL en **todas** las presentaciones porque nadie lo
guardó al crear — el campo existía en la DB pero no en el formulario de alta.
Esto causó que el bar abriera botellas de 1000 ml como si fueran de 750 (el
default de Configuraciones), mostrando ml erróneos hasta que la migración 057
los corrigió populando `ml_botella` desde el nombre.

---

## 4. ¿Se podría derivar `ml_botella` del nombre o es dato independiente?

**Se puede derivar** en el 95% de los casos. El sistema ya lo hace así
(jerarquía de `resolveBotellaMl`). El 5% restante son:

- Nombres sin volumen (ej. `"Botella chica"`) — solo el default global aplica.
- Presentaciones donde la capacidad real difiere del nombre (ej. una botella de
  "750 ml" pero el proveedor la cambió a 700 ml sin renombrar el SKU).

En la práctica, si todos los productos del negocio siguen el patrón `"NNN ml"`,
el campo `ml_botella` explícito aporta resiliencia pero no información nueva.
Sin embargo, dado que ya existe, la migración 057 lo populó, y el código le da
prioridad, **eliminarlo del formulario no pierde información** — la lógica sigue
extrayéndolo del nombre.

---

## 5. ¿Qué pasaría si se elimina `ml_botella` del formulario de edición?

### Sin tocar la BD ni el código del motor

Si se elimina solo el campo del formulario de edición
(`ExistingPresentacionCard`):

- Las presentaciones **existentes** con `ml_botella > 0` (populadas por
  migración 057) seguirán funcionando correctamente: el motor lee la columna DB
  directamente.
- Las **nuevas** presentaciones (creadas con el formulario) ya no tendrán
  `ml_botella` enviado en el PATCH, así que la columna queda NULL y el motor
  parsea el nombre. Si el nombre es `"750 ml"`, el resultado es idéntico.
- El único riesgo: si alguien necesita que una presentación tenga una capacidad
  diferente a la que declara su nombre (caso de negocio inusual), no tendría
  forma de especificarlo.

### Evaluación funcional para este negocio

Si todos los productos se nombran con el patrón `"NNN ml"` (como evidencian los
tests y las fixtures: `'750 ml'`, `'1000 ml'`, `'1 litro'`), **eliminar el campo
del formulario es seguro**. El motor seguirá calculando la capacidad correcta a
partir del nombre.

---

## Recomendaciones

### Opción A — Eliminar el campo `ml_botella` del formulario (recomendada)

El usuario señala que el campo parece redundante. La evidencia lo respalda para
este negocio. **Pasos:**

1. En `components/products/ExistingPresentacionCard.tsx`: eliminar el bloque del
   input `edit-pres-ml-botella` (líneas ~168-183) y su label.
2. En `interface EditPresDraft` del mismo archivo: eliminar
   `ml_botella: string`.
3. En `hooks/staff/useProductForm.ts`: eliminar `ml_botella` del estado del
   draft de edición (líneas ~102, ~236-240, ~263, ~545, ~578-580, ~639).
4. El campo en la BD y en el código del motor **no se toca** —
   `resolveBotellaMl` sigue usando la columna cuando tiene valor (presentaciones
   históricas), y cae al nombre para las nuevas. No hay migración necesaria.

### Opción B — Mantener el campo pero solo mostrarlo en un "modo avanzado"

Si en el futuro se necesita especificar una capacidad distinta al nombre, se
podría mostrar el campo detrás de un toggle "Configuración avanzada".
Innecesario ahora.

### Lo que NO se debe hacer

- No borrar la columna `ml_botella` de la BD: las presentaciones históricas
  tienen el valor correcto allí y el motor lo usa como nivel 1 de la jerarquía.
- No eliminar `resolveBotellaMl` ni su lógica de fallback al nombre.

---

## Archivos relevantes (resumen)

| Archivo                                                    | Rol                                          |
| ---------------------------------------------------------- | -------------------------------------------- |
| `database/lasmunecasderamon.postgres.sql:463`              | Definición de la columna                     |
| `migrations/030_shots_ml_botellas.sql`                     | Alta de la columna                           |
| `migrations/057_presentaciones_capacidad_desde_nombre.sql` | Backfill histórico                           |
| `lib/business/shotMl.ts`                                   | `resolveBotellaMl` — jerarquía de resolución |
| `modules/inventario/bar/consumoRepositorio.ts:177`         | Uso en ventas por shot                       |
| `modules/inventario/anulaciones/repositorio.ts:102`        | Uso en anulaciones                           |
| `modules/inventario/productos/fachada.ts:280-343`          | Schema Zod y PATCH                           |
| `components/products/ExistingPresentacionCard.tsx:168-183` | Input del formulario de edición              |
| `hooks/staff/useProductForm.ts:102,236,545,639`            | Estado del draft + envío                     |
| `components/products/NewPresentacionRow.tsx`               | **NO tiene `ml_botella`** (solo edición)     |
| `types/product.ts:40`                                      | Tipo `Presentacion.ml_botella`               |
