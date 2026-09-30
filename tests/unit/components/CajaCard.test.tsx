import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CajaCard } from '@/components/caja/CajaCard';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import type { CajaWithUser } from '@/types/caja';

afterEach(cleanup);

const cajaBase: CajaWithUser = {
  id_caja: 'caja-1',
  fecha_apertura: '2026-09-28 08:00:00',
  usuario_id_apertura: 'user-1',
  monto_apertura: 100000,
  ventas: 50000,
  efectivo: 50000,
  tarjeta: 20000,
  transferencia: 5000,
  servicios: 0,
  devoluciones: 3000,
  iva: 0,
  propina: 0,
  anticipo: 0,
  retiro_total: 0,
  comision: 0,
  monto_cierre: null,
  usuario_id_cierre: null,
  fecha_cierre: null,
  estado: 1,
  cajero_nombre: 'CajeroTest'
};

const renderCard = (
  caja: Partial<CajaWithUser> = {},
  extras: {
    onResendAviso?: (c: CajaWithUser) => void;
    reenviandoAviso?: boolean;
    onReabrirCierre?: (c: CajaWithUser) => void;
    reabriendoCierre?: boolean;
  } = {}
) => {
  const onViewDetails = vi.fn();
  const onCloseCaja = vi.fn();
  const { container } = render(
    <CajaCard
      caja={{ ...cajaBase, ...caja }}
      onViewDetails={onViewDetails}
      onCloseCaja={onCloseCaja}
      {...extras}
    />
  );
  return { container, onViewDetails, onCloseCaja };
};

/**
 * Con el cierre pedido y sin responder la caja sigue abierta, así que sin este aviso
 * la tarjeta se ve igual que un turno que nadie pidió cerrar.
 */
