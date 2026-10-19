# Investigation Report: Entradas + Bebidas de Cortesía por Categoría

## Summary

1. **Config key para el precio de la entrada** → `costo_entrada` (categoría
   `comisiones`, default 10000). Vive en `SettingsServiceLevelsCard` bajo el
   card "Reglas de venta" del tab "Bar y comisiones".

2. **`/api/products/for-sale` campos** → Devuelve `categoria_id` y
   `categoria_nombre` por producto. También soporta el filtro `solo_cover=true`
   para devolver solo bebidas analcohólicas con `cover_habilitado = true`.

3. **Campo `categoria_nombre` en productos** → Sí existe: `listarParaVenta` en
   el repositorio lo incluye en el SELECT y lo expone en el objeto resultado.

4. **`costoEntradaPredeterminado` en `app/entradas/page.tsx`** →
   `useConfigValue('comisiones', 'costo_entrada', 10000)` — misma categoría y
   key que el card de configuraciones.

5. **Endpoint para productos agrupados por categoría** → No existe un endpoint
   dedicado. La agrupación debe hacerse en el cliente a partir de
   `categoria_nombre` incluida en `/api/products/for-sale`, o usando
   `/api/categories?for_sale=1` para obtener la lista de categorías y luego
   `/api/products/for-sale?category_id=X` por cada una. La opción más simple es
   llamar a `/api/products/for-sale` una sola vez y agrupar en el cliente.

6. **Config keys del card "Tragos de cortesía para clientes"** → El card en
   cuestión se llama actualmente **"Reglas de venta"**
   (`SettingsServiceLevelsCard`). El campo relevante es
   `monto_base_trago_cortesia_cliente` (categoría `comisiones`, default 10000).
   El campo del costo de entrada en ese mismo card es `costo_entrada`. **Estos
   son dos config keys distintos.**

---

## Detailed Evidence

### Q1: Config key del precio de bebidas de cortesía en el card de configuraciones

**Archivo:** `components/settings/SettingsServiceLevelsCard.tsx`

El card "Reglas de venta" (tab "Bar y comisiones") contiene dos campos
relevantes:

```ts
// "Trago de cortesía para cliente"
const configTragoCortesia = useConfigValue(
  'comisiones',
  'monto_base_trago_cortesia_cliente', // ← key para bebidas de cortesía en Ventas
  10000
);

// "Costo de entrada"
const configCostoEntrada = useConfigValue('comisiones', 'costo_entrada', 10000);
```

Ambas claves se definen en `modules/ventas/configuracionClaves.ts`:

```ts
monto_base_trago_cortesia_cliente: {
  categoria: 'comisiones',
  tipo: 'number',
  default: 10000,
  ...
},
costo_entrada: {
  categoria: 'comisiones',
  tipo: 'number',
  default: 10000,
  ...
}
```

**Conclusión:** El precio de las bebidas de cortesía para el módulo de entradas
usa `costo_entrada`. El campo `monto_base_trago_cortesia_cliente` es para el
módulo de Ventas (órdenes/pedidos). Son campos distintos con el mismo default.

---

### Q2 & Q3: Campos que devuelve `/api/products/for-sale` — incluye categoría

**Archivo:** `modules/inventario/catalogo/repositorio.ts`, función
`listarParaVenta`

El SELECT incluye:

```sql
pr.categoria_id, c.nombre AS categoria_nombre, pr.nombre AS producto_nombre
```

El objeto resultado incluye:

```ts
{
  presentacion_id, presentacion_nombre,
  codigo_barras, foto,
  precio_venta, comision,
  stock_bar, ml_botella, ml_shot, ml_shot_anfitriona, max_anfitrionas,
  ml_abierta, opciones_venta,
  producto_id, producto_codigo, producto_nombre,
  categoria_id,         // ← id de la categoría
  categoria_nombre,     // ← nombre de la categoría (puede ser null si sin categoría)
}
```

El endpoint también acepta `solo_cover=true` (vía
`ProductService.listForSale({ solo_cover: true })`), que filtra:

- `c.system_key = 'bebidas_analcoholicas'`
- `opciones_venta->>'cover_habilitado' = 'true'` en la opción de tipo botella

**Archivo:** `app/api/products/for-sale/route.ts`

```ts
const data = await ProductService.listForSale({
  category_id: searchParams.get('category_id') || undefined,
  term: searchParams.get('term') || undefined,
  solo_colaciones: searchParams.get('solo_colaciones') === 'true',
  solo_cover: searchParams.get('solo_cover') === 'true'
});
```

---

### Q4: `costoEntradaPredeterminado` en `app/entradas/page.tsx`

**Archivo:** `app/entradas/page.tsx`, línea 120:

```ts
const costoEntradaPredeterminado = Number(
  useConfigValue('comisiones', 'costo_entrada', 10000)
);
```

- Categoría: `comisiones`
- Key: `costo_entrada`
- Default: `10000`
- Uso: multiplica por `cantidadEntradas` para calcular el `monto_entrada` base y
  el `montoMaximoBebida`

---

### Q5: Endpoint o query de productos agrupados por categoría

No existe ningún endpoint dedicado que devuelva productos agrupados por
categoría.

Opciones disponibles:

- **`/api/products/for-sale`** → devuelve todos los productos con
  `categoria_nombre` incluido. Se puede agrupar en el cliente con `Array.reduce`
  o `Map`.
