import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ChangeEvent, FormEvent } from 'react';
import { useAdvanceForm } from '@/hooks/personal/useAdvanceForm';
import { useOvertimeForm } from '@/hooks/personal/useOvertimeForm';
const mocks = vi.hoisted(() => ({ setPageSize: vi.fn(), setFilterStatus: vi.fn() }));
vi.mock('@/hooks/personal', () => ({
  useUsers: () => ({ users: [], isLoading: false, ...mocks }),
  useEmployees: () => ({ data: { data: [] } })
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
const event = () => ({ preventDefault: vi.fn() }) as unknown as FormEvent;
const amount = (value: string) => ({ target: { value } }) as ChangeEvent<HTMLInputElement>;
describe('formularios de personal', () => {
  it('horas extras: conserva el formulario cuando la página devuelve un fallo controlado', async () => {
    const { result } = renderHook(() =>
      useOvertimeForm({ onSubmit: vi.fn().mockResolvedValue(false) })
    );
    act(() => {
      result.current.setSelectedUser('1');
      result.current.setHora('2');
      result.current.handleMontoChange(amount('500'));
    });
    await act(async () => {
      await result.current.handleSubmit(event());
    });
    expect(result.current.selectedUser).toBe('1');
    expect(result.current.hora).toBe('2');
    expect(result.current.monto).toBe('500');
    expect(result.current.isSubmitting).toBe(false);
  });
  it('anticipos: un saldo anterior no reemplaza al empleado actual', async () => {
    let finish!: (value: object) => void;
    const request = vi.fn().mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finish = resolve;
        })
    );
    request.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { montoMaximo: 500 } })
    });
    vi.stubGlobal('fetch', request);
    const { result } = renderHook(() => useAdvanceForm({ open: true, onSubmit: vi.fn() }));
    act(() => result.current.setSelectedUser('1'));
    act(() => result.current.setSelectedUser('2'));
    await waitFor(() => expect(result.current.balance).toBe(500));
    await act(async () => {
      finish({ ok: true, json: async () => ({ success: true, data: { montoMaximo: 100 } }) });
    });
    expect(result.current.balance).toBe(500);
    expect(request.mock.calls[0][1].signal.aborted).toBe(true);
    act(() => result.current.setSelectedUser(''));
    expect(result.current.balance).toBeNull();
    expect(result.current.loadingBalance).toBe(false);
  });
  it.each(['anticipo', 'hora'])(
    '%s: evita el envío doble y conserva datos después de un rechazo',
    async module => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, data: { montoMaximo: 1000 } })
        })
      );
      let reject!: (error: Error) => void;
      const submit = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<void>((_, fail) => {
              reject = fail;
            })
        )
        .mockResolvedValue(undefined);
      const { result } = renderHook(() => {
        const advance = useAdvanceForm({ open: true, onSubmit: submit });
        const overtime = useOvertimeForm({ onSubmit: submit });
        return module === 'anticipo'
          ? {
              selectedUser: advance.selectedUser,
              select: advance.setSelectedUser,
              amount: advance.handleMontoChange,
              send: advance.handleSubmit,
              busy: advance.isSubmitting,
              setHours: (_value: string) => {}
            }
          : {
              selectedUser: overtime.selectedUser,
              select: overtime.setSelectedUser,
              amount: overtime.handleMontoChange,
              send: overtime.handleSubmit,
              busy: overtime.isSubmitting,
              setHours: overtime.setHora
            };
      });
      act(() => {
        result.current.select('1');
        result.current.amount(amount('500'));
        result.current.setHours('2');
      });
      let pending!: Promise<void>;
      act(() => {
        pending = result.current.send(event());
      });
      expect(result.current.busy).toBe(true);
      await act(async () => {
        await result.current.send(event());
      });
      expect(submit).toHaveBeenCalledTimes(1);
      await act(async () => {
        const assertion = expect(pending).rejects.toThrow('Rechazado');
        reject(new Error('Rechazado'));
        await assertion;
      });
      expect(result.current.selectedUser).toBe('1');
      expect(result.current.busy).toBe(false);
      await act(async () => {
        await result.current.send(event());
      });
      expect(submit).toHaveBeenCalledTimes(2);
      if (module === 'hora') expect(result.current.selectedUser).toBe('');
    }
  );
  it.each(['', '0', '-1', 'Infinity', 'NaN', '2texto'])(
    'horas extras: no envía una cantidad inválida: %s',
    async hours => {
      const submit = vi.fn();
      const { result } = renderHook(() => useOvertimeForm({ onSubmit: submit }));
      act(() => {
        result.current.setSelectedUser('1');
        result.current.setHora(hours);
        result.current.handleMontoChange(amount('500'));
      });
      await act(async () => {
        await result.current.handleSubmit(event());
      });
      expect(submit).not.toHaveBeenCalled();
    }
  );
});
