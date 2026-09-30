import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from '@/components/ui/dialog';
import { CajaDetailsHeader } from '@/components/caja/details/CajaDetailsHeader';

afterEach(cleanup);

/** `DialogTitle` de Radix exige el contexto de `Dialog`, así que se envuelve. */
const renderHeader = (
  cierrePendiente: { solicitadoPor: string | null; solicitadoEn: string | null } | null = null
) => {
  const { container } = render(
    <Dialog open>
      <CajaDetailsHeader
        fechaApertura='2026-09-28 08:00:00'
        estadoInfo={{ label: 'En curso', color: 'bg-emerald-500/10' }}
        cierrePendiente={cierrePendiente}
        onPrint={vi.fn()}
        onExportPdf={vi.fn()}
      />
    </Dialog>
  );
  return container;
};

/**
 * El detalle del turno tiene que decir que el cierre está pedido y sin responder:
 * si no, la caja se ve abierta sin explicación y nadie sabe que falta autorizar.
 */
describe('CajaDetailsHeader · cierre pendiente de autorización', () => {
  it('avisa quién pidió el cierre, desde cuándo y que el turno sigue abierto', () => {
    const container = renderHeader({
      solicitadoPor: 'CajeroTest',
      solicitadoEn: '2026-09-28 16:20:00'
    });

    const texto = container.textContent ?? '';
    expect(texto).toContain('Cierre pendiente de autorización');
    expect(texto).toContain('Pedido por CajeroTest');
    expect(texto).toMatch(/16[:.]20/);
    expect(texto).toContain('La caja sigue abierta');
    // El chip de estado no miente: el turno sigue en curso.
    expect(texto).toContain('En curso');
  });

  it('sin cierre pedido la cabecera queda como siempre', () => {
    const container = renderHeader();
    expect(container.textContent ?? '').not.toContain('Cierre pendiente');
    expect(container.textContent ?? '').toContain('Detalles de Caja');
  });
});
