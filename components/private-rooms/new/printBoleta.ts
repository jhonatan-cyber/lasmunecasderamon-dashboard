'use client';

import { generateReceiptHTML } from '../utils/PrivateRoomReceipt';
import { toast } from 'sonner';

interface ReceiptOptions {
  selectedRoom: any;
  selectedClientData: any;
  precioHabitacionBoleta: number;
  metodoPago: string;
  anfitrionasAtendiendo: string;
}

/**
 * Abre la ventana de impresión de la boleta de habitación. Devuelve `true` si
 * se pudo abrir/imprimir y `false` si se mostró un toast de error.
 */
export function printBoletaHabitacion({
  selectedRoom,
  selectedClientData,
  precioHabitacionBoleta,
  metodoPago,
  anfitrionasAtendiendo
}: ReceiptOptions): boolean {
  const habitacionNombre = selectedRoom?.nombre || selectedRoom?.name || 'Habitacion';
  const clienteNombre = selectedClientData?.nombre || selectedClientData?.name || 'Particular';
  const monto = precioHabitacionBoleta;

  if (monto <= 0) {
    toast.error('No hay monto de habitacion para generar la boleta');
    return false;
  }

  const boletaWindow = window.open('', '_blank', 'width=420,height=640');
  if (!boletaWindow) {
    toast.error('No se pudo abrir la ventana para la boleta');
    return false;
  }

  const fecha = new Date().toLocaleString('es-CL');
  const logoUrl = `${window.location.origin}/img/system/logo2.png`;
  const htmlContent = generateReceiptHTML({
    logoUrl,
    clienteNombre,
    habitacionNombre,
    metodoPago,
    fecha,
    anfitrionasAtendiendo,
    monto
  });
  boletaWindow.document.write(htmlContent);
  boletaWindow.document.close();
  boletaWindow.focus();
  boletaWindow.print();
  return true;
}
