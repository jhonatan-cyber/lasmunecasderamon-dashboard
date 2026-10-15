export interface EntradaRecargaPrepago {
  cliente_id: string;
  monto: number;
  metodo_pago?: string;
  pagos_mixtos?: Array<{ metodo: string; monto: number }>;
  usuario_id?: string;
  metadatos?: Record<string, unknown>;
}

export interface EntradaDevolucionSaldo {
  cliente_id: string;
  monto: number;
  motivo?: string;
  usuario_id?: string;
}

export interface EntradaRestitucionPrepago {
  clienteId: string;
  ventaId: string;
  monto: number;
  usuarioId?: string | null;
  concepto: string;
}