- **`/api/categories?for_sale=1`** → devuelve categorías activas con
  `total_products` (cuenta de productos con stock en bar). Campos:
  `{ id, system_key, name, description, status, total_products, ... }`. No
  devuelve los productos, solo el conteo.
- **`/api/products/for-sale?category_id=X`** → filtra por categoría. Requiere
  múltiples llamadas.

**Recomendación para la feature:** Llamar a `/api/products/for-sale` una sola
vez y agrupar por `categoria_nombre` en el cliente. Esto evita N+1 requests y es
coherente con lo que ya hace el código existente.

---

### Q6: Config keys del card "Reglas de venta" (antes "Tragos de cortesía para clientes")

**Archivo:** `components/settings/SettingsServiceLevelsCard.tsx`

El card "Reglas de venta" guarda 5 claves en `PUT /api/configurations`:

| Campo visible en UI                | Config key                              | Default   |
| ---------------------------------- | --------------------------------------- | --------- |
| Venta simple hasta                 | `umbral_simple_hasta`                   | 10000     |
| Anfitriona desde                   | `umbral_anfitriona_desde`               | 20000     |
| Habitación desde                   | `umbral_habitacion_desde`               | 30000     |
| **Trago de cortesía para cliente** | **`monto_base_trago_cortesia_cliente`** | **10000** |
| **Costo de entrada**               | **`costo_entrada`**                     | **10000** |

La label actual del campo relevante es **"Trago de cortesía para cliente"**, con
la descripción: _"En Ventas, el cliente puede elegir como cortesía un corto de
este precio o menos."_

El texto que el usuario quiere cambiar a **"Covers de entradas"** debe apuntar
al campo `costo_entrada` (el último del card), no a
`monto_base_trago_cortesia_cliente`.

---

## Conclusions & Recommendations

### Qué construir en `app/entradas/page.tsx`

El usuario pide:

1. ✅ **Botones +/− rounded-full** para cantidad de entradas → Ya implementado
   en el código actual (líneas 251–273 del page.tsx). Los botones ya tienen
   `className='rounded-full'`.

2. **Eliminar el `<Select>` de "Bebida incluida"** y reemplazarlo con **cards de
   categorías** que muestren los productos con el precio del config
   `monto_base_trago_cortesia_cliente` (o `costo_entrada` — ver nota abajo).

3. **Cambiar el texto** del campo/card que dice "Tragos de cortesía para
   clientes" a "Covers de entradas" en `SettingsServiceLevelsCard.tsx`.

### Nota crítica sobre qué precio usar para los cards de categoría

El código actual filtra productos de cortesía por:

```ts
const productosCortesia = useMemo(
  () =>
    productosBar.filter(producto => producto.precio_venta <= montoMaximoBebida),
  [productosBar, montoMaximoBebida]
);
```

Donde
`montoMaximoBebida = costoEntradaPredeterminado * cantidadEntradas + Number(montoBebida || 0)`.

Según el request del usuario, los cards deben mostrar productos **"con el precio
que está seteado en el módulo configuraciones en el tab Bar y comisiones en la
sección Reglas de venta del card Tragos de cortesía para clientes"**. Eso apunta
a `monto_base_trago_cortesia_cliente` (categoría `comisiones`). Sin embargo, en
el módulo de entradas el límite actual está usando `costo_entrada`. El
implementador debe decidir (o preguntar) si el nuevo filtro de cards usa
`costo_entrada` (comportamiento actual) o `monto_base_trago_cortesia_cliente`
(interpretación literal del request).

**Mi recomendación:** Usar `monto_base_trago_cortesia_cliente` para los cards de
categoría de bebidas de cortesía, ya que ese es el config key que el usuario
apunta según la descripción del card en configuraciones. El `costo_entrada`
permanece como el precio base de la entrada.

### Plan de implementación recomendado

1. **`app/entradas/page.tsx`**: Eliminar el bloque `<div className='space-y-2'>`
   con el `SearchableSelect` de "Bebida incluida". En su lugar, crear un
   componente de selección por categorías:
   - Agregar
     `useConfigValue('comisiones', 'monto_base_trago_cortesia_cliente', 10000)`
     para obtener el límite de precio
   - Llamar a `/api/products/for-sale` (ya existe, ya se llama)
   - Agrupar `productosBar` por `categoria_nombre` en el cliente
   - Renderizar una grilla de cards de categoría; al hacer click en una
     categoría, mostrar los productos de esa categoría (filtrados por
     `precio_venta <= montoMaximoBebida` o por el nuevo límite)
   - Mantener el estado `bebidaCortesiaId` existente para la lógica de POST

2. **`components/settings/SettingsServiceLevelsCard.tsx`**: Cambiar el texto del
   label `"Trago de cortesía para cliente"` y su descripción a
   `"Covers de entradas"` (o similar según preferencia del usuario).

### Archivos a modificar

| Archivo                                             | Cambio                                                                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `app/entradas/page.tsx`                             | Reemplazar SearchableSelect de bebida incluida con cards de categorías; usar `monto_base_trago_cortesia_cliente` |
| `components/settings/SettingsServiceLevelsCard.tsx` | Cambiar label "Trago de cortesía para cliente" → "Covers de entradas"                                            |

No se necesitan cambios en la API, base de datos ni tipos — `categoria_nombre`
ya está disponible en la respuesta de `/api/products/for-sale`.
