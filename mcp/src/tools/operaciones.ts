import { z } from 'zod';
import { api } from '../api-client.js';
import { acotar, ok, fallo } from '../formato.js';

export const herramientas = {
  cobrar_cuenta: {
    description:
      'Cobra una cuenta cerrando su consumo: POST /api/cuentas/{id}/cobrar (flujo cobro-con-venta del backend). ' +
      'OPERACIÓN DE DINERO: pide confirmación explícita al usuario antes de ejecutarla y verifica el id y el monto con detalle_cuenta. ' +
      'Requiere credenciales con permiso finances.write.',
    inputSchema: {
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
        .describe('Habitación asociada, si el cargo va a una sala privada')
    },
    execute: async (args: any) => {
      try {
        const cuerpo: Record<string, unknown> = {
          metodoPago: args.metodoPago,
          montoFinal: args.montoFinal
        };
        if (args.propinaFinal !== undefined) cuerpo.propinaFinal = args.propinaFinal;
        if (args.habitacion_id !== undefined) cuerpo.habitacion_id = args.habitacion_id;
        const r = await api('POST', `/api/cuentas/${encodeURIComponent(args.id)}/cobrar`, {
          cuerpo
        });
        return ok(acotar(r ?? { success: true, message: 'Cuenta cobrada exitosamente' }));
      } catch (e) {
        return fallo(e);
      }
    }
  }
};
