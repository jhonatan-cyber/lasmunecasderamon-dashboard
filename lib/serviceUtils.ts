import { ServicioWithDetails } from "@/types/servicio";

// Generar código único de 8 caracteres alfanuméricos
export function generateServiceCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString("es-ES", { month: "long" });
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Obtener badge de estado
export function getServiceStatusBadge(estado: number) {
  const estadoNum = Number(estado);

  switch (estadoNum) {
    case 0:
      return {
        text: "Terminado",
        className: "bg-gray-100 text-gray-800",
      };
    case 1:
      return {
        text: "En Proceso",
        className: "bg-green-100 text-green-800",
      };
    case 2:
      return {
        text: "Pendiente Anulación",
        className: "bg-yellow-100 text-yellow-800",
      };
    case 3:
      return {
        text: "Anulado",
        className: "bg-red-100 text-red-800",
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
  const serviciosActivos = servicios.filter((s) => s.estado === 1).length;
  const ingresosTotales = servicios.reduce((sum, s) => sum + (s.total || 0), 0);
  const promedioTiempo =
    servicios.length > 0
      ? Math.round(
          servicios.reduce((sum, s) => sum + (s.tiempo || 0), 0) /
            servicios.length
        )
      : 0;

  return {
    totalServicios,
    serviciosActivos,
    ingresosTotales,
    promedioTiempo,
  };
}

// Calcular estadísticas de habitaciones
export function calculateRoomStats(habitaciones: any[]) {
  const habitacionesDisponibles = habitaciones.filter(
    (h) => h.estado === 1
  ).length;
  const habitacionesOcupadas = habitaciones.filter(
    (h) => h.estado === 2
  ).length;

  return {
    habitacionesDisponibles,
    habitacionesOcupadas,
  };
}
