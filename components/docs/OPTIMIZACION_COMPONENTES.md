# Optimización de Componentes - Plan de Acción

## Objetivo

Optimizar los componentes más grandes y complejos del sistema para mejorar
performance, mantenibilidad y experiencia de desarrollo.

## Componentes Identificados (Top 20)

> **Inventario re-medido el 2026-09-28**
> (`find components app -name '*.tsx' | xargs wc -l`). Varios nombres de la
> lista original ya no existen o ya fueron refactorizados: `OrderDetailModal`
> 925 → **262**, `UserTable` 629 → **228**, `EditServiceModal` 606 → **149**,
> `AgregarProductosModal` 622 → **418**, `sidebar` 709 → **306**,
> `CommissionsReport` 424 → **87**, `OrderForm` 420 → **166**,
> `CategoryProductsModal` 522 → **192**, `productModal`/`UserForm`/
> `SolicitudesServiciosList` y los 3 calendarios fueron eliminados o
> reemplazados por `components/shared/calendar/`.

### 🔴 Críticos (>600 líneas)

1. ~~**TransferModal.tsx** - 802 líneas~~ → ✅ **145** (refactor 2026-09-28, ver
   más abajo)
2. ~~**SaleProductModal.tsx** - 675 líneas~~ → ✅ **157** (refactor 2026-09-28,
   ver más abajo)
3. ~~**NewPrivateRoomPageClient.tsx** - 603 líneas~~ → ✅ **103** (refactor
   2026-09-28, ver más abajo)

### 🟡 Importantes (500-700 líneas)

4. **Skeletons.tsx** - 556 líneas
5. **ClientTable.tsx** - 524 líneas
6. ~~**CajaDetails.tsx** - 519 líneas~~ → ✅ **143** (refactor 2026-09-28, ver
   más abajo)
7. **MiniSalesChart.tsx** - 515 líneas

### 🟢 Moderados (400-500 líneas)

8. **ServiceOrderFormNew.tsx** - 495 líneas
9. **PurchaseForm.tsx** - 479 líneas
10. **CalendarDayModal.tsx** - 473 líneas
11. **ProductTable.tsx** - 465 líneas
12. **CobrarCuentaModal.tsx** - 463 líneas
13. **AttendanceEmployeeList.tsx** - 452 líneas
14. **CuentaDetailModal.tsx** - 443 líneas
15. **ContainerReturnsPanel.tsx** - 426 líneas
16. **ProductForm.tsx** - 418 líneas
17. **AgregarProductosModal.tsx** - 418 líneas
18. **RoomTable.tsx** - 404 líneas
19. **PayrollCalendarDataModal.tsx** - 403 líneas

## Estrategias de Optimización

### 1. **Separación de Componentes**

- Dividir componentes grandes en sub-componentes más pequeños
- Extraer secciones lógicas a componentes independientes
- Crear componentes reutilizables

### 2. **React.memo**

- Aplicar `React.memo` a componentes que reciben props estables
- Evitar re-renders innecesarios
- Usar `useMemo` y `useCallback` apropiadamente

### 3. **Extracción de Lógica**

- Mover lógica compleja a hooks personalizados
- Separar lógica de presentación
- Crear hooks de negocio específicos

### 4. **Optimización de Renders**

- Identificar y eliminar re-renders innecesarios
- Usar keys apropiadas en listas
- Evitar funciones inline en props

### 5. **Code Splitting**

- Lazy loading de componentes pesados
- Dynamic imports para modales
- Suspense boundaries

## Prioridades

### Fase 1: Componentes Críticos (Semana 1)

- [x] OrderDetailModal.tsx — ✅ ya reducido a 262 líneas
- [x] ~~CajaDetails.tsx (519)~~ — ✅ cerrado 2026-09-28 (143 líneas) ·
      ~~NewPrivateRoomPageClient.tsx (603)~~ — ✅ cerrado 2026-09-28 (103
      líneas)
- [x] Calendarios (Garzon, Cajero, Anfitriona) — ✅ sustituidos por
      `components/shared/calendar/`

### Fase 2: Componentes Importantes (Semana 2)

