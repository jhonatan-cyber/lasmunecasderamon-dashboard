import { ServicioWithDetails } from "@/types/servicio";
import { formatDateTimeDmyLabel } from "@/lib/utils/calendarUtils";
import { generateRandomCode } from '@/lib/utils/codeUtils';

type HabitacionStatsRow = {
  estado?: number | string | null;
  status?: number | string | null;
};

// Generar código único de 8 caracteres alfanuméricos
export function generateServiceCode(): string {
  return generateRandomCode();
}

// Calcular totales del servicio
export function calculateServiceTotals(
  precioServicio: number,
  precioHabitacion: number,
  iva: number
) {
  const subTotal = precioServicio; // Subtotal es igual al precio de servicio
  const total = subTotal + precioHabitacion + iva; // Total = subtotal + precio_habitacion + iva

  return {
    subTotal,
    total,
  };
}

// Formatear fecha de creación
export function formatServiceDate(dateString: string): string {
  const { date, time } = formatDateTimeDmyLabel(dateString);
  return `${date} ${time}`;
}

// Obtener badge de estado
export function getServiceStatusBadge(estado: number) {
  const estadoNum = Number(estado);

  switch (estadoNum) {
    case 0:
      return {
        text: "Anulado",
        className: "bg-red-100 text-red-800",
      };
    case 1:
      return {
        text: "Finalizado",
        className: "bg-gray-100 text-gray-800",
      };
    case 2:
      return {
        text: "En Proceso",
        className: "bg-green-100 text-green-800",
      };
    case 3:
      return {
        text: "Pausado",
        className: "bg-orange-100 text-orange-800",
      };
    default:
      return {
        text: "Desconocido",
        className: "bg-gray-100 text-gray-800",
      };
  }
}

// Validar datos del servicio
export function validateServiceData(data: {
  cliente_id: number;
  habitacion_id: number;
  precio_servicio: number;
  tiempo: number;
  metodo_pago: string;
  usuarios: number[];
}) {
  const errors: string[] = [];

  if (!data.usuarios || data.usuarios.length === 0) {
    errors.push("Selecciona al menos una anfitriona");
  }

  if (!data.habitacion_id) {
    errors.push("Selecciona una habitación");
  }

  if (data.precio_servicio <= 0) {
    errors.push("El precio de servicio debe ser mayor a 0");
  }

  if (!data.metodo_pago) {
    errors.push("Selecciona un método de pago");
  }

  return errors;
}

// Calcular estadísticas de servicios
export function calculateServiceStats(servicios: ServicioWithDetails[]) {
  const totalServicios = servicios.length;
  // Activos = En Proceso (2) o Pausado (3)
  const serviciosActivos = servicios.filter((s) => s.estado === 2 || s.estado === 3).length;
  // Terminados = Finalizado (1) o Anulado (0)
  const serviciosTerminados = servicios.filter((s) => s.estado === 1 || s.estado === 0).length;

  // Ingresos totales de servicios finalizados (estado 1)
  const ingresosTotales = servicios
    .filter((s) => s.estado === 1) // Solo servicios finalizados
    .reduce((sum, s) => sum + (s.total || 0), 0);

  // Promedio de tiempo de servicios activos
  const serviciosActivosArray = servicios.filter((s) => s.estado === 2 || s.estado === 3);
  const promedioTiempo = serviciosActivosArray.length > 0
    ? Math.round(
      serviciosActivosArray.reduce((sum, s) => sum + (s.tiempo || 0), 0) /
      serviciosActivosArray.length
    )
    : 0;

  return {
    totalServicios,
    serviciosActivos,
    serviciosTerminados,
    ingresosTotales,
    promedioTiempo,
  };
}

// Calcular estadísticas de habitaciones
export function calculateRoomStats(habitaciones: HabitacionStatsRow[]) {
  const habitacionesDisponibles = habitaciones.filter(
    (h) => Number(h.estado) === 1 || Number(h.status) === 1
  ).length;
  const habitacionesOcupadas = habitaciones.filter(
    (h) => Number(h.estado) === 2 || Number(h.status) === 2
  ).length;

  return {
    habitacionesDisponibles,
    habitacionesOcupadas,
  };
}

