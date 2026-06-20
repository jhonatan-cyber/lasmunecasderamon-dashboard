import { ServicioWithDetails } from '@/types/servicio';
import { formatDateTimeDmyLabel } from '@/lib/utils/calendarUtils';
import { generateRandomCode } from '@/lib/utils/codeUtils';

type HabitacionStatsRow = {
  estado?: number | string | null;
  status?: number | string | null;
};

export function generateServiceCode(): string {
  return generateRandomCode();
}

export function calculateServiceTotals(
  precioServicio: number,
  precioHabitacion: number,
  iva: number
) {
  const subTotal = precioServicio;
  const total = subTotal + precioHabitacion + iva;

  return {
    subTotal,
    total
  };
}

export function formatServiceDate(dateString: string): string {
  const { date, time } = formatDateTimeDmyLabel(dateString);
  return `${date} ${time}`;
}

export function getServiceStatusBadge(estado: number) {
  const estadoNum = Number(estado);

  switch (estadoNum) {
    case 0:
      return {
        text: 'Anulado',
        className: 'bg-red-100 text-red-800'
      };
    case 1:
      return {
        text: 'Finalizado',
        className: 'bg-gray-100 text-gray-800'
      };
    case 2:
      return {
        text: 'En Proceso',
        className: 'bg-green-100 text-green-800'
      };
    case 3:
      return {
        text: 'Pausado',
        className: 'bg-orange-100 text-orange-800'
      };
    case 4:
      return {
        text: 'Solicitud Anulación',
        className: 'bg-amber-100 text-amber-800'
      };
    default:
      return {
        text: 'Desconocido',
        className: 'bg-gray-100 text-gray-800'
      };
  }
}

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
    errors.push('Selecciona al menos una anfitriona');
  }

  if (!data.habitacion_id) {
    errors.push('Selecciona una habitación');
  }

  if (data.precio_servicio <= 0) {
    errors.push('El precio de servicio debe ser mayor a 0');
  }

  if (!data.metodo_pago) {
    errors.push('Selecciona un método de pago');
  }

  return errors;
}

export function calculateServiceStats(servicios: ServicioWithDetails[]) {
  const totalServicios = servicios.length;

  const serviciosActivos = servicios.filter(s => s.estado === 2 || s.estado === 3).length;

  const serviciosTerminados = servicios.filter(
    s => s.estado === 1 || s.estado === 0 || s.estado === 4
  ).length;

  const ingresosTotales = servicios
    .filter(s => s.estado === 1)
    .reduce((sum, s) => sum + (s.total || 0), 0);

  const serviciosActivosArray = servicios.filter(s => s.estado === 2 || s.estado === 3);
  const promedioTiempo =
    serviciosActivosArray.length > 0
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
    promedioTiempo
  };
}

export function calculateRoomStats(habitaciones: HabitacionStatsRow[]) {
  const habitacionesDisponibles = habitaciones.filter(
    h => Number(h.estado) === 1 || Number(h.status) === 1
  ).length;
  const habitacionesOcupadas = habitaciones.filter(
    h => Number(h.estado) === 2 || Number(h.status) === 2
  ).length;

  return {
    habitacionesDisponibles,
    habitacionesOcupadas
  };
}