- [x] header.tsx — ✅ ya no existe como archivo monolítico (partido en
      `components/header/*`)
- [x] **UserForm.tsx** - ✅ COMPLETADO
- [x] **UserTable.tsx** - ✅ COMPLETADO
- [x] **AgregarProductosModal.tsx** - ✅ COMPLETADO
- [x] **EditServiceModal.tsx** - ✅ COMPLETADO
- [ ] Modales grandes restantes

### Fase 3: Componentes Moderados (Semana 3)

- [ ] Resto de componentes >400 líneas

---

## Componentes Optimizados

### 1. UserForm.tsx ✅

**Antes**: 705 líneas  
**Después**: 450 líneas  
**Reducción**: 36% (255 líneas eliminadas)

**Optimizaciones aplicadas**:

1. **Componentes extraídos**:
   - `FormFieldWithIcon` - Campo de formulario reutilizable con icono (30
     líneas)
   - `ImageUploadField` - Manejo completo de carga de imagen (95 líneas)
   - `NumberInputField` - Campo numérico con formato (45 líneas)

2. **Hook personalizado**:
   - `useNumberFormatter` - Lógica de formateo de números con separadores de
     miles (30 líneas)

3. **Mejoras de performance**:
   - `useCallback` para funciones de mapeo de estado civil
   - `useMemo` para defaultValues del formulario
   - `React.memo` en todos los componentes extraídos
   - Eliminación de código duplicado de formateo

4. **Beneficios**:
   - Código más limpio y mantenible
   - Componentes reutilizables en otros formularios
   - Mejor separación de responsabilidades
   - Menos re-renders innecesarios
   - Testing más fácil (componentes aislados)

**Archivos creados**:

- `components/users/FormFieldWithIcon.tsx`
- `components/users/ImageUploadField.tsx`
- `components/users/NumberInputField.tsx`
- `hooks/shared/useNumberFormatter.ts`

**API pública**: 100% compatible - sin breaking changes

### 2. UserTable.tsx ✅

**Antes**: 644 líneas  
**Después**: 220 líneas  
**Reducción**: 66% (424 líneas eliminadas)

**Optimizaciones aplicadas**:

1. **Componentes extraídos**:
   - `UserActionMenu` - Menú de acciones con permisos (120 líneas)
   - `UserInfoDisplay` - Información del usuario (card/table variants) (180
     líneas)
   - `UserContactInfo` - Información de contacto (30 líneas)
   - `UserFinancialInfo` - Información financiera (35 líneas)

2. **Mejoras de performance**:
   - `useMemo` para permisos y hasAnyAction
   - `React.memo` en todos los componentes extraídos
   - Eliminación de código duplicado entre mobile/desktop views
   - Componentes con variantes (card/table) para reutilización

3. **Beneficios**:
   - Código más limpio y mantenible
   - Componentes reutilizables en otras tablas
   - Mejor separación de responsabilidades
   - Menos re-renders innecesarios
   - Lógica de permisos centralizada

**Archivos creados**:

- `components/users/UserActionMenu.tsx`
- `components/users/UserInfoDisplay.tsx`
- `components/users/UserContactInfo.tsx`
- `components/users/UserFinancialInfo.tsx`

**API pública**: 100% compatible - sin breaking changes

### 3. AgregarProductosModal.tsx ✅

**Antes**: 622 líneas  
**Después**: 449 líneas  
**Reducción**: 28% (173 líneas eliminadas)

**Optimizaciones aplicadas**:

1. **Componentes extraídos**:
   - `ProductCartTable` - Tabla de productos en carrito (130 líneas)
   - `CartSummary` - Resumen y botón de agregar (35 líneas)

2. **Hook personalizado**:
   - `useProductCart` - Lógica completa del carrito de productos (110 líneas)
   - Manejo de agregar, actualizar, eliminar productos
   - Cálculo automático de totales
   - Normalización de productos de diferentes fuentes

3. **Mejoras de performance**:
   - `useCallback` para todas las funciones del modal
   - `useMemo` para cálculo de totales
   - `React.memo` en componentes extraídos
   - Eliminación de código duplicado de manejo de carrito

