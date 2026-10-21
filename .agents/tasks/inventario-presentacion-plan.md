# Plan: Igualar el selector de presentación en el modal de editar producto

## Diagnóstico

### Modal de CREAR (`NewPresentacionRow.tsx`)

El campo "Presentación" está implementado como un **input compuesto**:

- Un `<Input>` numérico para el valor (ej. `750`)
- Un `<Select>` con cuatro opciones fijas: `ml`, `cc`, `oz`, `un`
- Internamente los combina en `emitNombre(valor, unidad)` → produce `"750 ml"` y
  lo envía como string a `onUpdate('nombre', ...)`

El estado interno se maneja con `splitNombre(p.nombre)` que parte el string en
valor + unidad.

### Modal de EDITAR (`ExistingPresentacionCard.tsx`, modo `isEditing = true`)

El mismo campo está implementado como un **`<Input>` de texto plano**:

```tsx
<Input
  id='edit-pres-nombre'
  value={editPresDraft.nombre}
  onChange={e => changeEditPresDraft('nombre', e.target.value)}
  placeholder='Presentación (ej. 750 ml)'
  ...
/>
```

No hay selector de unidad. El usuario tiene que escribir `"750 ml"` a mano.

### Por qué difieren

`ExistingPresentacionCard` fue escrito con un `Input` genérico.
`NewPresentacionRow` fue escrito después con el input compuesto. No hay un
componente compartido para ese campo.

### Estado en el hook (`useProductForm.ts`)

`editPresDraft.nombre` es un `string` plano (igual que `p.nombre` en
`NewPresentacionRow`). La función `changeEditPresDraft('nombre', value)`
simplemente asigna el string tal cual. No requiere cambio en el hook.

### API (`PATCH /api/products/presentations`)

Acepta `nombre` como string en el body JSON. No requiere cambios.

### Schema Zod (`lib/business/schemas/product.ts` → `PresentacionSchema`)

`nombre: z.string().trim().min(1).max(100)` — acepta cualquier string. No
requiere cambios.

---

## Solución

Extraer el input compuesto de `NewPresentacionRow` a un componente compartido
`PresentacionNombreInput` y usarlo en `ExistingPresentacionCard` en lugar del
`<Input>` plano.

**Decisión de diseño:** extraer en un nuevo componente en lugar de duplicar la
lógica, porque ambas rutas (crear y editar) terminan produciendo/consumiendo el
mismo `string` (`"750 ml"`). El componente recibe `value: string` y emite
`onChange(value: string)`, lo que encaja sin modificar el hook.

---

## Archivos a crear / modificar

| Archivo                                            | Acción                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `components/products/PresentacionNombreInput.tsx`  | **CREAR** — componente extraído                                    |
| `components/products/NewPresentacionRow.tsx`       | **MODIFICAR** — importar y usar el nuevo componente                |
| `components/products/ExistingPresentacionCard.tsx` | **MODIFICAR** — reemplazar `<Input>` plano por el nuevo componente |

---

## Items del plan

- [ ] 1. Crear `components/products/PresentacionNombreInput.tsx`

  Extraer la lógica del input compuesto de `NewPresentacionRow`. El componente
  acepta:

  ```ts
  interface PresentacionNombreInputProps {
    value: string; // el string completo, ej. "750 ml"
    onChange: (value: string) => void;
    disabled?: boolean;
    id?: string;
  }
  ```

  Internamente re-usa las constantes `PRESENTACION_UNIDADES`, el type
  `PresentacionUnidad`, y la función `splitNombre` (moverlas aquí desde
  `NewPresentacionRow`). El JSX es exactamente el bloque `div.flex.h-11` con el
  `<Input>` numérico y el `<Select>` de unidades que ya existe en
  `NewPresentacionRow`.

  El componente gestiona un estado local `unidad` (igual que hoy en
  `NewPresentacionRow`) y sincroniza con `value` via `useEffect` cuando
  `splitNombre(value).unidad` cambia.

  **Archivo a crear:** `components/products/PresentacionNombreInput.tsx`

  **Verify:** `corepack pnpm typecheck` — sin errores de tipo en el nuevo
  archivo.

- [ ] 2. Actualizar `NewPresentacionRow.tsx` para usar `PresentacionNombreInput`

  - Eliminar `PRESENTACION_UNIDADES`, `PresentacionUnidad`, `esUnidad`,
    `splitNombre`, el estado `unidad` y el `useEffect` de sincronización (quedan
    en el nuevo componente).
  - Reemplazar el bloque `div.flex.h-11...` del input compuesto por:
    ```tsx
    <PresentacionNombreInput
      value={p.nombre}
      onChange={value => onUpdate('nombre', value)}
      disabled={isLoading}
    />
    ```
  - Ajustar imports: añadir `PresentacionNombreInput`, eliminar `Select`,
    `SelectContent`, `SelectItem`, `SelectTrigger`, `Ruler` si ya no se usan.

  **Archivo a modificar:** `components/products/NewPresentacionRow.tsx`

  **Verify:** `corepack pnpm typecheck` — sin errores; comportamiento del modal
  de crear no debe cambiar.

- [ ] 3. Actualizar `ExistingPresentacionCard.tsx` para usar
      `PresentacionNombreInput`

  En el bloque `isEditing`, reemplazar el campo "Presentación":

  ```tsx
  // ANTES:
  <Input
    id='edit-pres-nombre'
    value={editPresDraft.nombre}
    onChange={e => changeEditPresDraft('nombre', e.target.value)}
    placeholder='Presentación (ej. 750 ml)'
    disabled={isLoading || guardandoPres}
    className='h-10 bg-white dark:bg-slate-900'
  />

  // DESPUÉS:
  <PresentacionNombreInput
    id='edit-pres-nombre'
    value={editPresDraft.nombre}
    onChange={value => changeEditPresDraft('nombre', value)}
    disabled={isLoading || guardandoPres}
  />
  ```

  El label existente (`htmlFor='edit-pres-nombre'`) sigue funcionando porque el
  `id` se pasa al `<Input>` numérico interno del componente.

  **Archivo a modificar:** `components/products/ExistingPresentacionCard.tsx`

  **Verify:** `corepack pnpm typecheck` — sin errores de tipo.

---

## Verificación final

Ejecutar en orden:

```bash
corepack pnpm typecheck
corepack pnpm lint:full
corepack pnpm test:unit
corepack pnpm build
```

Todos deben pasar sin errores.

---

## Notas adicionales

- **No cambia el hook `useProductForm`**: `editPresDraft.nombre` sigue siendo un
  `string`. `changeEditPresDraft('nombre', value)` ya asigna el valor tal cual
  (no formatea números para este campo). Compatible con el nuevo componente.
- **No cambia la API ni el schema Zod**: el campo `nombre` de la presentación
  sigue siendo un string `"750 ml"`.
- **El `id` del label**: el componente `PresentacionNombreInput` debe exponer el
  `id` prop y aplicarlo al `<Input>` numérico interno para que el
  `<label htmlFor='edit-pres-nombre'>` del `ExistingPresentacionCard` siga
  siendo accesible.
- **Tests existentes**: no hay tests unitarios para `ExistingPresentacionCard`
  ni `NewPresentacionRow` en `tests/`. `corepack pnpm test:unit` valida que nada
  regrese roto.
