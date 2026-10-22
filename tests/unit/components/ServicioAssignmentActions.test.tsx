import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ServicioAssignmentActions } from '@/components/services/ServicioAssignmentActions';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it('busca anfitrionas, muestra quién entra o sale y guarda la selección final', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: [
        { id_usuario: 'ana', nick: 'Ana', estado_servicio: 1 },
        { id_usuario: 'bea', nick: 'Bea', estado_servicio: 0 }
      ]
    })
  });
  vi.stubGlobal('fetch', fetchMock);
  const onUpdate = vi.fn();
  render(
    <ServicioAssignmentActions
      servicio={
        {
          id: 'servicio-1',
          estado: 2,
          habitacion_numero: 'VIP',
          codigo: 'S-1',
          anfitrionas_ids: 'ana',
          anfitrionas_nombres: 'Ana'
        } as any
      }
      onUpdate={onUpdate}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar o liberar anfitrionas' }));
  await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(2));
  fireEvent.change(screen.getByRole('textbox', { name: 'Buscar anfitriona' }), {
    target: { value: 'Bea' }
  });
  fireEvent.click(screen.getByRole('checkbox'));
  expect(screen.getByText('1 entran')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Buscar anfitriona' }), {
    target: { value: '' }
  });
  fireEvent.click(screen.getAllByRole('checkbox')[0]);
  expect(screen.getByText('1 salen')).toBeInTheDocument();
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  });
  expect(fetchMock).toHaveBeenLastCalledWith(
    '/api/services/servicio-1/hostesses',
    expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ usuarios: ['bea'] }) })
  );
  expect(onUpdate).toHaveBeenCalledOnce();
});
