# Plan — Bar · Tab Colaciones: listado condicional de bebidas analcohólicas + eliminación de campos

Alcance: el **tab de colaciones del módulo bar**, que vive en
`components/bar/ColacionesTab.tsx` (renderizado por `app/bar/page.tsx` en el
`TabsContent value='colaciones'`). No se toca la página paralela
`app/colaciones/page.tsx` (ruta `/colaciones`, flujo de trago) salvo lo que ya
comparte de forma segura.

## Decisiones de diseño (fundamentadas en el código leído)

- **Qué es el "select de bebidas tragos" a eliminar**: el `SearchableSelect` de
  "Bebida" con estado `drinkId` en `ColacionesTab`, que carga
  `/api/products/for-sale?solo_colaciones=true`. Esas presentaciones son tragos:
  el filtro `solo_colaciones` en `modules/inventario/catalogo/repositorio.ts`
  exige
  `opcion->>'tipo' = 'botella' AND opcion->>'colacion_habilitada' = 'true'` sin
  filtrar categoría. **Qué es el "input de Ml de bebida analcohólica" a
  eliminar**: el `<Input id='bar-colacion-ml'>` con estado `mlBebida`.
- **"Bebidas analcohólicas disponibles para colación"**: presentaciones de la
  categoría `system_key = 'bebidas_analcoholicas'` (categoría protegida por las
  migraciones 076/077/078/089) que tengan una opción `tipo='botella'` con
  `colacion_habilitada='true'` y stock activo en el bar. Se reusa el flag
  `colacion_habilitada` (ya expuesto en `SettingsSaleOptionsEditor` para todo
  no-cigarrillo, incluidas las analcohólicas: `onColacionHabilitadaChange` se
  pasa salvo `esCig`, y al guardar `...(esCig ? {} : { colacion_habilitada })`).
  Se sigue el patrón exacto del filtro `solo_cover` del propio repositorio
  (`c.system_key = 'bebidas_analcoholicas' AND EXISTS(... 'cover_habilitado')`),
  cambiando `cover_habilitado` por `colacion_habilitada`.
- **No existe aún** esa consulta: `solo_colaciones` no filtra por categoría, así
  que se **crea** un nuevo filtro `solo_colaciones_analcoholicas` en
  `listarParaVenta` (infraestructura pública de catálogo del módulo inventario,
  reutilizando el endpoint `for-sale` que ya consume el tab). No se duplica
  query en el módulo colaciones.
- **Rol del trabajador seleccionado**: ya viene en `worker.role` desde
  `/api/users` (`UserRepository.getAll` mapea `r.nombre AS rol_nombre` → campo
  `role`; los roles son minúsculas: cajero, garzon, barman, anfitriona,
  administrador — ver `registro.ts` y los `LOWER(r.nombre)`). La condicional se
  evalúa en el cliente sobre el trabajador seleccionado; **no** se añade
  restricción de rol en el servidor para no alterar el flujo de
  `app/colaciones/page.tsx` que comparte `registrarColacion`.
- **`registrarColacion`** (`modules/colaciones/repositorio.ts`) ya valida que la
  bebida tenga `colacion_habilitada='true'` en una opción botella (sin filtrar
  categoría) y stock en bar; una analcohólica con ese flag **pasa sin tocar esa
  validación**. El acompañamiento queda en `null` (las analcohólicas son
  simples, `acompanamiento.unidades = 0`, y la validación exige
  `acompanamiento = null` cuando `unidades = 0`). Solo se **relaja** la
  validación de `ml_bebida` para admitir 0: la columna es
  `integer NOT NULL DEFAULT 0 CHECK (ml_bebida BETWEEN 0 AND 10000)` (migración
  083), así que 0 es válido en BD; el código exige `>= 1`. El ml se deriva del
  `ml_botella` de la bebida analcohólica (o 0 si no tiene) y se envía sin input
  visible.