4. **Beneficios**:
   - Hook reutilizable para otros carritos de compra
   - Lógica de carrito centralizada y testeable
   - Componentes de tabla y resumen reutilizables
   - Mejor separación de responsabilidades

**Archivos creados**:

- `components/cuentas/ProductCartTable.tsx`
- `components/cuentas/CartSummary.tsx`
- `hooks/shared/useProductCart.ts`

**API pública**: 100% compatible - sin breaking changes

### 4. EditServiceModal.tsx ✅

**Antes**: 606 líneas  
**Después**: 419 líneas  
**Reducción**: 31% (187 líneas eliminadas)

**Optimizaciones aplicadas**:

1. **Componentes extraídos**:
   - `ServiceFormFields` - Todos los campos del formulario (180 líneas)
   - `ServicePriceSummary` - Resumen de precios y totales (60 líneas)

2. **Hook personalizado**:
   - `useServicePricing` - Lógica completa de cálculo de precios, IVA y totales
     (85 líneas)
   - Cálculo automático de multiplicadores de tiempo
   - Manejo de IVA con redondeo a $5.000
   - Cálculo de totales por anfitriona

3. **Mejoras de performance**:
   - Reutilización de `useNumberFormatter` para formateo de precios
   - `useMemo` para todos los cálculos de precios
   - `useCallback` para handlers de cambio
   - `React.memo` en componentes extraídos
   - Eliminación de código duplicado de formateo

4. **Beneficios**:
   - Hook de pricing reutilizable para otros modales de servicios
   - Componentes de formulario y resumen reutilizables
   - Lógica de cálculo centralizada y testeable
   - Mejor separación de responsabilidades
   - Código más limpio y mantenible

**Archivos creados**:

- `components/servicios/ServiceFormFields.tsx`
- `components/servicios/ServicePriceSummary.tsx`
- `hooks/shared/useServicePricing.ts`

**API pública**: 100% compatible - sin breaking changes

### 5. productModal.tsx ✅

**Antes**: 562 líneas  
**Después**: 358 líneas  
**Reducción**: 36% (204 líneas eliminadas)

**Optimizaciones aplicadas**:

1. **Componentes extraídos**:
   - `ProductGridCard` - Card de producto para vista de cuadrícula (95 líneas)
   - `ProductTableRow` - Fila de producto para vista de tabla (75 líneas)
   - `QuantityControl` - Control de cantidad reutilizable (55 líneas)

2. **Hook personalizado**:
   - `useProductSelection` - Lógica completa de selección de productos (70
     líneas)
   - Manejo de selección múltiple
   - Cálculo de totales seleccionados
   - Agregado en lote

3. **Mejoras de performance**:
   - `useMemo` para cálculos de totales
   - `useCallback` para handlers
   - `React.memo` en todos los componentes extraídos
   - Eliminación de código duplicado entre vistas

4. **Beneficios**:
   - Componentes de producto reutilizables en otros modales
   - Hook de selección reutilizable
   - Control de cantidad genérico
   - Mejor separación de responsabilidades
   - Código más limpio y mantenible

**Archivos creados**:

- `components/ui/ProductGridCard.tsx`
- `components/ui/ProductTableRow.tsx`
- `components/ui/QuantityControl.tsx`
- `hooks/shared/useProductSelection.ts`

**API pública**: 100% compatible - sin breaking changes

### 6. TransferModal.tsx ✅ (2026-09-28)

**Antes**: 802 líneas  
**Después**: 145 líneas  
**Reducción**: 82% (657 líneas fuera del componente)

**Optimizaciones aplicadas**:

1. **Hooks personalizados**:
   - `useTransferForm` (212 líneas) - estado completo, carga de configuración
     guardada y de precios champagne al abrir, valores derivados de shot
     (`etiquetaShot`, `mlPorShot`) y `reset`
   - `useTransferSubmit` (189 líneas) - validación, PUT de ml por shot, PUT de
     tabla champagne y POST del traspaso; expone `saving` e `isSubmitting()`
