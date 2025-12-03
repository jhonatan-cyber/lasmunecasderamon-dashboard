# Funcionalidad de Retiro de Dinero de Caja

## Descripción
Esta funcionalidad permite retirar dinero de una caja registradora abierta, registrando el motivo del retiro y actualizando automáticamente el saldo de efectivo disponible.

## Componentes Implementados

### 1. **Tipos** (`types/caja.ts`)
- **CajaRetiro**: Interfaz para los datos de retiro
  ```typescript
  interface CajaRetiro {
    id_caja: number;
    monto: number;
    motivo: string;
    usuario_id: number;
  }
  ```

### 2. **Hook** (`hooks/useCashRegister.ts`)
- **retirarDinero**: Función que envía la solicitud de retiro al API
  - Valida los datos
  - Actualiza las cajas y el resumen después del retiro
  - Muestra notificaciones de éxito/error

### 3. **Componente de Diálogo** (`components/caja/RetiroDineroDialog.tsx`)
- Formulario completo con validaciones:
  - ✅ Monto no puede ser mayor al disponible
  - ✅ Motivo es obligatorio
  - ✅ Muestra información de la caja actual
  - ✅ Calcula el monto disponible automáticamente
  - ✅ Validación de usuario autenticado

### 4. **Componente de Tarjeta** (`components/caja/CajaCard.tsx`)
- Botón "Retirar" agregado para cajas abiertas
- Aparece entre "Ver Detalle" y "Cerrar Caja"
- Icono verde para identificar fácilmente la acción

### 5. **Página Principal** (`app/cash-register/page.tsx`)
- Integración completa del diálogo de retiro
- Manejo de estado y callbacks
- Actualización automática de datos después del retiro

### 6. **API Endpoint** (`pages/api/cashregister/retiro.ts`)
- **POST** `/api/cashregister/retiro`
- Validaciones:
  - ✅ Caja existe y está abierta
  - ✅ Monto disponible suficiente
  - ✅ Usuario existe y está activo
- Actualiza el efectivo de la caja
- Registra el retiro en tabla de historial (opcional)

## Flujo de Uso

1. **Usuario abre el módulo de Cajas**
2. **Selecciona una caja abierta**
3. **Click en botón "Retirar"**
4. **Completa el formulario:**
   - Monto a retirar
   - Motivo del retiro
5. **Sistema valida:**
   - Monto disponible
   - Datos completos
6. **Confirma el retiro**
7. **Sistema actualiza:**
   - Efectivo de la caja
   - Registra en historial
   - Actualiza la vista

## Cálculo de Monto Disponible

```typescript
const montoDisponible = 
  caja.monto_apertura + 
  caja.efectivo - 
  caja.devoluciones - 
  caja.anticipo;
```

## Base de Datos

### Tabla de Historial (Opcional)
Para habilitar el registro de historial de retiros, ejecuta el script SQL:

```sql
-- Ver archivo: sql/create_retiros_caja_table.sql
```

**Campos de la tabla `retiros_caja`:**
- `id_retiro`: ID único del retiro
- `id_caja`: ID de la caja
- `monto`: Monto retirado
- `motivo`: Motivo del retiro
- `usuario_id`: Usuario que realizó el retiro
- `fecha_retiro`: Fecha y hora del retiro

## Validaciones Implementadas

### Frontend
- ✅ Monto mayor a 0
- ✅ Monto no excede el disponible
- ✅ Motivo no vacío
- ✅ Usuario autenticado

### Backend
- ✅ Caja existe
- ✅ Caja está abierta (estado = 1)
- ✅ Monto disponible suficiente
- ✅ Usuario existe y está activo
- ✅ Datos válidos (Zod schema)

## Mensajes de Error

| Error | Mensaje |
|-------|---------|
| Caja no encontrada | "Caja no encontrada" |
| Caja cerrada | "La caja debe estar abierta para realizar retiros" |
| Monto insuficiente | "Monto insuficiente. Disponible: $X,XXX" |
| Usuario inválido | "Usuario no encontrado o inactivo" |
| Datos inválidos | "Datos de entrada inválidos" |

## Permisos

- Solo usuarios autenticados pueden retirar dinero
- Se registra el ID del usuario que realiza el retiro
- Se recomienda agregar validación de roles (ej: solo administradores y cajeros)

## Mejoras Futuras Sugeridas

1. **Agregar validación de roles** en el endpoint
2. **Límite máximo de retiro** por transacción
3. **Reporte de retiros** por caja/período
4. **Notificaciones** para retiros grandes
5. **Auditoría** de cambios en efectivo
6. **Impresión de comprobante** de retiro

## Notas Técnicas

- El endpoint actualiza directamente el campo `efectivo` de la tabla `cajas`
- Si la tabla `retiros_caja` no existe, el sistema continúa funcionando sin registrar historial
- Se recomienda crear la tabla de historial para auditoría
- Todos los montos se manejan con precisión decimal (DECIMAL(10,2))

## Testing

Para probar la funcionalidad:

1. Abrir una caja con monto inicial
2. Realizar una venta para tener efectivo
3. Intentar retirar un monto válido
4. Verificar que el efectivo se actualiza correctamente
5. Intentar retirar más del disponible (debe fallar)
6. Verificar el registro en la tabla de historial

## Soporte

Para cualquier problema o pregunta sobre esta funcionalidad, contactar al equipo de desarrollo.
