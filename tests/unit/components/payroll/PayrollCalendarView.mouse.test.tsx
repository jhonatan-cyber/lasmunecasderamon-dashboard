import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PayrollCalendarView } from '@/components/payroll/calendar/PayrollCalendarView';
import { useCalendarSelection } from '@/hooks/calendar/useCalendarSelection';
import { getMonthDays } from '@/hooks/calendar/roleCalendarGrid';
import { toDateKey } from '@/lib/utils/calendarUtils';

const CURRENT_MONTH = new Date(2026, 10, 1);

const months = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
];

const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function CalendarHarness({ onSelectionComplete }: { onSelectionComplete: () => void }) {
  const selection = useCalendarSelection('servicios', { onSelectionComplete });

  return (
    <>
      <PayrollCalendarView
        currentDate={CURRENT_MONTH}
        currentView='month'
        months={months}
        weekdays={weekdays}
        canViewDetails
        isDragging={selection.isDragging}
        getDaysInMonth={getMonthDays}
        isToday={() => false}
        isDateSelected={selection.isSelected}
        handleMouseDown={selection.handleMouseDown}
        handleMouseEnter={selection.handleMouseEnter}
        handleMouseUp={selection.handleMouseUp}
        handleTouchStart={selection.handleTouchStart}
        handleTouchMove={selection.handleTouchMove}
        handleTouchEnd={selection.handleTouchEnd}
        handleTouchCancel={selection.handleTouchCancel}
        renderDateActions={() => null}
        getActionsForDate={() => []}
      />
      <output data-testid='selected-dates'>
        {selection.selectedDates.map(toDateKey).join(',')}
      </output>
    </>
  );
}

const cellForDay = (day: number) =>
  document.querySelector<HTMLElement>(
    `[data-calendar-date="${new Date(2026, 10, day).getTime()}"]`
  )!;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('un clic deja seleccionado el día y abre el detalle', () => {
  const onSelectionComplete = vi.fn();
  render(<CalendarHarness onSelectionComplete={onSelectionComplete} />);

  fireEvent.mouseDown(cellForDay(5), { button: 0 });
  fireEvent.mouseUp(cellForDay(5), { button: 0 });

  expect(screen.getByTestId('selected-dates').textContent).toBe('2026-11-05');
  expect(onSelectionComplete).toHaveBeenCalledTimes(1);
});

it('arrastrar con el mouse selecciona el rango completo', () => {
  const onSelectionComplete = vi.fn();
  render(<CalendarHarness onSelectionComplete={onSelectionComplete} />);

  fireEvent.mouseDown(cellForDay(2), { button: 0 });
  fireEvent.mouseEnter(cellForDay(3));
  fireEvent.mouseEnter(cellForDay(4));
  fireEvent.mouseUp(cellForDay(4), { button: 0 });

  expect(screen.getByTestId('selected-dates').textContent).toBe('2026-11-02,2026-11-03,2026-11-04');
  expect(onSelectionComplete).toHaveBeenCalledTimes(1);
});

it('pasar el mouse sin presionar no altera la selección', () => {
  const onSelectionComplete = vi.fn();
  render(<CalendarHarness onSelectionComplete={onSelectionComplete} />);

  fireEvent.mouseEnter(cellForDay(9));
  fireEvent.mouseEnter(cellForDay(10));

  expect(screen.getByTestId('selected-dates').textContent).toBe('');
  expect(onSelectionComplete).not.toHaveBeenCalled();
});