2. **Componentes extraídos** (todos con `React.memo`):
   - `TransferItemSummary` - ficha con foto, stock y configuración de la
     presentación
   - `SavedConfigPanel` - bloque «Configuración guardada» con ml por shot
     editables
   - `SaleTypeEditor` - toggle botella/shot, campos de precio/comisión y ayuda
   - `ChampagneTiersReadonly` / `ChampagneTiersEditor` - tabla champagne en sus
     2 variantes
   - `TransferFooter` - cancelar / traspasar con estado de guardado
3. **Módulo de helpers puros**: `components/bar/transfer/transferOptions.ts`
   (`parseSavedOptions`, `esChampagne`, `formatMiles`, `formatNumber` y los
   tipos `BarStockItem` / `TransferModalProps`)

**Notas**:

- Guard de cierre durante el envío preservado: el ref `submitting` vive en
  `useTransferSubmit` (la regla `react-hooks/immutability` prohíbe mutar refs
  recibidas como argumento) y el modal consulta `isSubmitting()`.
- `TransferModal.tsx` sigue exportando `parseSavedOptions`, `esChampagne`,
  `formatMiles`, `formatNumber`, `BarStockItem` y `TransferModalProps` → **API
  pública 100% compatible** (`app/bar/page.tsx`, `app/transfers/page.tsx`,
  `SalePrices`, `BarAnfitrionas` sin cambios).
- Verificación: `tsc --noEmit` 0 · eslint 0 · **unit 1063/1063** (los 7 tests de
  `TransferModal.test.tsx` pasan sin tocar el test).

**Archivos creados**:

- `components/bar/transfer/transferOptions.ts`
- `components/bar/transfer/TransferItemSummary.tsx`
- `components/bar/transfer/SavedConfigPanel.tsx`
- `components/bar/transfer/SaleTypeEditor.tsx`
- `components/bar/transfer/ChampagneTiers.tsx`
- `components/bar/transfer/TransferFooter.tsx`
- `hooks/shared/useTransferForm.ts`
- `hooks/shared/useTransferSubmit.ts`

### 7. SaleProductModal.tsx ✅ (2026-09-28)

**Antes**: 675 líneas  
**Después**: 157 líneas  
**Reducción**: 77% (518 líneas fuera del componente)

**Optimizaciones aplicadas**:

1. **Hook personalizado**:
   - `useSaleProductModal` (128 líneas) - vista tabla/tarjetas, búsqueda con
     reset de página, paginación (5/página), tipo de venta por presentación,
     búsqueda de anfitrionas por producto, `useConfigValue('bar', 'shot_ml')` y
     el modelo de vista (`items`) de la página actual
2. **Módulo de modelo de vista puro**:
   - `saleProductItems.ts` (160 líneas) - `SaleProductItem` +
     `buildSaleProductItem`: resuelve `resolverVentaProducto`, reglas de
     comisión/anfitriona (`hasCommission`, `hostessAllowedForPrice`), unidades
     en carrito por tipo de venta, límites, `totalAgregar` y todos los callbacks
     atados al producto (antes todo eso vivía en un `.map()` de 250 líneas
     mezclado con JSX)
3. **Componentes extraídos** (en `components/sales/product-modal/`):
   - `SaleProductPhoto` - foto con fallback a `default.png`
   - `SaleProductViewToggle` - conmutador Tabla/Tarjetas del encabezado
   - `SaleProductSearch` - barra de búsqueda con botón limpiar
   - `SaleProductDetails` - nombre, stock en bar, badge «En carrito», botella
     abierta y botones de tipo de venta
   - `SaleProductHostess` - la 3 variantes (champagne / bebida cara /
     individual) + chip «Sin comisión»
   - `SaleProductPrice` / `SaleProductCommission` / `SaleProductQuantity`
     (`SaleProductCells`) - celdas compartidas por tabla y tarjeta
   - `SaleProductTable` - la tabla con las cabeceras `CUENTA_TABLE_*`
   - `SaleProductCards` - la grilla de tarjetas

**Notas**:

- `SaleProductModal.tsx` conserva el `export default` y la interfaz
  `SaleProductModalProps` idénticos → **API pública 100% compatible**
  (`app/sales/new/page.tsx` y `AgregarProductosModal` sin cambios).
