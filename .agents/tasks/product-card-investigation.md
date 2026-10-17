# Product Card Investigation Report

## Summary

The card view uses `components/products/ProductCard.tsx`. It is already a
**well-structured, visually polished component** with drag-and-drop, animations,
a product photo with tilt/zoom, a dropdown action menu, and a stock-information
grid. The main opportunities for improvement are:

1. **`precio_venta` (sale price) is not shown** — only `precio_compra` (purchase
   price) is displayed. For a bodega/inventory screen this is acceptable, but
   inconsistent with what the sales/bar modules show.
2. **The stock section is dense and low in visual hierarchy** — four stock rows
   (Bodega, Bar, Total, Min, Max) are in a uniform 2-column grid with no visual
   differentiation. A low-stock state uses a background ring but the numbers
   themselves don't change colour.
3. **No category badge** — `product.categoria` is available in the type but
   never rendered on the card.
4. **No sell price / commission displayed** — `presentation.precio_venta` and
   `presentation.comision` exist on `Presentacion` but are not used in the card.
5. **The `Info` spacer** — when `product.description` is absent a
   `<div className="h-10" />` is used as filler, which looks like an empty gap
   rather than intentional design.
6. **`CardHeader` / `CardTitle` are imported but never used** — minor dead code.

---

## Evidence

### 1. File: `app/products/category/[id]/page.tsx`

- **Card component**: `<ProductCard>` from `@/components/products/ProductCard`
  (line 12).
- **Grid layout**:
  `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6`
- Each entry in the grid is a `{ rowId, product, presentation }` flat tuple —
  one card per **presentation**, not per product, so a product with 3
  presentations yields 3 cards.
- Props passed: `product`, `presentation`, `rowId`, `onEdit`, `onDelete`,
  `onActivate`, `onDeactivate`, `isDraggable={true}`, `isLoading={isMutating}`,
  `entranceIndex={index}`.

### 2. File: `components/products/ProductCard.tsx` — full structure

```
StaggeredEntrance (fade-in animation, index-based stagger delay)
└── Card (rounded-4xl, shadow-md→xl, bg-white or bg-red-50 on low-stock, ring-red on low-stock)
    ├── DnD grip handle  [top-left, visible on hover]
    ├── DropdownMenu trigger  [top-right, visible on hover]
    │   └── Items: Ver detalles · Editar · Desactivar/Activar · Eliminar
    ├── InteractiveProductPhoto  [aspect-4/3]
    │   └── Status badge overlay (Activo/Inactivo pill, bottom-left)
    └── CardContent (p-6 space-y-4)
        ├── Code row: TagIcon + barcode/product.code  [text-[10px] monospace]
        ├── Name row: product.name (lg bold, line-clamp-1) + presentation badge
        ├── Low-stock badge  [only when lowStock]
        ├── Stats grid (grid-cols-2 gap-4, border-b)
        │   ├── Precio compra (presentation.precio_compra ?? product.price)
        │   ├── Stock Bodega (blue Badge)
        │   ├── Stock Bar
        │   ├── Total Bar + Bodega
        │   ├── Stock mínimo
        │   └── Stock máximo
        └── Description (italic, line-clamp-2) OR <div className="h-10" /> spacer
```

### 3. Data fields available

**`Product` interface** (`types/product.ts`):

| Field                                              | Notes                                         |
| -------------------------------------------------- | --------------------------------------------- |
| `id`                                               | used                                          |
| `code`                                             | used (barcode fallback)                       |
| `name`                                             | used                                          |
| `category_id`                                      | available, not shown                          |
| `categoria`                                        | optional string, not shown                    |
| `price`                                            | used as fallback for purchase price           |
| `commission`                                       | available, not shown                          |
| `description`                                      | used                                          |
| `status`                                           | used (Activo/Inactivo badge)                  |
| `foto`                                             | used (image fallback)                         |
| `stock_almacen`                                    | used                                          |
| `display_order`                                    | used by DnD reorder                           |
| `ml_shot`, `ml_shot_anfitriona`, `max_anfitrionas` | available, not shown (shown in details modal) |

**`Presentacion` interface** (`types/product.ts`):