- **Sin tocar BD ni migraciones**: no se alteran columnas ni se crean
  migraciones. La tabla de registros se conserva (muestra `ml_bebida` y
  `acompanamiento` históricos). Se limpia código muerto resultante (estado,
  imports, tipo `Drink`) sin romper a `app/colaciones/page.tsx`, que importa
  `SearchableSelect` de `ColacionesTab` → **no se cambia la firma ni se
  elimina** ese componente exportado.
- **Sin tocar el bloque `nextjs-agent-rules`** de `AGENTS.md`.

## Plan

- [ ] 1. Añadir el filtro `solo_colaciones_analcoholicas` al catálogo de venta
      (`listarParaVenta`). **Qué**: en
      `modules/inventario/catalogo/repositorio.ts` agregar
      `solo_colaciones_analcoholicas?: boolean` a la interfaz `FiltrosParaVenta`
      y un fragmento estático (sin parámetros) `whereColacionAnalcoholica`
      calcado de `whereCover` pero con `colacion_habilitada` en vez de
      `cover_habilitado`:
      `AND c.system_key = 'bebidas_analcoholicas' AND EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(p.opciones_venta::jsonb, '[]'::jsonb)) opcion WHERE opcion->>'tipo' = 'botella' AND opcion->>'colacion_habilitada' = 'true')`,
      concatenado en el `WHERE` junto a `${whereColacion} ${whereCover}` (el
      `EXISTS` de stock en bar ya está en el `WHERE` base). En
      `modules/inventario/productos/fachada.ts`, `ProductService.listForSale`,
      agregar `solo_colaciones_analcoholicas?: boolean` al tipo inline de
      `filters` (pasa el objeto tal cual a `listarParaVenta`). En
      `app/api/products/for-sale/route.ts`, agregar
      `solo_colaciones_analcoholicas: searchParams.get('solo_colaciones_analcoholicas') === 'true'`
      al objeto que se pasa a `ProductService.listForSale`. **Archivos**:
      `modules/inventario/catalogo/repositorio.ts`,
      `modules/inventario/productos/fachada.ts`,
      `app/api/products/for-sale/route.ts`. **Verificar**:
      `corepack pnpm typecheck` pasa (sin errores de tipos en la cadena
      `FiltrosParaVenta` → `listForSale` → ruta).

- [ ] 2. Relajar la validación de `ml_bebida` en `registrarColacion` para
      admitir 0 (coincidir con el `CHECK` de BD `BETWEEN 0 AND 10000`). **Qué**:
      en `modules/colaciones/repositorio.ts`, cambiar `input.mlBebida < 1` por
      `input.mlBebida < 0` en la validación de `registrarColacion` y actualizar
      el mensaje a `'Indica entre 0 y 10000 ml para la bebida'`. No tocar la
      validación de bebida (ya acepta `colacion_habilitada=true`) ni la de
      acompañamiento. **Archivos**: `modules/colaciones/repositorio.ts`.
      **Verificar**: `corepack pnpm typecheck` pasa.

- [ ] 3. Agregar pruebas unitarias para el nuevo filtro y la relajación de ml.
      **Qué**: en `tests/unit/lib/repositories/ForSaleParameters.test.ts`
      agregar un caso `it` que llame
      `listarParaVenta({ solo_colaciones_analcoholicas: true })` y afirme que
      `query` fue llamada con un SQL que contiene `bebidas_analcoholicas` y
      `colacion_habilitada` y con params `[]` (el fragmento no añade parámetros;
      `prepareQuery` valida el bind). Crear
      `tests/unit/modules/colaciones.test.ts` con el patrón de
      `tests/unit/modules/compras.test.ts`: mock de `@/lib/database/db`
      (`query: vi.fn()`, `generateUUID: () => 'col-1'`,
      `withTransaction: vi.fn(async () => { throw new Error('REACHED_TX') })`) y
      de `@/lib/business/timezoneService`
      (`getNowInBusinessTimezone: () => '2025-01-01 12:00:00'`); importar
      `registrarColacion` de `@/modules/colaciones` y `ValidationError` de
      `@/lib/errors/errors`. Afirmar que
      `registrarColacion({ usuarioId:'w', registradoPor:'r', presentacionId:'p', nombreBebida:'n', mlBebida:0, acompanamiento:null })`
      **alcanza la transacción** (rechaza con `REACHED_TX`, lo que prueba que
      ml=0 pasó la validación), y que `mlBebida:-1` y `mlBebida:10001` rechazan
      con `ValidationError` sin llamar a `withTransaction`
      (`expect(withTransaction).not.toHaveBeenCalled()`). **Archivos**:
      `tests/unit/lib/repositories/ForSaleParameters.test.ts`,
      `tests/unit/modules/colaciones.test.ts` (nuevo). **Verificar**:
      `corepack pnpm test:unit` pasa (nuevas y existentes).