- Los módulos que mockea el test (`@/components/orders`,
  `@/components/orders/productModalRules`, `@/components/shared/selects`,
  `@/hooks/shared/useConfigValue`, `next/image`) se importan desde los mismos
  paths de antes → el test pasó sin tocarlo.
- Verificación: `tsc --noEmit -p tsconfig.typecheck.json` 0 · eslint full 0 ·
  **unit 1063/1063** (los 5 tests de `SaleProductModal.test.tsx` pasan sin tocar
  el test).

**Archivos creados**:

- `hooks/shared/useSaleProductModal.ts`
- `components/sales/product-modal/saleProductItems.ts`
- `components/sales/product-modal/SaleProductPhoto.tsx`
- `components/sales/product-modal/SaleProductViewToggle.tsx`
- `components/sales/product-modal/SaleProductSearch.tsx`
- `components/sales/product-modal/SaleProductCells.tsx`
- `components/sales/product-modal/SaleProductDetails.tsx`
- `components/sales/product-modal/SaleProductHostess.tsx`
- `components/sales/product-modal/SaleProductTable.tsx`
- `components/sales/product-modal/SaleProductCards.tsx`

### 8. CajaDetails.tsx ✅ (2026-09-28)

**Antes**: 519 líneas  
**Después**: 143 líneas  
**Reducción**: 72% (376 líneas fuera del componente)

**Optimizaciones aplicadas**:

1. **Hook personalizado**:
   - `useCajaDetailsView` (150 líneas) - envuelve `useCajaDetails`
     (datos/búsquedas/paginación intactos) y añade la capa de vista: números
     derivados, estado, contexto de exportación compartido por Imprimir/PDF,
     contadores de tabs y colapso de la barra de estadísticas
2. **Módulo de modelo puro**:
   - `cajaDetailsModel.ts` (156 líneas) - `buildCajaDetailsNumbers` (los 16
     números derivados de la caja + `distribucionDinero`), `getEstadoInfo`,
     `buildCajaExportContext` (shape de `CajaExportContext`), `retirosTotal`,
     `getDiaSemana` y `printHtml` (Blob URL CSP-safe; antes inline en el render)
3. **Componentes extraídos** (en `components/caja/details/`, registrados en su
   `index.ts`):
   - `CajaDetailsHeader` - título con día + chip de estado + botones
     Imprimir/Exportar PDF
   - `CajaDetailsStatsBar` - barra sticky colapsable (mini-resumen de 3 números
     o desglose de pagos)
   - `CajaDetailsTabs` - pestañas Resumen/Ventas/Servicios/Retiros con
     contadores
   - `CajaDetailsUserCards` - tarjetas «Abierta por» / «Cerrada por» con avatar
     (foto con `?v=imageVersion` o default)
   - `CajaDetailsResumenTab` - tarjetas + `CajaChartsSection` +
     `CajaFinancialDetails` + clientes con prepago pendiente
   - `cajaDetailsPrint.ts` - la constante `printStyles`

**Notas**:

- API pública intacta: `components/caja/index.ts` sigue exportando
  `default as CajaDetails` y `app/cash-register/page.tsx` (carga dinámica) no
  cambia; el hook de datos `useCajaDetails` no se tocó.
- El tab activo se tipa como unión (`CajaDetailsTab`) en la capa de vista;
  `useCajaDetails` lo sigue guardando como string.
- Verificación: `tsc --noEmit -p tsconfig.typecheck.json` 0 · eslint full 0 ·
  **unit 1063/1063**.

**Archivos creados**:

- `components/caja/hooks/useCajaDetailsView.ts`
- `components/caja/details/cajaDetailsModel.ts`
- `components/caja/details/cajaDetailsPrint.ts`
- `components/caja/details/CajaDetailsHeader.tsx`
- `components/caja/details/CajaDetailsStatsBar.tsx`
- `components/caja/details/CajaDetailsTabs.tsx`
- `components/caja/details/CajaDetailsUserCards.tsx`
- `components/caja/details/CajaDetailsResumenTab.tsx`

### 9. NewPrivateRoomPageClient.tsx ✅ (2026-09-28)

**Antes**: 603 líneas  
**Después**: 103 líneas  
**Reducción**: 83% (500 líneas fuera del componente)

**Optimizaciones aplicadas**:

