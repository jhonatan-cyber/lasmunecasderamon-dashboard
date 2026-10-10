import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ChangeEvent, FocusEvent, FormEvent } from 'react';
import { useRoomForm } from '@/hooks/personal/useRoomForm';
import type { Room } from '@/types/room';
afterEach(cleanup);
const change = (name: string, value: string) =>
  ({ target: { name, value } }) as ChangeEvent<HTMLInputElement>;
const focus = (name: string) => ({ target: { name } }) as FocusEvent<HTMLInputElement>;
const submitEvent = { preventDefault: vi.fn() } as unknown as FormEvent;
describe('formulario de habitaciones', () => {
  it('recupera el último precio editado después de enfocar y salir sin escribir', () => {
    const room = { name: 'Sala', price: 1000, time: 30 } as Room;
    const { result } = renderHook(() =>
      useRoomForm({ open: true, initialValues: room, onSubmit: vi.fn() })
    );
    act(() => result.current.handleChange(change('price', '2000')));
    act(() => result.current.handleFocus(focus('price')));
    act(() => result.current.handleBlur(focus('price')));
    expect(result.current.form.price).toBe('2.000');
  });
  it.each(['0', '-5', 'Infinity', 'NaN'])('rechaza una duración inválida: %s', time => {
    const submit = vi.fn();
    const { result } = renderHook(() => useRoomForm({ open: true, onSubmit: submit }));
    act(() => {
      result.current.handleChange(change('name', 'Sala'));
      result.current.handleChange(change('price', '1000'));
      result.current.handleChange(change('time', time));
    });
    act(() => result.current.handleSubmit(submitEvent));
    expect(submit).not.toHaveBeenCalled();
    expect(result.current.errors.time).toBeDefined();
  });
});
