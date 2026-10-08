import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

// El link del WhatsApp llega con el token en la query string; el mock global de
// next/navigation devuelve una búsqueda vacía, así que este archivo lo pone él.
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams({ token: 'token-test' })
}));

import ConfirmarCierreCajaPage from '@/app/confirmar-cierre-caja/page';

const solicitud = {
  caja_id: 'caja-1',
  estado: 'pendiente',
  monto_cierre_calculado: 160000,
  saldo_clientes_descontado: 12000,
  saldo_clientes_por_devolver: 0,
  solicitado_por: 'CajeroTest',
  motivo: 'Fin del turno',
  fecha_solicitud: '2026-09-29 18:00:00',
  fecha_apertura: '2026-09-29 08:00:00',
  cajero_nombre: 'CajeroTest',
  monto_apertura: 100000,
  efectivo: 50000,
  tarjeta: 20000,
  transferencia: 5000,
  devolucion: 3000,
  retiro_total: 40000,
  caja_estado: 1,
  resuelto_por: null,
  // Detalle del turno, igual que en el mensaje de WhatsApp.
  venta: 78000,
  servicio: 40000,
  propina: 9000,
  comision: 7000,
  anticipo: 2000,
  iva: 15000,
  prepago_cargado: 30000,
  prepago_consumido: 18000,
  prepago_pendiente_clientes: 12000,
  // Estado del aviso.
  avisos_enviados: 3,
  ultimo_aviso_en: '2026-09-29 16:35:00',
  minutos_sin_respuesta: 32
};

const montarPagina = async (data: unknown) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, solicitud: data })
    })
  );

  const { container } = render(<ConfirmarCierreCajaPage />);
  await waitFor(() => expect(screen.queryByText('Movimiento del turno')).not.toBeNull());

  return { container, texto: container.textContent ?? '' };
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * El administrador decide desde el link del WhatsApp: si en pantalla solo ve el dinero
 * del cajón, tiene que volver al chat para mirar qué produjo la caja.
 */
describe('La página pública de autorización del cierre', () => {
  it('muestra el movimiento del turno y el prepago, como el mensaje de WhatsApp', async () => {
    const { texto } = await montarPagina(solicitud);

    // Movimiento del turno.
    expect(texto).toContain('Movimiento del turno');
    expect(texto).toContain('Ventas:');
    expect(texto).toContain(formatCurrencyCLP(78000));
    expect(texto).toContain('Servicios:');
    expect(texto).toContain(formatCurrencyCLP(40000));
    expect(texto).toContain('Propinas:');
    expect(texto).toContain('Comisiones:');
    expect(texto).toContain('Anticipos:');
    expect(texto).toContain('IVA:');
    expect(texto).toContain(formatCurrencyCLP(15000));

    // Prepago de clientes.
    expect(texto).toContain('Prepago de clientes');
    expect(texto).toContain('Cargado en el turno:');
    expect(texto).toContain(formatCurrencyCLP(30000));
    expect(texto).toContain('Consumido:');
    expect(texto).toContain(formatCurrencyCLP(18000));
    expect(texto).toContain('Pendiente de clientes:');
    expect(texto).toContain(formatCurrencyCLP(12000));
  });

  it('dice cuántas veces se avisó y desde cuándo no responde nadie', async () => {
    const { texto } = await montarPagina(solicitud);

    expect(texto).toContain('Cierre sin respuesta');
    expect(texto).toContain('Sin respuesta desde:');
    expect(texto).toContain('hace 32 min');
    expect(texto).toContain('Avisos enviados:');
    expect(texto).toContain('Último aviso:');
    expect(texto).toContain('Se avisó 3 veces');
  });

  it('conserva el desglose de dinero, el monto previsto y los botones de decisión', async () => {
    const { texto } = await montarPagina(solicitud);

    expect(texto).toContain('Dinero en caja');
    expect(texto).toContain('Apertura:');
    expect(texto).toContain(formatCurrencyCLP(100000));
    expect(texto).toContain('Anticipos (ya descontados):');
    expect(texto).toContain(`-${formatCurrencyCLP(solicitud.anticipo || 0)}`);
    expect(texto).toContain('Retiros (ya descontados):');
    expect(texto).toContain('Saldos cubiertos con efectivo:');
    expect(texto).toContain('los retiros y los anticipos de turno');
    expect(texto).toContain('Monto de cierre previsto');
    expect(texto).toContain(formatCurrencyCLP(160000));
    expect(texto).toContain('Fin del turno');

    expect(screen.queryByRole('button', { name: /Autorizar cierre/i })).not.toBeNull();
    expect(screen.queryByRole('button', { name: /Rechazar/i })).not.toBeNull();
  });

  it('muestra cuánto falta devolver si el saldo excede el efectivo disponible', async () => {
    const { texto } = await montarPagina({
      ...solicitud,
      saldo_clientes_descontado: 147000,
      saldo_clientes_por_devolver: 53000
    });

    expect(texto).toContain('Falta devolver a clientes:');
    expect(texto).toContain(formatCurrencyCLP(53000));
  });

  it('si el servidor viejo no manda el detalle nuevo, la página sigue funcionando', async () => {
    const sinDetalle: any = { ...solicitud };
    delete sinDetalle.venta;
    delete sinDetalle.servicio;
    delete sinDetalle.propina;
    delete sinDetalle.comision;
    delete sinDetalle.anticipo;
    delete sinDetalle.iva;
    delete sinDetalle.prepago_cargado;
    delete sinDetalle.prepago_consumido;
    delete sinDetalle.prepago_pendiente_clientes;
    delete sinDetalle.avisos_enviados;
    delete sinDetalle.ultimo_aviso_en;
    delete sinDetalle.minutos_sin_respuesta;

    const { texto } = await montarPagina(sinDetalle);

    expect(texto).toContain('Movimiento del turno');
    expect(texto).toContain(formatCurrencyCLP(0));
    expect(texto).toContain('Monto de cierre previsto');
    // Sin el campo del servidor, el aviso se muestra como el primero y recién pedido.
    expect(texto).toContain('hace menos de un minuto');
    expect(texto).toContain('Sin registro');
    expect(screen.queryByRole('button', { name: /Autorizar cierre/i })).not.toBeNull();
  });
});
