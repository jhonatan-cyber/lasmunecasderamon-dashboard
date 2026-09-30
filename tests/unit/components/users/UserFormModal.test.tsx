import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UserFormModal } from '@/components/users/UserFormModal';

/**
 * La sección «Dar de alta en el lector al crear» del formulario de usuario.
 *
 * Solo se ofrece si hay equipos operativos (con IP y credenciales, sin revocar),
 * y viene marcada por defecto: al guardar, el servidor da de alta a la persona
 * y el resultado vuelve en `altaEquipo` (lo prueba usersRoute.test.ts).
 */

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

// El setup global mockea react-query pero sin `useQueryClient`, que `useRoles`
// (vía `useGenericFetch`) necesita: aquí se completa el mock para este test.
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false, error: null, refetch: vi.fn() })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), mutateAsync: vi.fn() })),
  useQueryClient: vi.fn(() => ({
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
    clear: vi.fn()
  })),
  QueryClient: vi.fn().mockImplementation(() => ({ setDefaultOptions: vi.fn(), clear: vi.fn() })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children
}));

const EQUIPOS = [
  {
    id: 'dev-1',
    nombre: 'Puerta principal',
    marca: 'dahua',
    serial: 'SERIAL1',
    ip: '192.168.0.5',
    usuario_equipo: 'admin',
    revocado_en: null
  },
  // No operativo: sin IP/credenciales y revocado → no se ofrece para el alta.
  {
    id: 'dev-2',
    nombre: 'Lector dado de baja',
    marca: 'dahua',
    serial: 'SERIAL2',
    ip: null,
    usuario_equipo: null,
    revocado_en: '2026-01-01 10:00:00'
  }
];

function instalarFetch(equipos: unknown) {
  const request = vi.fn(async (url: any) => {
    const u = String(url);
    if (u.includes('/api/biometric/devices')) {
      return { ok: true, json: async () => ({ success: true, data: equipos }) };
    }
    return { ok: true, json: async () => ({ success: true, data: [] }) };
  });
  vi.stubGlobal('fetch', request);
  return request;
}

function renderModal() {
  return render(
    <UserFormModal
      user={null}
      isOpen
      isEditing={false}
      isMutating={false}
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
    />
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('alta en el lector al crear usuario', () => {
  it('ofrece solo los equipos operativos y propone el alta activada', async () => {
    instalarFetch(EQUIPOS);
    renderModal();

    const checkbox = await screen.findByRole('checkbox', { name: /Dar de alta en el lector/i });
    await waitFor(() => expect(checkbox).toBeChecked());

    // El equipo revocado no aparece en el selector.
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByLabelText('Equipo')).toHaveTextContent('Puerta principal · 192.168.0.5');
  });

  it('permite desmarcar el alta antes de guardar', async () => {
    instalarFetch(EQUIPOS);
    renderModal();

    const checkbox = await screen.findByRole('checkbox', { name: /Dar de alta en el lector/i });
    await waitFor(() => expect(checkbox).toBeChecked());

    fireEvent.click(checkbox);
    await waitFor(() => expect(checkbox).not.toBeChecked());
  });

  it('sin equipos operativos no ofrece dar de alta', async () => {
    instalarFetch([]);
    renderModal();

    await waitFor(() => {
      expect(
        screen.queryByRole('checkbox', { name: /Dar de alta en el lector/i })
      ).not.toBeInTheDocument();
    });
  });
});
