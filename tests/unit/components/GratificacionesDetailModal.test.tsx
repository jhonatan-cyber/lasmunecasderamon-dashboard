import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import GratificacionesDetailModal from '@/components/gratificaciones/GratificacionesDetailModal';
import { Gratificacion } from '@/types/gratificacion';

vi.mock('@/hooks/auth/useUserPermissions', () => ({
  useUserPermissions: () => ({ hasPermission: () => false })
}));

const row = (overrides: Partial<Gratificacion>): Gratificacion => ({
  id: 'g1',
  fecha_hora: '2026-09-27 12:00:00',
  usuario_id: 'sebas-1',
  usuario: 'Sebastián Flores',
  monto: 500,
  descripcion: 'bono',
  fecha_crea: '2026-09-27 12:00:00',
  fecha_mod: null,
  estado: 2,
  ...overrides
});

afterEach(cleanup);

describe('GratificacionesDetailModal · solicitante', () => {
  it('muestra el bloque Solicitada por cuando la fila tiene solicitante', () => {
    render(
      <GratificacionesDetailModal
        isOpen
        onClose={() => {}}
        gratificacion={row({ solicitante: 'Pepe Cajero', solicitante_id: 'pepe-1' })}
      />
    );

    expect(screen.getByText('Solicitada por')).toBeInTheDocument();
    expect(screen.getByText('Pepe Cajero')).toBeInTheDocument();
  });

  it('marca como autofirmada cuando solicitante y beneficiario son la misma persona', () => {
    render(
      <GratificacionesDetailModal
        isOpen
        onClose={() => {}}
        gratificacion={row({ solicitante: 'Sebastián Flores', solicitante_id: 'sebas-1' })}
      />
    );

    expect(screen.getByText('Sebastián Flores (autofirmada)')).toBeInTheDocument();
  });

  it('oculta el bloque en filas legacy sin solicitante', () => {
    render(
      <GratificacionesDetailModal
        isOpen
        onClose={() => {}}
        gratificacion={row({ solicitante: null, solicitante_id: null })}
      />
    );

    expect(screen.queryByText('Solicitada por')).not.toBeInTheDocument();
  });
});
