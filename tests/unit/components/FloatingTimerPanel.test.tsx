import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { FloatingTimerPanel } from '@/components/dashboard/FloatingTimerPanel';

beforeEach(() => {
  localStorage.setItem(
    'dashboard.floating-timer.preferences',
    JSON.stringify({ hidden: false, position: null })
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
  vi.stubGlobal('PointerEvent', MouseEvent);
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn()
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 100,
    y: 100,
    left: 100,
    top: 100,
    width: 320,
    height: 160,
    right: 420,
    bottom: 260,
    toJSON() {}
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('FloatingTimerPanel', () => {
  it('oculta el panel y permite restaurar los temporizadores', () => {
    render(
      <FloatingTimerPanel count={2}>
        <span>Habitación VIP · 12:00</span>
      </FloatingTimerPanel>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar temporizadores' }));
    expect(screen.queryByText('Habitación VIP · 12:00')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar temporizadores' }));
    expect(screen.getByText('Habitación VIP · 12:00')).toBeInTheDocument();
  });
  it('arrastra desde el control de mover y mantiene el panel dentro de la pantalla', () => {
    const { container } = render(<FloatingTimerPanel count={1}>VIP</FloatingTimerPanel>);
    const handle = screen.getByRole('button', { name: 'Mover temporizadores' });
    fireEvent.pointerDown(handle, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(handle, { clientX: 150, clientY: 140 });
    const panel = container.querySelector('.fixed') as HTMLElement;
    expect(panel.style.left).toBe('150px');
    expect(panel.style.top).toBe('140px');
    fireEvent.pointerMove(handle, { clientX: -200, clientY: -200 });
    expect(panel.style.left).toBe('8px');
    expect(panel.style.top).toBe('8px');
    fireEvent.pointerUp(handle);
    fireEvent.pointerMove(handle, { clientX: 200, clientY: 200 });
    expect(panel.style.left).toBe('8px');
  });
  it('conserva la posición y el estado oculto al desmontar y volver a montar en otro módulo', () => {
    const first = render(<FloatingTimerPanel count={1}>VIP</FloatingTimerPanel>);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Mover temporizadores' }), {
      key: 'ArrowLeft'
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar temporizadores' }));
    first.unmount();
    const second = render(<FloatingTimerPanel count={2}>Otra habitación</FloatingTimerPanel>);
    expect(screen.getByRole('button', { name: 'Mostrar temporizadores' })).toBeInTheDocument();
    expect(screen.queryByText('Otra habitación')).not.toBeInTheDocument();
    expect((second.container.querySelector('.fixed') as HTMLElement).style.left).toBe('80px');
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar temporizadores' }));
    expect(screen.getByText('Otra habitación')).toBeInTheDocument();
  });
  it('descarta una posición inválida guardada', () => {
    localStorage.setItem(
      'dashboard.floating-timer.preferences',
      JSON.stringify({ hidden: true, position: { x: 'bad', y: null } })
    );
    const { container } = render(<FloatingTimerPanel count={1}>VIP</FloatingTimerPanel>);
    expect(screen.getByRole('button', { name: 'Mostrar temporizadores' })).toBeInTheDocument();
    expect((container.querySelector('.fixed') as HTMLElement).style.right).toBe('16px');
  });
  it('permite moverlo con el teclado', () => {
    const { container } = render(<FloatingTimerPanel count={1}>VIP</FloatingTimerPanel>);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Mover temporizadores' }), {
      key: 'ArrowLeft'
    });
    expect((container.querySelector('.fixed') as HTMLElement).style.left).toBe('80px');
  });
});