- [ ] 4. Rehacer el formulario de `ColacionesTab` (tab del bar): eliminar ml y
      trago, listar analcohólicas condicionalmente por rol. **Qué**: en
      `components/bar/ColacionesTab.tsx`: - **Estado**: quitar `drinkId`,
      `mlBebida`, `accompaniment`; agregar `bebidaAnalcoholicaId`. (Quedan
      `workers, drinks, records, workerId,       loading, saving`.) - **Tipo
      `Drink`**: quitar `opciones_venta` (ya sin uso); dejar
      `presentacion_id, presentacion_nombre, producto_nombre, ml_botella`. -
      **`load()`**: cambiar el fetch de bebidas de
      `/api/products/for-sale?solo_colaciones=true` a
      `/api/products/for-sale?solo_colaciones_analcoholicas=true`; renombrar el
      `setDrinkId(...)` de auto-selección a `setBebidaAnalcoholicaId(...)`. -
      **Derivados**: quitar `selectedDrink`/`bottle`/`accompanimentConfig`/
      `accompanimentUnits` y el `useEffect` que setea `accompaniment`/`mlBebida`
      (código muerto tras quitar el trago). Agregar
      `const selectedWorker = workers.find(w => w.id === workerId);` y
      `const esRolColacion = !!selectedWorker && ['cajero','garzon','barman'].includes((selectedWorker.role ?? '').toLowerCase());`. -
      **`register()`**: validar `workerId`; si `!esRolColacion` -> toast
      `'Este rol no recibe colación de bebida analcohólica'` (salvaguarda);
      `selectedDrink = drinks.find(d => d.presentacion_id === bebidaAnalcoholicaId)`;
      si `!selectedDrink` -> toast `'Selecciona una bebida analcohólica'`;
      `const ml = Number(selectedDrink.ml_botella ?? 0) || 0;`; POST a
      `/api/colaciones` con
      `{ usuario_id: workerId, presentacion_id: bebidaAnalcoholicaId, ml_bebida: ml, nombre_bebida: \`${selectedDrink.producto_nombre}
      ${selectedDrink.presentacion_nombre}\`.trim(), acompanamiento: null
      }`.       En éxito: `setWorkerId('')`y recargar.     - **JSX del form**: eliminar el bloque`<Input id='bar-colacion-ml'>`      ("Ml de bebida analcohólica"), el bloque`SearchableSelect` de "Bebida"       (`bar-colacion-bebida`) y el bloque condicional de "Acompañamiento".       Agregar, **solo cuando `esRolColacion`**, un bloque       `<Label>`"Bebidas analcohólicas" +`SearchableSelect`       (`id='bar-colacion-analcoholica'`, `value={bebidaAnalcoholicaId}`,       `onChange={setBebidaAnalcoholicaId}`, opciones desde `drinks`como      `{
      value: drink.presentacion_id, label: \`${drink.producto_nombre} ·
      ${drink.presentacion_nombre}\`, keywords:[...] }`).       Cuando `workerId
      &&
      !esRolColacion`mostrar un`<p>`informativo:       "Este rol no recibe colación de bebida analcohólica." Botón "Registrar       corto" con`disabled={saving
      || loading || !hasOpenCaja || !workerId || !esRolColacion ||
      !bebidaAnalcoholicaId}`.       Actualizar el empty-state a que mencione "bebidas analcohólicas       habilitadas para colación" cuando `drinks.length
      === 0 && !loading`.     - **Limpieza de imports**: quitar `import { Input
      } from
      '@/components/ui/input'`      (queda sin uso). **No tocar** el componente exportado`SearchableSelect`      (lo usa`app/colaciones/page.tsx`). Conservar la tabla de registros y el     filtro `attended`sin cambios.     **Archivos**:`components/bar/ColacionesTab.tsx`.     **Verificar**: `corepack
      pnpm typecheck`y`corepack pnpm lint:full`    pasan (sin`Input` sin usar,
      sin estado/derivados muertos, tipos OK).

