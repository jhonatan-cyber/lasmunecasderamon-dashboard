import { enUnaUnidad } from '@/lib/transaction/contract';
import { procesarAnulacionCuentaCanal as procesarEnRepositorio } from './anulacionesRepositorio';

export function procesarAnulacionCuentaCanal(
  solicitud: Parameters<typeof procesarEnRepositorio>[0],
  accion: 'confirmar' | 'rechazar'
) {
  return enUnaUnidad(unidad =>
    unidad.ejecutar(contexto => procesarEnRepositorio(solicitud, accion, contexto))
  );
}
