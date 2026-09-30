import { generateRandomCode } from '@/lib/utils/codeUtils';

/** Estado del formulario de «Datos Servicio» (salida a sala privada). */
export interface ServicioFormData {
  clientes: string[];
  usuarios: string[];
  habitacion_id: string;
  precio_habitacion: number;
  tiempo_habitacion: number;
  precio_servicio: number;
  metodo_pago: string;
  iva: number;
  tiempo: number;
}

/** 1234 → '1.234' (solo visual, el estado guarda el número). */
export const formatNumberWithSeparators = (value: number): string =>
  value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** '1.234' → 1234 (parse de los inputs de montos). */
export const parseMonto = (raw: string): number => {
  const numericValue = raw.replace(/\./g, '');
  return numericValue === '' ? 0 : Math.max(0, parseInt(numericValue) || 0);
};

const num = (value: unknown): number => Number(value || 0);

/**
 * Totales del servicio. Reglas (iguales a las del monolito):
 *  - La comisión se multiplica por anfitrionas; si hay más clientes que
 *    anfitrionas y la habitación no paga comisión, manda la cantidad de clientes.
 *  - Con comisión de anfitriona en la habitación, la habitación se cobra una vez.
 *  - Tarjeta: IVA sobre el servicio + redondeo del total a múltiplos de 5000
 *    (el excedente suma al IVA para cuadrar la caja).
 *  - Mixto: IVA = suma de los excedentes tarjeta de cada pago (monto − baseMonto).
 */
export function calcularTotalesServicio(args: {
  precioServicio: number;
  cantidadAnfitrionas: number;
  cantidadClientes: number;
  selectedRoom: any;
  precioHabitacion: number;
  metodoPago: string;
  pagosMixtos: any[];
  ivaRate: number;
}): { subTotal: number; iva: number; total: number } {
  const {
    precioServicio,
    cantidadAnfitrionas,
    cantidadClientes,
    selectedRoom,
    precioHabitacion,
    metodoPago,
    pagosMixtos,
    ivaRate
  } = args;
  const anfitrionas = cantidadAnfitrionas || 1;
  const clientes = cantidadClientes || 1;
  let multiplicadorServicio = anfitrionas;
  let multiplicadorHabitacion = anfitrionas;

  if (clientes > anfitrionas && selectedRoom && num(selectedRoom.comision_anfitriona) === 0) {
    multiplicadorServicio = clientes;
    multiplicadorHabitacion = clientes;
  }

  if (selectedRoom && num(selectedRoom.comision_anfitriona) > 0) {
    multiplicadorHabitacion = 1;
  }

  const subTotal = precioServicio * multiplicadorServicio;
  const precioHabitacionTotal = precioHabitacion * multiplicadorHabitacion;

  let iva = 0;
  if (metodoPago === 'tarjeta') {
    iva = Math.floor(subTotal * ivaRate);
  }

  const totalBase = subTotal + precioHabitacionTotal;
  let total = totalBase;

  if (metodoPago === 'tarjeta') {
    const nuevoTotal = totalBase + iva;
    const totalRedondeado = Math.ceil(nuevoTotal / 5000) * 5000;
    const excedente = totalRedondeado - nuevoTotal;
    total = totalRedondeado;
    iva = iva + excedente;
  } else if (metodoPago === 'mixto') {
    iva = (pagosMixtos || [])
      .filter(pago => pago.metodo === 'tarjeta')
      .reduce(
        (sum, pago) => sum + Math.max(0, Number(pago.monto || 0) - Number(pago.baseMonto || 0)),
        0
      );
    total = totalBase + iva;
  }

  return { subTotal, iva, total };
}

/** Mensaje de validación o null si el formulario está listo para confirmar. */
export function validateServicioForm(formData: ServicioFormData): string | null {
  if (formData.usuarios.length === 0) return 'Selecciona al menos una anfitriona';
  if (!formData.habitacion_id) return 'Selecciona una habitación';
  if (formData.precio_servicio < 0) return 'El precio de servicio no puede ser negativo';
  if (!formData.metodo_pago) return 'Selecciona un método de pago';
  return null;
}

/** El backend espera IDs numéricos cuando lo son; si no, el string tal cual. */
const normalizeId = (id: string) => {
  const parsed = Number(id);
  return Number.isNaN(parsed) ? id : parsed;
};

/** Payload exacto de `POST /api/servicios` para el modal de confirmación. */
export function buildServicioPayload(args: {
  formData: ServicioFormData;
  precioHabitacion: number;
  subTotal: number;
  total: number;
  pagosMixtos: any[];
}) {
  const { formData, precioHabitacion, subTotal, total, pagosMixtos } = args;
  return {
    codigo: generateRandomCode(),
    cliente_id: formData.clientes.length > 0 ? normalizeId(formData.clientes[0]) : null,
    clientes: formData.clientes.map(normalizeId),
    habitacion_id: formData.habitacion_id,
    precio_habitacion: precioHabitacion,
    precio_servicio: formData.precio_servicio,
    iva: formData.iva,
    sub_total: subTotal,
    total,
    tiempo: formData.tiempo,
    metodo_pago: formData.metodo_pago,
    usuarios: formData.usuarios.map(normalizeId),
    pagos_mixtos: formData.metodo_pago === 'mixto' ? pagosMixtos : null
  };
}

/** Nicks de las anfitrionas elegidas, separados por coma (boleta y timer). */
export function unirNombresAnfitrionas(anfitrionas: any[], userIds: string[]): string {
  return userIds
    .map(userId => {
      const anfitriona = anfitrionas.find(
        a => String(a.id_usuario ?? a.id ?? '') === String(userId)
      );
      return anfitriona ? anfitriona.nick || anfitriona.nombre : null;
    })
    .filter(Boolean)
    .join(', ');
}
