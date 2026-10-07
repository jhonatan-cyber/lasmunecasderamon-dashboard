import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { BiometricStatus } from '@/components/settings/BiometricStatus';

const harness = vi.hoisted(() => ({ onMessage: (_payload: any) => {}, url: '' }));
vi.mock('@/hooks/shared/useSharedSSE', () => ({
  useSharedSSE: (url: string, onMessage: (payload: any) => void) => {
    harness.url = url;
    harness.onMessage = onMessage;
    return { isConnected: true, reconnect: vi.fn() };
  }
}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('estado biométrico en tiempo real', () => {
  it('actualiza las marcas al recibir el mensaje SSE del canal autenticado', async () => {
    const estado = { asistenciasBiometricasHoy: 0, asistencias: [], ventana: { inicio: 18, fin: 6 }, lectores: [], pollerActivo: true };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: estado }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<BiometricStatus />);
    await screen.findByText('Todavía nadie marcó asistencia hoy.');
    expect(harness.url).toBe('/api/notifications/sse');
    act(() => harness.onMessage({ type: 'ping' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { ...estado, asistenciasBiometricasHoy: 1 } }) });
    act(() => harness.onMessage({ type: 'attendance_registered', data: { usuario_id: 'prueba' } }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await screen.findByText('1');
  });
});
