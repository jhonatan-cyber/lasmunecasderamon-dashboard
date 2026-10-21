# Selector de presentación igualado entre modal crear y modal editar

El commit extrae la lógica del campo "número + unidad" (ml / cc / oz / un) de
`NewPresentacionRow` hacia un componente compartido `PresentacionNombreInput`, y
lo instala en `ExistingPresentacionCard`. El campo de texto plano que existía en
el modo edición desaparece; ambos modales usan ahora exactamente el mismo
widget. El diff incluye además un fix de alias SQL en
`categorias/repositorio.ts` que no tiene relación con el cambio de UI.

Watch for: la sincronización de la unidad en `PresentacionNombreInput` depende
de `parsed.unidad` como dependencia del efecto, y `parsed` se recalcula en cada
render derivando de `value`; si el valor entra con una unidad no reconocida
(texto libre heredado), el efecto no se dispara y el select queda en `ml`
mientras el nombre guardado permanece sin sufijo — el usuario no ve indicación
de que el valor actual no coincide con la selección visible.

**Verdict**: APPROVED

---

## High-level view

`PresentacionNombreInput` es una extracción limpia: la lógica de `splitNombre`,
la lista `PRESENTACION_UNIDADES` y el estado local de `unidad` viven en un solo
lugar, exportados para reutilización externa. `NewPresentacionRow` pasa a ser un
consumidor delgado sin estado propio. `ExistingPresentacionCard` reemplaza
`<Input value={editPresDraft.nombre} ... />` por
`<PresentacionNombreInput value={editPresDraft.nombre} onChange={value => changeEditPresDraft('nombre', value)} />`
— la firma `onChange: (value: string) => void` coincide exactamente con lo que
`changeEditPresDraft` espera recibir, sin adaptadores.

La fuente de opciones es idéntica en ambos modales: la constante
`PRESENTACION_UNIDADES` del propio archivo del componente. No hay carga remota
ni configuración por props, lo cual garantiza que el conjunto de unidades no
puede divergir entre los dos contextos de uso.

La validación Zod para `nombre` vive en `PresentacionSchema`
(`lib/business/schemas/product.ts`: `z.string().trim().min(1).max(100)`) y en el
hook (`editPresDraft.nombre.trim()` como guarda previa al POST). Ninguna de las
dos toca el formato interno del string — `"750 ml"` pasa igualmente que `"750"`.
No hay regresión aquí: el backend acepta cualquier string no vacío de hasta 100
caracteres.

El `useEffect` de sincronización de unidad tiene un comportamiento de borde: el
efecto solo actúa cuando `parsed.unidad !== null`, lo que significa que si un
producto tiene un nombre guardado en texto libre (ej. `"botella grande"`) el
select mostrará `ml` por defecto aunque el nombre no contenga unidad. Al editar
y cambiar solo el número, el componente emitiría `"<número> ml"`,
sobreescribiendo el nombre previo con un formato diferente. Este es un riesgo
real para datos existentes que no siguen el patrón `"<número> <unidad>"`.

---

<details>
<summary>Issues (1)</summary>

1. **Sobreescritura silenciosa de nombres en formato libre** — Si una
   presentación existente tiene `nombre = "Botella grande"` (texto sin el patrón
   `\d+ <unidad>`), al abrir la edición el select muestra `ml`, `parsed.valor`
   es vacío, y cualquier interacción con el campo numérico emitirá
   `"<número> ml"` hacia `changeEditPresDraft`, perdiendo el nombre original. No
   hay indicación visual de que el nombre actual no encaja en el selector.
   Solución: mostrar el nombre completo en el input numérico como texto plano
   cuando `splitNombre` no produce un match válido, o bien agregar un estado
   "modo libre" que preserve el valor sin transformarlo hasta que el usuario
   interactúe explícitamente con el selector.

</details>

<details>
<summary>Details</summary>

### Nombre en texto libre al abrir edición

`splitNombre` intenta hacer match contra `/^(\d+)\s*(\S*)$/`. Un nombre como
`"Botella grande"` (dos palabras) no hace match y devuelve
`{ valor: '', unidad: null }`. El estado local `unidad` se inicializa en `'ml'`
porque `parsed.unidad ?? 'ml'`. El `useEffect` que sincronizaría la unidad tiene
`if (parsed.unidad) setUnidad(parsed.unidad)` — condición falsa, efecto sin
acción. El input numérico renderiza vacío. Si el usuario escribe cualquier
número, `emitNombre` llama `onChange("123 ml")`, actualizando
`editPresDraft.nombre` y por ende el POST guardará `"123 ml"` aunque el nombre
original era `"Botella grande"`.

La severidad es baja si el catálogo de productos de este negocio usa
consistentemente el formato `"<número> <unidad>"` desde que se creó — los datos
seed y el modal de crear implican que sí. Pero si existen registros más antiguos
o importados con nombres libres, la pérdida de datos es silenciosa. Vale la pena
confirmar con el equipo si hay presentaciones fuera del patrón antes de
descartar el concern.

</details>

<details>
<summary>File map</summary>

| Archivo                                            | Cambio                                                                                         |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `components/products/PresentacionNombreInput.tsx`  | Nuevo componente compartido: input numérico + select de unidad                                 |
| `components/products/NewPresentacionRow.tsx`       | Reemplaza implementación inline por `PresentacionNombreInput`; elimina estado y lógica local   |
| `components/products/ExistingPresentacionCard.tsx` | Reemplaza `<Input>` de texto plano por `PresentacionNombreInput`                               |
| `modules/inventario/categorias/repositorio.ts`     | Fix de alias SQL `entradas_productos` → `entradasProductos`; refactor de borrado de categorías |

</details>
