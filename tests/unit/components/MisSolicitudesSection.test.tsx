import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import MisSolicitudesSection from '@/components/gratificaciones/MisSolicitudesSection';
import { Gratificacion } from '@/types/gratificacion';

const row = (overrides: Partial<Gratificacion>): Gratificacion => ({
  id: 'r1',
  fecha_hora: '2026-01-01',
  usuario_id: 'user-a',
  usuario: 'Sebastián Gómez',
  monto: 123,
  descripcion: 'bono de cierre',
  fecha_crea: '2026-04-20T10:00:00',
  fecha_mod: null,
  estado: 2,
  ...overrides
});

vi.mock('@/hooks/auth/useUserPermissions', () => ({
  useUserPermissions: () => ({ hasPermission: () => false })
}));

afterEach(cleanup);

describe('MisSolicitudesSection', () => {
  it('renderiza la sección con aria-label y contador', () => {
    render(
      <MisSolicitudesSection
        loading={false}
        rows={[row({ id: 'r1' }), row({ id: 'r2', usuario: 'Lizeth Villa Pardo', monto: 500 })]}
        rowsPerPage={10}
        onViewDetail={() => {}}
      />
    );

    expect(screen.getByLabelText('Mis solicitudes de gratificaciones')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Sebastián Gómez')).toBeInTheDocument();
    expect(screen.getByText('Lizeth Villa Pardo')).toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay solicitudes', () => {
    render(
      <MisSolicitudesSection loading={false} rows={[]} rowsPerPage={10} onViewDetail={() => {}} />
    );

    expect(screen.getByText('No has solicitado gratificaciones para otros')).toBeInTheDocument();
  });

  it('dispara onViewDetail con la fila al pulsar Ver detalle', () => {
    const onViewDetail = vi.fn();
    render(
      <MisSolicitudesSection
        loading={false}
        rows={[row({ id: 'abc' })]}
        rowsPerPage={10}
        onViewDetail={onViewDetail}
      />
    );

    fireEvent.click(screen.getByText('Ver detalle'));

    expect(onViewDetail).toHaveBeenCalledTimes(1);
    expect(onViewDetail.mock.calls[0][0].id).toBe('abc');
  });

  it('en loading muestra skeletons y no filas', () => {
    render(
      <MisSolicitudesSection loading rows={[row({})]} rowsPerPage={10} onViewDetail={() => {}} />
    );

    expect(screen.queryByText('Sebastián Gómez')).not.toBeInTheDocument();
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});
