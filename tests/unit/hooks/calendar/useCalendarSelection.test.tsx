import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useCalendarSelection } from '@/hooks/calendar/useCalendarSelection';
import { toDateKey } from '@/lib/utils/calendarUtils';

const DAY_ONE = new Date(2026, 10, 2);
const DAY_THREE = new Date(2026, 10, 4);

const mockCellAtPoint = (date: Date | null) => {
  const cell = document.createElement('div');
  if (date) cell.dataset.calendarDate = String(date.getTime());
  const elementFromPoint = vi.fn(() => cell);
  document.elementFromPoint = elementFromPoint as typeof document.elementFromPoint;
  return elementFromPoint;
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  // @ts-expect-error jsdom no implementa elementFromPoint; se restaura al original inexistente.
  delete document.elementFromPoint;
});

it('un toque sobre un día selecciona esa fecha y abre el detalle', () => {
  const { result } = renderHook(() => useCalendarSelection('servicios'));

  act(() => {
    result.current.handleTouchStart(DAY_ONE, 10, 10);
    result.current.handleTouchEnd();
  });

  expect(result.current.selectedDates.map(toDateKey)).toEqual(['2026-11-02']);
  expect(result.current.isModalOpen).toBe(true);
});

it('un arrastre táctil extiende la selección hasta el día bajo el dedo', () => {
  const onSelectionComplete = vi.fn();
  mockCellAtPoint(DAY_THREE);
  const { result } = renderHook(() => useCalendarSelection('servicios', { onSelectionComplete }));

  act(() => {
    result.current.handleTouchStart(DAY_ONE, 10, 10);
  });
  act(() => {
    result.current.handleTouchMove(120, 10);
  });
  act(() => {
    result.current.handleTouchEnd();
  });

  expect(result.current.selectedDates.map(toDateKey)).toEqual([
    '2026-11-02',
    '2026-11-03',
    '2026-11-04'
  ]);
  expect(onSelectionComplete).toHaveBeenCalledTimes(1);
});

it('un desplazamiento vertical descarta la selección en vez de abrir el detalle', () => {
  const onSelectionComplete = vi.fn();
  const { result } = renderHook(() => useCalendarSelection('servicios', { onSelectionComplete }));

  act(() => {
    result.current.handleTouchStart(DAY_ONE, 10, 10);
  });
  act(() => {
    result.current.handleTouchMove(12, 60);
  });
  act(() => {
    result.current.handleTouchEnd();
  });

  expect(result.current.selectedDates).toEqual([]);
  expect(onSelectionComplete).not.toHaveBeenCalled();
});
