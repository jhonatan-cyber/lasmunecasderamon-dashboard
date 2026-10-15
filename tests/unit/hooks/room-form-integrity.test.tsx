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
  it('permite crear una habitación con tiempo, precio y comisión en cero', () => {
    const submit = vi.fn();
    const { result } = renderHook(() => useRoomForm({ open: true, onSubmit: submit }));
    act(() => {
      result.current.handleChange(change('name', 'Sala'));
      for (const field of ['time', 'price', 'comision_anfitriona'])
        result.current.handleChange(change(field, '0'));
    });
    act(() => result.current.handleSubmit(submitEvent));
    expect(submit).toHaveBeenCalledWith({
      name: 'Sala',
      time: '0',
      price: '0',
      comision_anfitriona: '0'
    });
  });
  it('conserva los valores cero al editar', () => {
    const room = { name: 'Sala', price: 0, time: 0, comision_anfitriona: 0 } as Room;
    const { result } = renderHook(() =>
      useRoomForm({ open: true, initialValues: room, onSubmit: vi.fn() })
    );
    expect(result.current.form).toEqual({
      name: 'Sala',
      price: '0',
      time: '0',
      comision_anfitriona: '0'
    });
  });
  it('envía cero para los campos numéricos vacíos', () => {
    const submit = vi.fn();
    const { result } = renderHook(() => useRoomForm({ open: true, onSubmit: submit }));
    act(() => result.current.handleChange(change('name', 'Sala')));
    act(() => result.current.handleSubmit(submitEvent));
    expect(submit).toHaveBeenCalledWith({
      name: 'Sala',
      price: '0',
      time: '0',
      comision_anfitriona: '0'
    });
  });
  it.each(['', '   '])('requiere un nombre: %s', name => {
    const submit = vi.fn();
    const { result } = renderHook(() => useRoomForm({ open: true, onSubmit: submit }));
    act(() => result.current.handleChange(change('name', name)));
    act(() => result.current.handleSubmit(submitEvent));
    expect(submit).not.toHaveBeenCalled();
    expect(result.current.errors.name).toBeDefined();
  });
  it.each(['-5', 'Infinity', 'NaN'])('rechaza una duración inválida: %s', time => {
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