- [ ] 5. Agregar prueba de componente para el listado condicional por rol.
      **Qué**: crear `tests/unit/components/ColacionesTab.test.tsx` con
      @testing-library/react. Mockear `@/hooks/caja/useCashRegisterStatus`
      (`{ hasOpenCaja: true, cajaInfo: { id_caja: 'c1' } }`),
      `@/hooks/auth/useUserPermissions` (`{ hasPermission: () => true }`) y el
      `fetch` global (con `vi.stubGlobal('fetch', vi.fn())`) para devolver, en
      orden, usuarios (`/api/users?...` con un cajero y una anfitriona activos,
      sin administrador), bebidas
      (`/api/products/for-sale?solo_colaciones_analcoholicas=true` con al menos
      una analcohólica) y registros (`/api/colaciones?...` vacíos). Renderizar
      `<ColacionesTab />`, abrir el combobox de "Trabajador" y seleccionar al
      cajero (patrón Radix/cmdk de
      `tests/unit/components/TransferModal.test.tsx`: click en el trigger,
      escribir en el `CommandInput`, click en el `CommandItem`); afirmar que
      aparece el label "Bebidas analcohólicas". Repetir seleccionando a la
      anfitriona y afirmar que el label **no** está en el documento
      (`queryByText` nulo) y que el botón "Registrar corto" está deshabilitado.
      Seguir el `setup`/`cleanup` de jsdom del proyecto. **Archivos**:
      `tests/unit/components/ColacionesTab.test.tsx` (nuevo). **Verificar**:
      `corepack pnpm test:unit` pasa.

- [ ] 6. Verificación final cruzada (build + tests de integración por tocar
      flujos con BD). **Qué**: correr la secuencia de verificación del proyecto.
      Como se tocaron flujos con base de datos (`registrarColacion` y
      `listarParaVenta`), correr también el suite legacy de DB. **Verificar**:
      `corepack pnpm typecheck` (exit 0); `corepack pnpm lint:full` (exit 0);
      `corepack pnpm test:unit` (exit 0); `corepack pnpm build` ("Build
      completed successfully"); `corepack pnpm test:integration:legacy-db` (exit
      0; requiere la BD legacy disponible; si no lo está, registrarlo y dejar el
      resto de la verificación en verde). Adicional:
      `corepack pnpm arquitectura:limites` no reporta imports privados entre
      módulos ni ciclos nuevos (la UI llama vía HTTP a `/api/products/for-sale`;
      `registrarColacion` ya leía `inventario_presentaciones`).

## Notas para el implementador

- El flag a usar es `colacion_habilitada` (no `cover_habilitado`) porque es el
  que ya valida `registrarColacion` y el que el editor ya expone para
  analcohólicas; así no se toca la validación de bebida del módulo colaciones.
- Si ninguna analcohólica tiene `colacion_habilitada=true` con stock, la lista
  sale vacía y el botón queda deshabilitado: es el comportamiento esperado (el
  admin debe habilitarlas desde Configuraciones → presentación → opción botella
  → "Habilitar bebida para colación").
- `app/colaciones/page.tsx` queda sin cambios: sigue con su flujo de trago y su
  validación client-side `ml 1..10000`; la relajación a `0` del servidor no la
  afecta (su cliente nunca envía 0).
- No modificar `AGENTS.md` (el bloque `nextjs-agent-rules` lo reescribe
  `next dev`).