1. **Hook personalizado**:
   - `useServicioForm` (289 líneas) - estado completo de «Datos Servicio»:
     lookup (clientes/anfitrionas/habitaciones + refresh al volver del foco),
     formData, totales vía modelo puro, los 4 efectos (habitación, prepago sin
     cliente, prepago con saldo) y el flujo confirmar → POST `/api/servicios` →
     timer
2. **Módulos puros**:
   - `servicioFormModel.ts` (153 líneas) - `calcularTotalesServicio`
     (multiplicadores por anfitrionas/clientes, IVA tarjeta con redondeo a 5000,
     IVA mixto desde `monto − baseMonto`), `validateServicioForm`,
     `buildServicioPayload` (POST `/api/servicios`),
     `formatNumberWithSeparators`/`parseMonto` y `unirNombresAnfitrionas`
   - `printBoleta.ts` (56 líneas) - impresión de la boleta de habitación
     (ventana + `generateReceiptHTML`)
3. **Componentes extraídos** (en `components/private-rooms/new/`):
   - `ServicioPageHeader` - título + botón Atrás
   - `ServicioSelectsRow` - habitación / anfitrionas / clientes
   - `ServicioPaymentRow` - precio de servicio / método de pago / IVA
   - `ServicioConfirmModal` - confirmación previa al POST

**Notas**:

- API pública intacta: `app/private-rooms/new/page.tsx` sigue importando el
  default sin cambios; `PrivateRoomSummaryCard` y `PagosMixtosSection` se reusan
  tal cual.
- Los 4 efectos y las reglas de negocio (multiplicadores, redondeo, prepago)
  quedaron línea a línea; solo se movieron de lugar.
- Hallazgo: el handler `handleGenerarBoletaHabitacion` existía en el monolito
  pero **ningún botón lo invocaba** (código muerto); se conservó expuesto en el
  hook y en `printBoleta.ts` por si se quiere cablear, sin cambiar el
  comportamiento actual.
- Verificación: `tsc --noEmit -p tsconfig.typecheck.json` 0 · eslint full 0 ·
  **unit 1063/1063**.

**Archivos creados**:

- `hooks/private-rooms/useServicioForm.ts`
- `components/private-rooms/new/servicioFormModel.ts`
- `components/private-rooms/new/printBoleta.ts`
- `components/private-rooms/new/ServicioPageHeader.tsx`
- `components/private-rooms/new/ServicioSelectsRow.tsx`
- `components/private-rooms/new/ServicioPaymentRow.tsx`
- `components/private-rooms/new/ServicioConfirmModal.tsx`

---

## Métricas de Éxito

### Componentes Optimizados: 9/20

- ✅ **UserForm.tsx**: 705 → 450 líneas (36% reducción)
- ✅ **UserTable.tsx**: 644 → 220 líneas (66% reducción)
- ✅ **AgregarProductosModal.tsx**: 622 → 449 líneas (28% reducción)
- ✅ **EditServiceModal.tsx**: 606 → 419 líneas (31% reducción)
- ✅ **productModal.tsx**: 562 → 358 líneas (36% reducción)
- ✅ **TransferModal.tsx**: 802 → 145 líneas (82% reducción) _(2026-09-28)_
- ✅ **SaleProductModal.tsx**: 675 → 157 líneas (77% reducción) _(2026-09-28)_
- ✅ **CajaDetails.tsx**: 519 → 143 líneas (72% reducción) _(2026-09-28)_
- ✅ **NewPrivateRoomPageClient.tsx**: 603 → 103 líneas (83% reducción)
  _(2026-09-28)_

### Componentes Reutilizables Creados: 50

