# Documentación del Endpoint de Asistencias y Resumen de Planillas

## Endpoint: `/api/asistencias`

Este endpoint maneja las operaciones relacionadas con las asistencias de los empleados y el resumen de planillas.

### Métodos soportados

#### GET

Permite obtener registros de asistencias con filtros opcionales o un resumen de planilla.

##### Parámetros de consulta

- `fechaInicio`: Fecha de inicio para filtrar asistencias (formato YYYY-MM-DD)
- `fechaFin`: Fecha de fin para filtrar asistencias (formato YYYY-MM-DD)
- `usuarioId`: ID del usuario para filtrar asistencias
- `estado`: Estado de la asistencia ('presente', 'tardanza', 'ausente')
- `resumen`: Si es 'true', devuelve un resumen de planilla en lugar de asistencias individuales
- `month`: Mes para filtrar el resumen de planilla (1-12)
- `year`: Año para filtrar el resumen de planilla

##### Respuesta para asistencias

```json
{
  "data": [
    {
      "id_asistencia": 1,
      "usuario_id": 1,
      "fecha": "2023-05-01",
      "hora": "08:00:00",
      "estado": "presente",
      "nombre": "Juan",
      "apellido": "Pérez",
      "nick": "jperez"
    }
  ],
  "stats": {
    "total": 1,
    "presentes": 1,
    "tardanzas": 0,
    "ausentes": 0,
    "porcentajeAsistencia": 100
  }
}
```

##### Respuesta para resumen de planilla

```json
{
  "data": [
    {
      "id_usuario": 1,
      "nick": "jperez",
      "nombre_completo": "Juan Pérez",
      "total_asistencias": 10,
      "sueldo_total": 100000,
      "aporte_total": 10000,
      "descuento_total": 5000,
      "total_final": 85000
    }
  ],
  "totals": {
    "sueldo": 100000,
    "descuento": 15000,
    "total": 85000
  }
}
```

#### POST

Permite crear un nuevo registro de asistencia.

##### Cuerpo de la solicitud

```json
{
  "usuario_id": 1,
  "fecha": "2023-05-01",
  "hora": "08:00:00",
  "estado": "presente"
}
```

##### Respuesta exitosa

```json
{
  "success": true,
  "message": "Asistencia registrada correctamente",
  "id": 1
}
```

## Hook: `usePayrollSummary`

Este hook permite obtener el resumen de planillas desde el endpoint `/api/asistencias`.

### Parámetros

- `month`: Mes para filtrar el resumen (1-12)
- `year`: Año para filtrar el resumen

### Retorno

```typescript
{
  data: PayrollSummary[],
  totals: {
    sueldo: number,
    descuento: number,
    total: number
  },
  isLoading: boolean,
  error: string | null
}
```

### Ejemplo de uso

```tsx
import usePayrollSummary from '@/hooks/usePayrollSummary'

export default function PayrollSummaryPage() {
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1)
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const { data, totals, isLoading, error } = usePayrollSummary(month, year)

  // ...
}
```

## Consulta SQL para el Resumen de Planilla

La consulta SQL utilizada para generar el resumen de planilla es compleja y utiliza Common Table Expressions (CTEs) para calcular:

1. `semanas_validas`: Identifica las semanas en las que cada usuario ha asistido
2. `conteo_semanas`: Cuenta las semanas con descuento por usuario
3. `asistencias_totales`: Cuenta el total de asistencias por usuario

Luego, combina estos resultados para calcular:
- Total de asistencias
- Sueldo total (asistencias × sueldo)
- Aporte total (asistencias × aporte)
- Descuento total (semanas con descuento × descuento)
- Total final (sueldo total - aporte total - descuento total)

### Filtros de fecha

La consulta permite filtrar por mes y año utilizando las funciones `MONTH()` y `YEAR()` de MySQL.