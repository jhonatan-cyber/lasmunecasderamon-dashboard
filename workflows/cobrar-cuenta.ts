import { generateUUID } from '@/lib/utils/ids';
import 'server-only';
import { enUnaUnidad } from '@/lib/transaccion/contrato';
import { ejecutarEfectosConfirmados } from '@/lib/transaccion/efectos';
import { cobrarYPrepararVenta, consultarCuentaCobrada } from '@/modules/operacion';
import type { CuentaCobrarBody } from '@/modules/operacion/contracts';
import { registrarVenta } from '@/workflows/registrar-venta';
export async function cobrarCuentaConVenta(id: string, body: CuentaCobrarBody, usuarioId: string) {
  const tareas: Array<() => void | Promise<void>> = [];
  const aplazar = (tarea: () => void | Promise<void>) => {
    tareas.push(tarea);
  };
  const cuenta = await enUnaUnidad(unidad =>
    unidad.ejecutar(async contexto => {
      const ventaId = generateUUID();
      const venta = await cobrarYPrepararVenta(id, body, usuarioId, contexto, aplazar, ventaId);
      await registrarVenta(venta, usuarioId, contexto, aplazar, { desdeCuenta: true, ventaId });
      return consultarCuentaCobrada(id, contexto);
    })
  );
  await ejecutarEfectosConfirmados(tareas);
  return cuenta;
}
