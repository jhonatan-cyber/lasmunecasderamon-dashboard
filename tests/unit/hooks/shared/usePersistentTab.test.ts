import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { usePersistentTab } from '@/hooks/shared/usePersistentTab';

const CLAVE = 'tab_test';
const VALIDOS = ['empresa', 'bar', 'logs'] as const;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('usePersistentTab', () => {
  it('abre en el tab por defecto y no escribe nada hasta que se elige uno', () => {
    const { result } = renderHook(() => usePersistentTab(CLAVE, VALIDOS, 'empresa'));

    expect(result.current[0]).toBe('empresa');
    expect(window.localStorage.getItem(CLAVE)).toBeNull();
  });

  it('parte del default para que la hidratación coincida y después salta al guardado', async () => {
    window.localStorage.setItem(CLAVE, 'bar');
    const vistos: string[] = [];
    const { result } = renderHook(() => {
      const [tab, setTab] = usePersistentTab(CLAVE, VALIDOS, 'empresa');
      vistos.push(tab);
      return [tab, setTab] as const;
    });

    expect(vistos[0]).toBe('empresa');
    await waitFor(() => expect(result.current[0]).toBe('bar'));
  });

  it('guarda el tab que se elige', () => {
    const { result } = renderHook(() => usePersistentTab(CLAVE, VALIDOS, 'empresa'));

    act(() => result.current[1]('bar'));

    expect(result.current[0]).toBe('bar');
    expect(window.localStorage.getItem(CLAVE)).toBe('bar');
  });

  it('ignora un valor guardado que ya no es un tab de la página', async () => {
    // Tab eliminado o renombrado: se vuelve al primero en vez de dejar la página en blanco.
    window.localStorage.setItem(CLAVE, 'tab-que-no-existe');
    const { result } = renderHook(() => usePersistentTab(CLAVE, VALIDOS, 'empresa'));

    await waitFor(() => expect(result.current[0]).toBe('empresa'));
  });

  it('funciona igual si el navegador bloquea localStorage', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('almacenamiento bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('almacenamiento bloqueado');
    });

    const { result } = renderHook(() => usePersistentTab(CLAVE, VALIDOS, 'empresa'));
    expect(result.current[0]).toBe('empresa');

    // El tab sigue cambiando en pantalla aunque no se pueda recordar.
    act(() => result.current[1]('logs'));
    expect(result.current[0]).toBe('logs');
  });
});
