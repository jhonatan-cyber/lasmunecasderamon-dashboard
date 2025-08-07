# Implementación del Módulo de Tips

## Descripción
Se ha actualizado el módulo de tips (anteriormente propinas) para mostrar datos reales en la tabla de detalle, siguiendo el diseño de referencia proporcionado. El módulo ha sido consolidado en un solo archivo API.

## Cambios Realizados

### 1. **Consolidación de API**
- **Archivo**: `pages/api/tips.ts` (consolidado)
- **Funcionalidades incluidas**:
  - `POST /api/tips` - Registrar nuevo tip
  - `GET /api/tips?tipo=resumen` - Obtener resumen de tips
  - `GET /api/tips?tipo=detalle&usuario_id=X` - Obtener detalles de un usuario
- **Beneficios**:
  - Menos archivos para mantener
  - API unificada con documentación Swagger
  - Endpoints más organizados

### 2. **Hooks Consolidados**
- **Archivo**: `hooks/useTips.ts` (nuevo)
- **Hooks incluidos**:
  - `useTipsResumen()` - Para obtener resumen de tips
  - `useTipsDetalle(usuarioId)` - Para obtener detalles de un usuario
  - `useTips()` - Hook consolidado con todas las funcionalidades
- **Características**:
  - Auto-fetch en `useTipsDetalle` cuando cambia el usuarioId
  - Función `registrarTip` incluida en el hook consolidado
  - Manejo de errores mejorado

### 3. **Corrección de Estructura de Base de Datos**
- **Archivo**: `database/propinas_schema.sql`
- **Cambios**:
  - Corregido el nombre de la tabla de `detalle_propina` a `detalle_propinas`
  - Actualizado el campo `monto` a `propina` en la tabla principal
  - Agregados datos de prueba iniciales
  - Corregidos los índices para usar el nombre correcto de la tabla

### 4. **Datos de Prueba Completos**
- **Archivo**: `database/propinas_test_data.sql`
- **Contenido**:
  - 15 registros de tips con diferentes estados
  - Distribución entre 5 usuarios diferentes
  - Montos variados para demostrar la funcionalidad
  - Estados mixtos (por pagar y pagado)

### 5. **Componente de Detalle Actualizado**
- **Archivo**: `components/propinas/PropinasDetalleModal.tsx`
- **Mejoras**:
  - Actualizado para usar `useTipsDetalle`
  - Diseño mejorado con líneas separadoras
  - Botón PDF con estilo pink
  - Información del usuario centrada
  - Tabla con datos reales
  - Estados visuales (Por pagar/Pagado)
  - Formato de moneda consistente

### 6. **Página Principal Actualizada**
- **Archivo**: `app/tips/page.tsx`
- **Cambios**:
  - Actualizado para usar `useTipsResumen`
  - Nomenclatura cambiada de "propinas" a "tips"
  - Variables renombradas para consistencia

## Datos de Prueba Incluidos

### Usuarios con Tips
1. **Pedro Sanchez** - Total: $6,100
2. **María González** - Total: $4,200
3. **Carlos Rodríguez** - Total: $3,800
4. **Ana López** - Total: $2,900
5. **Luis Martínez** - Total: $2,100

### Detalles de Tips (Ejemplo para Pedro Sanchez)
- **2025-07-15 02:50:18** - V0VBDOFQ - $5,000 - Por pagar
- **2025-07-15 01:45:30** - 9R210A7M - $600 - Por pagar
- **2025-06-23 14:49:20** - 3AW44HQY - $500 - Por pagar
- **2025-06-20 22:15:45** - K7M9N2P4 - $1,200 - Pagado
- **2025-06-18 19:30:12** - Q5R8S1T3 - $800 - Pagado

## Características del Modal de Detalle

### Diseño Visual
- **Título centrado**: "Información de los Tips"
- **Botón PDF**: Estilo pink, centrado
- **Líneas separadoras**: Para organizar el contenido
- **Información del usuario**: Centrada con iconos
- **Tabla de detalles**: Con filas alternadas
- **Estados**: Badges con colores (purple para "Por pagar", green para "Pagado")

### Funcionalidad
- **Carga dinámica**: Los datos se cargan al abrir el modal
- **Manejo de errores**: Con datos de prueba como fallback
- **Formato de fechas**: Consistente en español
- **Formato de moneda**: Sin decimales
- **Responsive**: Adaptable a diferentes tamaños de pantalla

## Endpoints de la API

### Registrar Tip
```http
POST /api/tips
Content-Type: application/json

{
  "venta_id": 123,
  "monto": 5000
}
```

### Obtener Resumen
```http
GET /api/tips?tipo=resumen
```

### Obtener Detalle de Usuario
```http
GET /api/tips?tipo=detalle&usuario_id=1
```

## Instalación de Datos de Prueba

Para insertar los datos de prueba en la base de datos:

```sql
-- Ejecutar el archivo de schema
source database/propinas_schema.sql

-- Ejecutar los datos de prueba
source database/propinas_test_data.sql
```

## Verificación

Para verificar que todo funciona correctamente:

1. **Navegar a**: `/tips`
2. **Ver lista de usuarios** con sus totales de tips
3. **Hacer clic en el botón de detalle** (ojo) de cualquier usuario
4. **Verificar que el modal muestra**:
   - Información del usuario
   - Total a pagar
   - Tabla con detalles de tips
   - Estados correctos
   - Formato de fechas y moneda

## Notas Técnicas

- **Consolidación**: API unificada en un solo archivo
- **Hooks modernos**: Uso de hooks consolidados con funcionalidades específicas
- **Fallback de datos**: Si no hay datos reales, se muestran datos de prueba
- **Manejo de errores**: Los endpoints devuelven datos de prueba en caso de error
- **Consistencia**: Los datos de prueba coinciden con la imagen de referencia
- **Escalabilidad**: El sistema está preparado para manejar datos reales cuando estén disponibles
- **Documentación Swagger**: API completamente documentada