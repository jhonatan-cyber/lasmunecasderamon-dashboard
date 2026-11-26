import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoversTab } from '@/components/bar/CoversTab';

vi.mock('@/hooks/auth/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: { role: 'administrador' } })
}));
vi.mock('@/hooks/auth/useUserPermissions', () => ({
  useUserPermissions: () => ({
    hasPermission: (modulo: string, accion: string) => modulo === 'entradas' && accion === 'deliver'
  })
}));
vi.mock('@/hooks/realtime/useRealtimeRefresh', () => ({ useRealtimeRefresh: () => undefined }));
vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfigValue: () => 10000 }));
vi.mock('@/lib/business/timezoneService', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/business/timezoneService')>()),
  fechaDeNegocio: () => '2026-11-25'
}));
vi.mock('@/components/bar/SolicitudesCoversPanel', () => ({ SolicitudesCoversPanel: () => null }));
vi.mock('@/components/bar/EntregaCoversDialog', () => ({
  EntregaCoversDialog: ({
    grupo,
    onClose
  }: {
    grupo: { filas: { id: string }[]; cantidad: number; total: number } | null;
    onClose: () => void;
    tope: number;
    modo: 'entrega' | 'solicitud';
    onEntregado: () => void | Promise<void>;
  }) =>
    grupo ? (
      <div role='dialog' aria-label='Entrega de covers'>
        <output data-testid='seleccion-dialogo'>
          {`${grupo.filas.map(fila => fila.id).join(',')}|${grupo.cantidad}|${grupo.total}`}
        </output>
        <button type='button' onClick={onClose}>
          Cerrar diálogo
        </button>
      </div>
    ) : null
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CoversTab', () => {
  it('permite abrir una entrada individual sin perder la opción de entregar el grupo', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            id: 'entrada-1',
            grupo_registro_id: 'compra-1',
            cliente_nombre: 'Mesa 1',
            monto_entrada: 10000,
            metodo_pago: 'efectivo',
            fecha: '2026-11-25',
            hora: '21:00',
            caja_id: 'caja-1',
            registrado_por_nombre: 'Carla'
          },
          {
            id: 'entrada-2',
            grupo_registro_id: 'compra-1',
            cliente_nombre: 'Mesa 1',
            monto_entrada: 10000,
            metodo_pago: 'efectivo',
            fecha: '2026-11-25',
            hora: '21:00',
            caja_id: 'caja-1',
            registrado_por_nombre: 'Carla'
          }
        ]
      })
    }));
    vi.stubGlobal('fetch', fetchMock);

    render(<CoversTab />);

    fireEvent.click(await screen.findByRole('button', { name: 'Mostrar las entradas de Mesa 1' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Entregar entrada entrada-1 individualmente' })
    );
    expect(await screen.findByTestId('seleccion-dialogo')).toHaveTextContent('entrada-1|1|10000');

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar diálogo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Entregar 2 covers de Mesa 1' }));
    expect(screen.getByTestId('seleccion-dialogo')).toHaveTextContent(
      'entrada-1,entrada-2|2|20000'
    );
  });
});