- ✅ **FormFieldWithIcon** - Campo con icono genérico
- ✅ **ImageUploadField** - Carga de imágenes completa
- ✅ **NumberInputField** - Campo numérico con formato
- ✅ **useNumberFormatter** - Hook de formateo de números
- ✅ **UserActionMenu** - Menú de acciones con permisos
- ✅ **UserInfoDisplay** - Información de usuario (2 variantes)
- ✅ **UserContactInfo** - Información de contacto
- ✅ **UserFinancialInfo** - Información financiera
- ✅ **ProductCartTable** - Tabla de carrito de productos
- ✅ **CartSummary** - Resumen de carrito
- ✅ **useProductCart** - Hook de carrito de productos
- ✅ **ServiceFormFields** - Campos de formulario de servicios
- ✅ **ServicePriceSummary** - Resumen de precios de servicios
- ✅ **useServicePricing** - Hook de cálculo de precios de servicios
- ✅ **ProductGridCard** - Card de producto para cuadrícula
- ✅ **ProductTableRow** - Fila de producto para tabla
- ✅ **QuantityControl** - Control de cantidad genérico
- ✅ **useProductSelection** - Hook de selección de productos
- ✅ **TransferItemSummary** - Ficha de la presentación a traspasar
- ✅ **SavedConfigPanel** - Bloque «Configuración guardada»
- ✅ **SaleTypeEditor** - Editor de tipos de venta y precios
- ✅ **ChampagneTiersReadonly** / **ChampagneTiersEditor** - Tabla champagne
- ✅ **TransferFooter** - Acciones del modal
- ✅ **useTransferForm** - Estado del formulario de traspaso
- ✅ **useTransferSubmit** - Envío del traspaso
- ✅ **useSaleProductModal** - Estado del modal de productos de la venta
- ✅ **SaleProductPhoto** - Foto de presentación con fallback
- ✅ **SaleProductViewToggle** - Conmutador Tabla/Tarjetas
- ✅ **SaleProductSearch** - Búsqueda por nombre en la categoría
- ✅ **SaleProductPrice** / **SaleProductCommission** /
  **SaleProductQuantity** - Celdas numéricas compartidas
- ✅ **SaleProductDetails** - Detalle de presentación y tipo de venta
- ✅ **SaleProductHostess** - Selección de anfitriona (3 variantes)
- ✅ **SaleProductTable** - Vista de tabla del modal
- ✅ **SaleProductCards** - Vista de tarjetas del modal
- ✅ **useCajaDetailsView** - Capa de vista del modal de detalles de caja
- ✅ **CajaDetailsHeader** - Cabecera con estado y acciones de exportación
- ✅ **CajaDetailsStatsBar** - Barra de estadísticas colapsable
- ✅ **CajaDetailsTabs** - Pestañas con contadores
- ✅ **CajaDetailsUserCards** - Tarjetas de cajeros (apertura/cierre)
- ✅ **CajaDetailsResumenTab** - Contenido del tab Resumen
- ✅ **useServicioForm** - Estado y flujo de la página Datos Servicio
- ✅ **ServicioPageHeader** / **ServicioSelectsRow** / **ServicioPaymentRow** /
  **ServicioConfirmModal** - Piezas de la página

### Estadísticas Globales

- **Líneas eliminadas**: 3,294 líneas (255 + 424 + 173 + 187 + 204 + 657 + 518 +
  376 + 500)
- **Componentes reutilizables**: 26 nuevos
- **Reducción promedio**: 46% ((36% + 66% + 28% + 31% + 36% + 82%) / 6)
- **Errores de TypeScript**: 0
- **Build exitoso**: ✅

---

## Componentes Reutilizables Disponibles

### 1. FormFieldWithIcon

**Ubicación**: `components/users/FormFieldWithIcon.tsx`  
**Uso**: Campos de texto con icono  
**Beneficio**: Elimina ~40 líneas por campo

```tsx
<FormFieldWithIcon
  control={form.control}
  name='fieldName'
  label='Label'
  placeholder='Placeholder'
  icon={IconComponent}
/>
```

### 2. ImageUploadField

**Ubicación**: `components/users/ImageUploadField.tsx`  
**Uso**: Carga y preview de imágenes  
**Beneficio**: Elimina ~80 líneas de lógica de imagen

```tsx
<ImageUploadField
  control={form.control}
  initialImageUrl={imageUrl}
  onImageChange={setFile}
/>
```

### 3. NumberInputField

**Ubicación**: `components/users/NumberInputField.tsx`  
**Uso**: Campos numéricos con formato  
**Beneficio**: Elimina ~30 líneas por campo numérico

