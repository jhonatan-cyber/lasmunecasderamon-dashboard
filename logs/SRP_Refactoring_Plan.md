# Plan Maestro de Refactorización SRP: "Arquitectura Limpia"

Este plan detalla la estrategia para transformar los módulos actuales en estructuras mantenibles, escalables y desacopladas siguiendo el principio de **Single Responsibility Principle (SRP)**.

---

## 🏗️ Estrategia General (El Tridente)

Para cada módulo de la aplicación, aplicaremos la misma estructura:

1.  **El Controlador (Hook)**: Un hook personalizado `hooks/{modulo}/use{Modulo}.ts` que gestione TODO el estado, llamadas a API, validaciones y cálculos. La vista no debe saber *cómo* se hace algo, solo ejecutar la función que le da el hook.
2.  **El Coordinador (Página)**: El archivo `app/{modulo}/page.tsx` solo importa el hook y distribuye las props a los sub-componentes. No debe contener `useEffect` complejos ni funciones de 50 líneas.
3.  **Los Átomos (Componentes)**: Dividir la UI en piezas pequeñas (`Header`, `Filters`, `Table`, `Stats`, `Cards`, `Modals`). Cada componente solo se encarga de mostrar datos y emitir eventos.

---

## 📋 Estado de Módulos y Hoja de Ruta

### 🟢 Módulos Completados (Baseline)
| Módulo | Estado | Cambios Realizados |
| :--- | :--- | :--- |
| **Nueva Venta** | ✅ | Lógica movida a `useNewSaleForm`. UI atomizada. |
| **Gestión de Órdenes** | ✅ | Reducción de 1000 a 180 líneas. Hook `useOrdersList` y `useOrderDetail`. |

### 🟡 Módulos en Proceso / Pendientes
| Módulo | Objetivo SRP | Riesgos / Dependencias |
| :--- | :--- | :--- |
| **Cuentas (Accounts)** | Extraer lógica de `useCuentas` (ya existe pero la vista es grande). Crear sub-componentes para los tipos de fila. | Alta dependencia de `OrderDetailModal`. |
| **Caja (Cash Register)** | Unificar `useCashRegister` con la lógica de cierre/apertura que hoy está en componentes. | Crítico para la operación. |
| **Ventas (Global List)** | Sacar funciones de utilidad de `SalesList` a un hook de filtrado avanzado. | Gran volumen de datos. |
| **Comisiones** | Mover lógica de "Por Pagar" vs "Pagado" y cálculos de porcentaje a un hook controlador. | Cálculos financieros sensibles. |
| **Inventario (Products)** | Desacoplar la gestión de stock y estados de categorías de los modales de edición. | Relación con imágenes y Cloudinary. |
| **Pagos (Payroll)** | Centralizar la lógica de sueldos y descuentos. Actualmente dispersa en tablas. | Reglas de negocio complejas. |

---

## 🛠️ Estándar de Implementación

### 1. Hook de Página (Controller Pattern)
```typescript
// hooks/modulo/useModuloPage.ts
export const useModuloPage = () => {
  const [data, setData] = useState([]);
  // ... lógica de fetching, filtrado, acciones
  return { data, filteredData, actions: { handleCreate, handleDelete } };
};
```

### 2. Componentes de Presentación (Dumb Components)
- Sin `useEffect` para fetching.
- Props tipadas estrictamente.
- Uso de `Memo` para evitar re-renders en listas largas.

### 3. Diálogos y Modales
- Extraer contenido del modal a un componente independiente para evitar que el archivo de la página crezca infinitamente.

---

## 🚀 Próximos Pasos (Sprints Sugeridos)

1.  **Fase 1 (Módulos de Transacción)**: Refactorizar **Cuentas** y **Caja**. Son los pilares del flujo de dinero.
2.  **Fase 2 (Módulos de Reporte)**: Refactorizar **Ventas** e **Inventario**. Optimizar el filtrado y visualización.
3.  **Fase 3 (Módulos de RRHH)**: Refactorizar **Comisiones**, **Asistencia** y **Pagos**. Unificar criterios de cálculo.

---

> [!IMPORTANT]
> **Regla de Oro**: Si un archivo `page.tsx` supera las 250 líneas, DEBE ser refactorizado. Si un componente de UI tiene un `fetch` directo, está rompiendo SRP.
