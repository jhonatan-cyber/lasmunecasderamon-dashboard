import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Button } from '@/components/ui/button';
import { beginRegistration } from '@/lib/store/registrationStore';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('bloquea dos clics antes de renderizar y se libera al terminar', async () => {
  let release!: () => void;
  const callback = vi.fn(
    () =>
      new Promise<void>(resolve => {
        release = resolve;
      })
  );
  render(
    <Button type='button' onClick={callback}>
      Registrar
    </Button>
  );
  const button = screen.getByRole('button');
  act(() => {
    button.click();
    button.click();
  });
  expect(callback).toHaveBeenCalledTimes(1);
  expect(button).toBeDisabled();
  await act(async () => release());
  expect(button).toBeEnabled();
});
it('deshabilita botones de registro mientras hay una escritura en vuelo', () => {
  render(
    <>
      <Button type='submit'>Guardar</Button>
      <Button type='button'>Navegar</Button>
    </>
  );
  let finish!: () => void;
  act(() => {
    finish = beginRegistration();
  });
  expect(screen.getByText('Guardar')).toBeDisabled();
  expect(screen.getByText('Navegar')).toBeEnabled();
  act(() => finish());
  expect(screen.getByText('Guardar')).toBeEnabled();
});
it('se libera tras un fallo y permite corregir y volver a registrar', async () => {
  const reportError = vi.fn();
  vi.stubGlobal('reportError', reportError);
  const callback = vi.fn().mockRejectedValue(new Error('fallo'));
  render(
    <Button type='button' onClick={callback}>
      Registrar
    </Button>
  );
  await act(async () => {
    fireEvent.click(screen.getByRole('button'));
  });
  expect(screen.getByRole('button')).toBeEnabled();
  await act(async () => {
    fireEvent.click(screen.getByRole('button'));
  });
  expect(callback).toHaveBeenCalledTimes(2);
  expect(reportError).toHaveBeenCalledTimes(2);
});
it('no bloquea acciones sincronas como aumentar una cantidad', () => {
  const callback = vi.fn();
  render(
    <Button type='button' onClick={callback}>
      Aumentar
    </Button>
  );
  fireEvent.click(screen.getByRole('button'));
  fireEvent.click(screen.getByRole('button'));
  expect(callback).toHaveBeenCalledTimes(2);
});