```tsx
<NumberInputField
  control={form.control}
  name='amount'
  label='Monto'
  icon={DollarSign}
  formattedValue={formatter.formattedValue}
  onValueChange={formatter.handleChange}
/>
```

### 4. useNumberFormatter

**Ubicación**: `hooks/shared/useNumberFormatter.ts`  
**Uso**: Formateo de números con separadores  
**Beneficio**: Lógica centralizada y reutilizable

```tsx
const amount = useNumberFormatter(initialValue);
// Usar: amount.formattedValue, amount.handleChange
```

### 5. ServiceFormFields

**Ubicación**: `components/servicios/ServiceFormFields.tsx`  
**Uso**: Campos completos de formulario de servicios  
**Beneficio**: Elimina ~180 líneas de JSX repetitivo

```tsx
<ServiceFormFields
  anfitrionasDisponibles={anfitrionas}
  selectedUsuarios={usuarios}
  onUsuariosChange={setUsuarios}
  precioServicioDisplay={formatter.formattedValue}
  onPrecioServicioChange={handleChange}
  // ... más props
/>
```

### 6. ServicePriceSummary

**Ubicación**: `components/servicios/ServicePriceSummary.tsx`  
**Uso**: Resumen de precios y totales de servicios  
**Beneficio**: Elimina ~60 líneas de lógica de presentación

```tsx
<ServicePriceSummary
  subTotal={subTotal}
  total={total}
  iva={iva}
  numAnfitrionas={numAnfitrionas}
  // ... más props
/>
```

### 7. useServicePricing

**Ubicación**: `hooks/shared/useServicePricing.ts`  
**Uso**: Cálculo completo de precios de servicios  
**Beneficio**: Lógica centralizada de pricing con IVA

```tsx
const pricing = useServicePricing({
  precioServicio,
  precioHabitacion,
  metodoPago,
  tiempo,
  numAnfitrionas
});
// Usar: pricing.total, pricing.iva, pricing.subTotal, etc.
```

### 8. ProductGridCard

**Ubicación**: `components/ui/ProductGridCard.tsx`  
**Uso**: Card de producto para vista de cuadrícula  
**Beneficio**: Elimina ~95 líneas de JSX repetitivo

```tsx
<ProductGridCard
  producto={producto}
  cantidad={cantidad}
  isSelected={isSelected}
  onCantidadChange={handleChange}
  onAddToSelection={handleAdd}
  onAddToCart={handleCart}
/>
```

### 9. ProductTableRow

**Ubicación**: `components/ui/ProductTableRow.tsx`  
**Uso**: Fila de producto para vista de tabla  
**Beneficio**: Elimina ~75 líneas de JSX repetitivo

```tsx
<ProductTableRow
  producto={producto}
  cantidad={cantidad}
  isSelected={isSelected}
  onCantidadChange={handleChange}
  onAddToSelection={handleAdd}
  onAddToCart={handleCart}
/>
```

### 10. QuantityControl

**Ubicación**: `components/ui/QuantityControl.tsx`  
**Uso**: Control de cantidad genérico  
**Beneficio**: Componente reutilizable para cualquier selector de cantidad

```tsx
<QuantityControl
  value={cantidad}
  onChange={setCantidad}
  min={1}
  max={999}
  size='sm'
/>
```

### 11. useProductSelection

**Ubicación**: `hooks/shared/useProductSelection.ts`  
**Uso**: Lógica de selección múltiple de productos  
**Beneficio**: Hook reutilizable para modales con selección

```tsx
const { selectedProducts, handleAddToSelection, totalSelected, totalValue } =
  useProductSelection({
    productos,
    cantidades,
    onCantidadChange,
    onAgregarProducto
  });
```

---

## Métricas de Éxito (Actualizadas)

- ✅ Reducción de 36% en UserForm.tsx
- ✅ 4 componentes reutilizables creados
- ✅ Mejora en tiempo de render (React.memo)
- ✅ Reducción de re-renders innecesarios
- ✅ Mejor mantenibilidad
- ✅ Código más testeable

## Notas

- Mantener 100% compatibilidad con funcionalidad existente
- No romper ninguna feature
- Documentar cambios significativos
- Crear tests para componentes críticos
