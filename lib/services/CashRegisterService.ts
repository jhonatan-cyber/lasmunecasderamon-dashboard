import {
  CajaOpenSchema,
  CajaCloseSchema,
  CajaUpdateSchema,
  CajaSolicitarCierreSchema,
  CajaProcesarCierreSchema
} from '@/lib/business/schemas';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { z } from 'zod';

type CajaOpenInput = z.input<typeof CajaOpenSchema>;
type CajaCloseInput = z.input<typeof CajaCloseSchema>;
type CajaUpdateInput = Omit<z.input<typeof CajaUpdateSchema>, 'id_caja'>;
type CajaSolicitarCierreInput = z.input<typeof CajaSolicitarCierreSchema>;

export class CashRegisterService {
  static async openCaja(body: CajaOpenInput) {
    const validated = CajaOpenSchema.parse(body);
    return await CashRegisterRepository.open(
      validated.usuario_id_apertura,
      validated.monto_apertura
    );
  }

  static async closeCaja(body: CajaCloseInput) {
    const validated = CajaCloseSchema.parse(body);
    return await CashRegisterRepository.close(validated.id_caja, validated.usuario_id_cierre);
  }

  /**
   * El cajero pide el cierre. La caja **sigue abierta**: recién se cierra cuando
   * el administrador autoriza el link que le llega por WhatsApp.
   */
  static async solicitarCierreCaja(
    body: CajaSolicitarCierreInput & { usuarioId?: string | null; solicitadoPor: string }
  ) {
    const validated = CajaSolicitarCierreSchema.parse(body);
    return await CashRegisterRepository.solicitarCierre(validated.id_caja, {
      usuarioId: body.usuarioId ?? null,
      nombre: body.solicitadoPor,
      motivo: validated.motivo ?? null
    });
  }

  /**
   * Resolución del administrador. `confirmar` cierra la caja (descontando los
   * saldos que los clientes todavía tienen cargados); `rechazar` la deja abierta.
   */
  static async procesarCierreCaja(body: {
    token: string;
    action: 'confirmar' | 'rechazar';
    usuarioId?: string | null;
    resueltoPor: string;
  }) {
    const validated = CajaProcesarCierreSchema.parse({ token: body.token, action: body.action });
    return await CashRegisterRepository.procesarSolicitudCierre(validated.token, validated.action, {
      usuarioId: body.usuarioId ?? null,
      nombre: body.resueltoPor
    });
  }

  static async getSolicitudCierreByToken(token: string) {
    return await CashRegisterRepository.getSolicitudCierreByToken(token);
  }

  static async getCierrePendiente(id_caja: string | number) {
    return await CashRegisterRepository.getSolicitudCierrePendiente(id_caja.toString());
  }

  static async segundosParaReenviarAviso(id_caja: string | number) {
    return await CashRegisterRepository.segundosParaReenviarAviso(id_caja.toString());
  }

  static async registrarAvisoCierre(token: string) {
    return await CashRegisterRepository.registrarAvisoCierre(token);
  }

  /** Cierres pendientes a los que el cron debe volver a avisar (sin respuesta). */
  static async cierresPendientesParaRecordar() {
    return await CashRegisterRepository.cierresPendientesParaRecordar();
  }

  static async saldosPendientesClientes() {
    return await CashRegisterRepository.saldosPendientesClientes();
  }

  static async updateCaja(id: string, body: CajaUpdateInput) {
    const validated = CajaUpdateSchema.omit({ id_caja: true }).parse(body);
    return await CashRegisterRepository.update(id, validated);
  }

  static async getById(id: string | number) {
    return await CashRegisterRepository.getById(id.toString());
  }

  static async getAll() {
    return await CashRegisterRepository.getAll();
  }

  static async summary() {
    return await CashRegisterRepository.summary();
  }

  static async delete(id: string | number) {
    return await CashRegisterRepository.delete(id.toString());
  }
}