describe('CajaCard · cierre pendiente de autorización', () => {
  it('avisa quién pidió el cierre y desde cuándo, sin dejar de decir que la caja está abierta', () => {
    const { container } = renderCard({
      cierre_pendiente: true,
      cierre_solicitado_por: 'CajeroTest',
      cierre_solicitado_en: '2026-09-28 16:20:00'
    });

    const texto = container.textContent ?? '';
    expect(texto).toContain('Cierre pendiente');
    expect(texto).toContain('Pedido por CajeroTest');
    expect(texto).toMatch(/16[:.]20/);
    expect(texto).toContain('La caja sigue abierta hasta que el administrador autorice');
    // El estado real no se disfraza: la caja sigue abierta.
    expect(texto).toContain('Abierta');
  });

  it('deja de invitar a un segundo pedido desde el botón', () => {
    renderCard({
      cierre_pendiente: true,
      cierre_solicitado_por: 'CajeroTest',
      cierre_solicitado_en: '2026-09-28 16:20:00'
    });

    expect(screen.getByRole('button', { name: 'Cierre pedido' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Cerrar' })).toBeNull();
  });

  it('sin solicitud pendiente la tarjeta no avisa nada y el botón dice "Cerrar"', () => {
    const { container } = renderCard({
      cierre_solicitado_por: null,
      cierre_solicitado_en: null
    });

    expect(container.textContent ?? '').not.toContain('Cierre pendiente');
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeDefined();
  });

  it('deja reenviar el aviso al administrador sin abrir el modal de cierre', () => {
    const onResendAviso = vi.fn();
    const caja = {
      ...cajaBase,
      cierre_pendiente: true,
      cierre_solicitado_por: 'CajeroTest',
      cierre_solicitado_en: '2026-09-28 16:20:00'
    };
    renderCard(caja, { onResendAviso });

    fireEvent.click(screen.getByRole('button', { name: /Reenviar aviso/i }));

    expect(onResendAviso).toHaveBeenCalledWith(expect.objectContaining({ id_caja: 'caja-1' }));
  });

  it('mientras el reenvío está en vuelo el botón no se puede volver a apretar', () => {
    renderCard(
      {
        cierre_pendiente: true,
        cierre_solicitado_por: 'CajeroTest',
        cierre_solicitado_en: '2026-09-28 16:20:00'
      },
      { onResendAviso: vi.fn(), reenviandoAviso: true }
    );

    const boton = screen.getByRole('button', { name: /Reenviando/i });
    expect((boton as HTMLButtonElement).disabled).toBe(true);
  });

  it('no ofrece reenviar cuando no hay permiso ni cierre pendiente', () => {
    renderCard({
      cierre_solicitado_por: null,
      cierre_solicitado_en: null
    });

    expect(screen.queryByRole('button', { name: /Reenviar aviso/i })).toBeNull();
  });

  it('dice desde cuándo va el último aviso cuando hubo reenvíos', () => {
    const { container } = renderCard({
      cierre_pendiente: true,
      cierre_solicitado_por: 'CajeroTest',
      cierre_solicitado_en: '2026-09-28 16:20:00',
      cierre_ultimo_aviso_en: '2026-09-28 16:35:00'
    });

    expect(container.textContent ?? '').toMatch(/Último aviso reenviado: 16[:.]35/);
  });

  it('sin reenvíos no habla de último aviso', () => {
    const { container } = renderCard({
      cierre_pendiente: true,
      cierre_solicitado_por: 'CajeroTest',
      cierre_solicitado_en: '2026-09-28 16:20:00',
      cierre_ultimo_aviso_en: '2026-09-28 16:20:00'
    });

    expect(container.textContent ?? '').not.toContain('Último aviso');
  });

  it('ofrece pedir el cierre de nuevo cuando el administrador no respondió', () => {
    const onReabrirCierre = vi.fn();
    renderCard(
      {
        cierre_pendiente: true,
        cierre_solicitado_por: 'CajeroTest',
        cierre_solicitado_en: '2026-09-28 16:20:00',
        cierre_estancado: true
      },
      { onReabrirCierre }
    );

    fireEvent.click(screen.getByRole('button', { name: /Pedir cierre de nuevo/i }));

    expect(onReabrirCierre).toHaveBeenCalledWith(expect.objectContaining({ id_caja: 'caja-1' }));
  });

  it('no ofrece pedirlo de nuevo mientras el administrador está dentro del plazo', () => {
    renderCard({
      cierre_pendiente: true,
      cierre_solicitado_por: 'CajeroTest',
      cierre_solicitado_en: '2026-09-28 16:20:00',
      cierre_estancado: false
    });

    expect(screen.queryByRole('button', { name: /Pedir cierre de nuevo/i })).toBeNull();
  });

  it('mientras el segundo pedido está en vuelo el botón se bloquea', () => {
    renderCard(
      {
        cierre_pendiente: true,
        cierre_solicitado_por: 'CajeroTest',
        cierre_solicitado_en: '2026-09-28 16:20:00',
        cierre_estancado: true
      },
      { onReabrirCierre: vi.fn(), reabriendoCierre: true }
    );

    const boton = screen.getByRole('button', { name: /Pidiendo/i });
    expect((boton as HTMLButtonElement).disabled).toBe(true);
  });
});

/**
 * `cajas.efectivo` ya viene neto de retiros y anticipos (los restan al registrarse).
 * Si la tarjeta los descontara de nuevo, el balance saldría más bajo que el cajón real
 * y no cuadraría con el monto de cierre.
 */
describe('CajaCard · balance sin doble descuento', () => {
  it('no vuelve a restar los retiros y los anticipos del turno', () => {
    const { container } = renderCard({ anticipo: 60000, retiro_total: 120000 });

    // 100.000 de apertura + 50.000 de efectivo − 3.000 de devoluciones, más tarjeta y
    // transferencia.
    expect(container.textContent ?? '').toContain(formatCurrencyCLP(172000));
    // Los 180.000 que salieron ya no están en `efectivo`: restarlos otra vez daría −8.000.
    expect(container.textContent ?? '').not.toContain(formatCurrencyCLP(-8000));
  });

  it('las devoluciones sí siguen descontándose del efectivo', () => {
    const { container } = renderCard({ devoluciones: 20000 });

    // 100.000 + 50.000 − 20.000, más 20.000 de tarjeta y 5.000 de transferencia.
    expect(container.textContent ?? '').toContain(formatCurrencyCLP(155000));
  });
});
