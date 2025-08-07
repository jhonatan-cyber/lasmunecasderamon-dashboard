# Componente StatsCard Reutilizable

## Descripción
El componente `StatsCard` es un componente reutilizable para mostrar estadísticas en cualquier módulo de la aplicación. Proporciona una interfaz consistente y flexible para mostrar métricas importantes.

## Características

### ✅ **Flexibilidad**
- **Columnas configurables**: 1-6 columnas
- **Formateo automático**: Moneda, porcentajes, números
- **Estados**: Loading, error, success
- **Iconos personalizables**: Cualquier icono de Lucide React

### ✅ **Reutilizable**
- **Cualquier endpoint**: Configurable para cualquier API
- **Tipos TypeScript**: Soporte completo de tipos
- **Responsive**: Adaptable a diferentes tamaños de pantalla

## Uso Básico

### 1. Importar el componente
```tsx
import { StatsCard, StatCard } from "@/components/ui/StatsCard";
import { useStats } from "@/hooks/useStats";
```

### 2. Definir la interfaz de datos
```tsx
interface MyModuleStats {
  total_ventas: number;
  cantidad_ventas: number;
  promedio_venta: number;
  // ... más campos
}
```

### 3. Usar el hook genérico
```tsx
const { data: stats, isLoading, error } = useStats<MyModuleStats>({
  endpoint: '/api/my-module/stats',
  params: { stats: true }
});
```

### 4. Configurar las tarjetas
```tsx
const statsCards: StatCard[] = [
  {
    title: "Total Ventas",
    value: stats?.total_ventas || 0,
    subtitle: `${stats?.cantidad_ventas || 0} transacciones`,
    icon: DollarSign,
    formatAsCurrency: true,
  },
  // ... más tarjetas
];
```

### 5. Renderizar el componente
```tsx
return (
  <StatsCard
    stats={statsCards}
    columns={4}
    error={error}
    isLoading={isLoading}
  />
);
```

## Opciones de Formateo

### Moneda
```tsx
{
  title: "Total",
  value: 1500,
  formatAsCurrency: true, // Resultado: "$1,500"
}
```

### Porcentaje
```tsx
{
  title: "Crecimiento",
  value: 25,
  formatAsPercentage: true, // Resultado: "25%"
}
```

### Número con separadores
```tsx
{
  title: "Clientes",
  value: 1500,
  formatAsNumber: true, // Resultado: "1,500"
}
```

### Texto personalizado
```tsx
{
  title: "Estado",
  value: "Activo",
  // Sin formateo - se muestra tal como está
}
```

## Ejemplos por Módulo

### Comisiones
```tsx
const statsCards: StatCard[] = [
  {
    title: "Total Comisiones",
    value: stats?.total_comisiones || 0,
    subtitle: "Total acumulado",
    icon: DollarSign,
    formatAsCurrency: true,
  },
  {
    title: "Comisiones por Ventas",
    value: stats?.comision_ventas || 0,
    subtitle: `${stats?.porcentaje_ventas || 0}% del total`,
    icon: TrendingUp,
    formatAsCurrency: true,
  },
];
```

### Caja Registradora
```tsx
const statsCards: StatCard[] = [
  {
    title: "Total Ingresos",
    value: stats?.total_ingresos || 0,
    subtitle: "Ventas + Servicios",
    icon: DollarSign,
    formatAsCurrency: true,
  },
  {
    title: "Tiempo Abierta",
    value: stats?.tiempo_abierta || "0h 0m",
    subtitle: `Desde ${stats?.fecha_apertura || "N/A"}`,
    icon: Clock,
  },
];
```

### Ventas
```tsx
const statsCards: StatCard[] = [
  {
    title: "Total Ventas",
    value: stats?.total_ventas || 0,
    subtitle: `${stats?.cantidad_ventas || 0} transacciones`,
    icon: DollarSign,
    formatAsCurrency: true,
  },
  {
    title: "Clientes Únicos",
    value: stats?.clientes_unicos || 0,
    subtitle: "Clientes diferentes",
    icon: Users,
    formatAsNumber: true,
  },
];
```

## Props del Componente

### StatsCardProps
```tsx
interface StatsCardProps {
  stats: StatCard[];           // Array de tarjetas de estadísticas
  columns?: 1 | 2 | 3 | 4 | 5 | 6;  // Número de columnas (default: 4)
  className?: string;          // Clases CSS adicionales
  error?: string | null;       // Mensaje de error
  isLoading?: boolean;         // Estado de carga
}
```

### StatCard
```tsx
interface StatCard {
  title: string;               // Título de la tarjeta
  value: string | number;      // Valor a mostrar
  subtitle?: string;           // Subtítulo opcional
  icon: LucideIcon;           // Icono de Lucide React
  isLoading?: boolean;        // Estado de carga individual
  formatAsCurrency?: boolean;  // Formatear como moneda
  formatAsPercentage?: boolean; // Formatear como porcentaje
  formatAsNumber?: boolean;    // Formatear como número con separadores
}
```

## Ventajas del Sistema

### 🔄 **Reutilización**
- Un solo componente para todos los módulos
- Configuración flexible y extensible
- Mantenimiento centralizado

### 🎨 **Consistencia**
- Diseño uniforme en toda la aplicación
- Comportamiento predecible
- UX coherente

### ⚡ **Performance**
- Hook genérico optimizado
- Re-renderizado eficiente
- Carga lazy de datos

### 🛠️ **Mantenibilidad**
- Código DRY (Don't Repeat Yourself)
- Fácil de extender y modificar
- Testing simplificado

## Migración desde Componentes Existentes

### Antes (CommissionsStatsCard)
```tsx
// Código específico y repetitivo
<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
  {statsCards.map((stat, index) => (
    <Card key={index}>
      <CardHeader>...</CardHeader>
      <CardContent>...</CardContent>
    </Card>
  ))}
</div>
```

### Después (Con StatsCard)
```tsx
// Código limpio y reutilizable
<StatsCard
  stats={statsCards}
  columns={4}
  error={error}
  isLoading={isLoading}
/>
```

## Conclusión

El componente `StatsCard` reutilizable proporciona una solución elegante y eficiente para mostrar estadísticas en cualquier módulo de la aplicación. Su flexibilidad y facilidad de uso lo convierten en una herramienta esencial para mantener la consistencia y reducir la duplicación de código. 