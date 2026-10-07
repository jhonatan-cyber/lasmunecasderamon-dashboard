import { z } from 'zod';
import { api } from '../api-client.js';
import { envolver, esquemaSalida, fallo } from '../formato.js';

const esquemaCobro = z
  .object({
    confirmar: z
      .literal(true)
      .describe('El administrador confirmó explícitamente el cobro y sus datos.'),
    id: z.string().min(1).describe('Identificador de la cuenta a cobrar'),
    metodoPago: z
      .string()
      .min(1)
      .describe(
        'Forma de pago aceptada por el negocio, p. ej. efectivo, tarjeta, transferencia, prepago'
      ),
    montoFinal: z.number().nonnegative().describe('Monto final a cobrar'),
    propinaFinal: z.number().nonnegative().optional().describe('Propina, si corresponde'),
    habitacion_id: z
      .string()
      .optional()
      .describe('Habitación asociada, si el cargo va a una sala privada'),
    operacion_id: z
      .uuid()
      .describe(
        'UUID nuevo por intención. Ante una respuesta perdida se conserva el mismo UUID y payload: el backend replica el resultado sin volver a cobrar. No reintentar con otro UUID ni cambiar los datos.'
      )
  })
  .strict();

export const herramientas = {
  cobrar_cuenta: {
    description:
      'Cobra una cuenta cerrando su consumo: POST /api/cuentas/{id}/cobrar (flujo cobro-con-venta del backend). ' +
      'OPERACIÓN DE DINERO: pide confirmación explícita al usuario antes de ejecutarla y verifica el id y el monto con detalle_cuenta. ' +
      'Requiere operacion_id: se envía como x-idempotency-key y el reintento con el mismo UUID replica la respuesta sin duplicar el cobro. ' +
      'Requiere credenciales con permiso finances.write.',
    inputSchema: esquemaCobro.shape,
    outputSchema: esquemaSalida,
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false
    },
    execute: async (args: any) => {
      try {
        const { confirmar: _confirmar, operacion_id, ...resto } = esquemaCobro.parse(args);
        const cuerpo: Record<string, unknown> = {
          metodoPago: resto.metodoPago,
          montoFinal: resto.montoFinal
        };
        if (resto.propinaFinal !== undefined) cuerpo.propinaFinal = resto.propinaFinal;
        if (resto.habitacion_id !== undefined) cuerpo.habitacion_id = resto.habitacion_id;
        const r = await api('POST', `/api/cuentas/${encodeURIComponent(resto.id)}/cobrar`, {
          cuerpo,
          cabeceras: { 'x-idempotency-key': operacion_id }
        });
        return envolver(r ?? { success: true, message: 'Cuenta cobrada exitosamente' });
      } catch (e) {
        return fallo(e);
      }
    }
  }
};
