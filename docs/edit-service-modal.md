# Modal de Edición de Servicios

## Descripción
El modal de edición de servicios permite modificar servicios que están corriendo y tienen precio de servicio igual a 0. Esta funcionalidad está diseñada para completar la información de servicios que fueron creados sin precio inicial.

## Funcionalidades

### Cuándo aparece
- Solo se muestra para servicios con `precio_servicio = 0`
- Aparece como un botón con ícono de engranaje (⚙️) junto al botón de edición rápida
- Solo está disponible para servicios en estado activo

### Campos editables
1. **Precio del Servicio**: Valor del servicio a cobrar
2. **Precio de la Habitación**: Costo de la habitación
3. **Método de Pago**: Efectivo, Tarjeta o Transferencia
4. **Tiempo**: Duración del servicio en minutos

### Cálculo automático de IVA
- **Efectivo/Transferencia**: Sin IVA adicional
- **Tarjeta**: Se aplica automáticamente 20% de IVA sobre el precio del servicio

### Resumen de totales
El modal muestra un resumen en tiempo real:
- Subtotal (precio del servicio)
- Precio de habitación
- IVA (solo si es tarjeta)
- **Total final**

## Validaciones
- Precio del servicio debe ser ≥ 0
- Precio de habitación debe ser ≥ 0
- Tiempo debe ser > 0 minutos
- Método de pago es obligatorio

## Integración con el sistema
- Actualiza automáticamente las comisiones de las anfitrionas
- Ajusta los montos en la caja activa según el método de pago
- Mantiene la consistencia de datos en toda la aplicación
- Actualiza el timer si se modifica el tiempo

## Uso
1. Localizar un servicio con precio 0 en la lista de servicios privados
2. Hacer clic en el botón de engranaje (⚙️) "Edición completa"
3. Completar los campos requeridos
4. Revisar el resumen de totales
5. Hacer clic en "Guardar Cambios"

## Diferencias con edición rápida
- **Edición rápida** (✏️): Solo permite modificar precio de servicio y tiempo
- **Edición completa** (⚙️): Permite modificar todos los campos incluyendo método de pago y precio de habitación