| Field                      | Notes                        |
| -------------------------- | ---------------------------- |
| `id`, `producto_id`        | used                         |
| `nombre`                   | used (badge)                 |
| `codigo_barras`            | used                         |
| `precio_compra`            | used                         |
| `precio_venta`             | available, **not shown**     |
| `comision`                 | available, **not shown**     |
| `foto`                     | used                         |
| `stock`                    | used (Bodega)                |
| `stock_bar`                | used                         |
| `stock_minimo`             | used (low-stock gate + grid) |
| `stock_maximo`             | used (grid)                  |
| `categoria_nombre`         | available, **not shown**     |
| `ml_botella`, `ml_abierta` | available, not shown         |

### 4. Tailwind / design tokens

- Custom tokens in `app/globals.css`: `gold-*` (50–900), `silver-*` (50–900),
  standard CSS-var tokens (`primary`, `secondary`, `muted`, `destructive`,
  `ring`, etc.).
- Card uses: `rounded-4xl`, `shadow-md`, `hover:shadow-xl`, `backdrop-blur-xs`,
  `ring-2 ring-inset ring-red-400` (low-stock), `bg-white dark:bg-slate-900`.
- Content area: purple accent for `$` sign (`text-purple-500`), blue badge for
  Bodega stock, red badge for low-stock total.

### 5. shadcn components available

`components/ui/`: accordion, alert, alert-dialog, avatar, **badge**, **button**,
**card**, checkbox, collapsible, collapsible-card, command, **dialog**,
**dropdown-menu**, form, input, label, native-select, pagination, popover,
select, separator, skeleton, switch, **table**, tabs, textarea, TimeSelector,
toggle, toggle-group, **tooltip**.

Badge variants: `default` (primary), `secondary`, `destructive`, `success`
(green-500), `outline`.

---

## What the card currently looks like (visual description)

1. **Photo area** (4:3): product image with 3D tilt on hover, floating
   animation, click opens lightbox. Activo/Inactivo pill overlaid bottom-left.
2. **Hidden-until-hover controls**: drag handle (top-left), three-dot menu
   (top-right).
3. **Content**:
   - Tiny monospace barcode/code tag row.
   - Product name (large, bold, purple on hover) + presentation badge.
   - Optional low-stock badge.
   - 2-column stat grid: purchase price · bodega stock · bar stock · total stock
     · min stock · max stock.
   - Description (or empty gap).

---

## Recommendations for improvement

### High priority

1. **Show `precio_venta`** alongside `precio_compra`. The current card only
   shows the purchase cost. Rename the label to "Precio venta" or add a second
   price row. Alternatively show both in the same 2-col stat grid (move Bodega
   stock down, add Venta price).

2. **Improve stock visual hierarchy**:
   - Color-code the stock numbers: normal = `text-emerald-600`, warning (below
     min) = `text-amber-600`, critical (0) = `text-red-600`.
   - The current low-stock ring+background only shows for values below
     `stock_minimo`. Stock === 0 should also trigger it regardless of
     `stock_minimo`.

3. **Remove the `<div className="h-10" />` spacer** — use `min-h-[2.5rem]` on
   the description container instead so the layout is consistent without a dummy
   div.

### Medium priority

4. **Add a `categoria` / `categoria_nombre` badge** —
   `presentation.categoria_nombre` or `product.categoria` are available. A small
   pill below the name would help orient users at a glance. Use
   `variant="outline"` from the existing Badge.

5. **Collapse the stock grid** — showing 6 stock numbers on a card is
   overwhelming. Consider showing only "Bodega" and "Bar" prominently, and
   moving min/max to a collapsible or tooltip (tooltip component is available).
   This frees space for the sale price.

### Low priority

6. **Dead import cleanup** — `CardHeader` and `CardTitle` are imported from
   `@/components/ui/card` but never used. Same for `DollarSign` from
   lucide-react. Remove to keep the file clean.

7. **Commission field** — `product.commission` and `presentation.comision` are
   unused on the card. Showing commission is likely not desired in a bodega view
   (it's bar-facing info), so leave it out unless the user requests it.

---

## Files involved in any improvement

| File                                  | Role                                                                  |
| ------------------------------------- | --------------------------------------------------------------------- |
| `components/products/ProductCard.tsx` | **Main target** — all UI changes go here                              |
| `types/product.ts`                    | Type reference — no changes needed                                    |
| `app/products/category/[id]/page.tsx` | Passes props — no changes needed unless new props are added           |
| `components/ui/badge.tsx`             | Variants available: default, secondary, destructive, success, outline |
| `components/ui/tooltip.tsx`           | Available for collapsing min/max stock into hover info                |
