# Módulo de Asistencias

Este documento describe la implementación del módulo de asistencias y planillas para el sistema de administración.

## Estructura de la Base de Datos

### Tabla `asistencias`

```sql
CREATE TABLE asistencias (
  id_asistencia INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  estado ENUM('presente', 'tardanza', 'ausente') DEFAULT 'presente',
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id_usuario),
  UNIQUE KEY unique_asistencia (usuario_id, fecha)
);
```

## Componentes Implementados

### Componentes de Asistencias

- `AttendanceTable.tsx`: Tabla para mostrar las asistencias con información de empleado, fecha, hora y estado.
- `AttendanceStatsCard.tsx`: Tarjeta de estadísticas que muestra totales de presentes, tardanzas y ausentes.
- `AsistenciaForm.tsx`: Formulario para registrar asistencias manualmente.
- `AsistenciaList.tsx`: Lista de asistencias con filtros por fecha, empleado y estado.

### Componentes de Planillas

- `PayrollSummaryTable.tsx`: Tabla para mostrar el resumen de planillas con información de empleado, días asistidos, sueldo, descuento y total.
- `PayrollSummaryStats.tsx`: Tarjeta de estadísticas que muestra totales de sueldos, descuentos y pagos.
- `PayrollSummaryList.tsx`: Lista de resumen de planillas con filtros por mes y año.

## Hooks Personalizados

- `useAsistencias.ts`: Hook para obtener y gestionar datos de asistencias.
- `usePayrollSummary.ts`: Hook para obtener y gestionar datos de resumen de planillas.

## Endpoints de API

### GET /api/asistencias

Obtiene la lista de asistencias con filtros opcionales.

**Parámetros de consulta:**
- `fechaInicio`: Fecha de inicio (YYYY-MM-DD)
- `fechaFin`: Fecha de fin (YYYY-MM-DD)
- `usuarioId`: ID del usuario
- `estado`: Estado de la asistencia (presente, tardanza, ausente)
- `resumen`: Si es 'true', devuelve un resumen de planilla

**Respuesta:**
```json
{
  "data": [...],
  "stats": {
    "total": 10,
    "presentes": 8,
    "tardanzas": 2,
    "ausentes": 0,
    "porcentajeAsistencia": 80
  }
}
```

### POST /api/asistencias

Registra una nueva asistencia.

**Cuerpo de la solicitud:**
```json
{
  "usuario_id": 1,
  "fecha": "2023-06-01",
  "hora": "20:30:00",
  "estado": "presente"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Asistencia registrada correctamente",
  "id": 123
}
```

## Reglas de Negocio

1. **Registro de Asistencia:**
   - Cada empleado solo puede tener una asistencia por día.
   - El estado puede ser 'presente', 'tardanza' o 'ausente'.

2. **Cálculo de Planilla:**
   - El sueldo se calcula en base a los días asistidos.
   - Se aplica un descuento de AFP del 10% sobre el sueldo.
   - El total es el sueldo menos el descuento.

## Próximas Mejoras

- Implementar registro automático de asistencia mediante código QR.
- Agregar soporte para horas extras.
- Implementar exportación de planillas a Excel y PDF.
- Agregar notificaciones para recordar el registro de asistencia.