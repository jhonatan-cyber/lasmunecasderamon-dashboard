import { createRef } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { StatusTabs } from '@/components/shared/StatusTabs';
import { ReportToolbar, DAILY_REPORT_PERIODS } from '@/components/shared/ReportToolbar';
import { FilterSelect } from '@/components/shared/selects';
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';
import { SortSelect } from '@/components/shared/selects/SortSelect';

afterEach(cleanup);

it('agrupa el campo y el botón de dirección conservando el otro valor al cambiarlos', async () => {
  const onChange = vi.fn();
  render(
    <SortSelect
      field='fecha'
      direction='desc'
      options={[
        { value: 'fecha', label: 'Fecha' },
        { value: 'monto', label: 'Monto' }
      ]}
      onChange={onChange}
    />
  );
  expect(screen.getAllByRole('combobox')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Orden descendente. Cambiar a ascendente' }));
  expect(onChange).toHaveBeenCalledWith('fecha', 'asc');
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Ordenar por' }), { key: 'ArrowDown' });
  fireEvent.click(await screen.findByRole('option', { name: 'Monto' }));
  expect(onChange).toHaveBeenLastCalledWith('monto', 'desc');
});

it('conserva referencias y cambios nativos en campos y casillas', () => {
  const reference = createRef<HTMLInputElement>();
  const onChange = vi.fn();
  render(
    <>
      <Input ref={reference} aria-label='Código' />
      <Input aria-label='Habilitado' type='checkbox' onChange={onChange} />
    </>
  );
  expect(reference.current).toBe(screen.getByLabelText('Código'));
  const checkbox = screen.getByRole('checkbox');
  fireEvent.click(checkbox);
  expect(checkbox).toBeChecked();
  expect(onChange).toHaveBeenCalledOnce();
});

it('mantiene selección nativa y propaga el valor sin cambiar el contrato del formulario', () => {
  const onChange = vi.fn();
  render(
    <NativeSelect
      aria-label='Pago'
      defaultValue='efectivo'
      onChange={event => onChange(event.target.value)}
    >
      <option value='efectivo'>Efectivo</option>
      <option value='tarjeta'>Tarjeta</option>
    </NativeSelect>
  );
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'tarjeta' } });
  expect(onChange).toHaveBeenCalledWith('tarjeta');
});

it('respeta el tipo y el bloqueo de acciones especializadas', () => {
  const submit = vi.fn(event => event.preventDefault());
  const click = vi.fn();
  render(
    <form onSubmit={submit}>
      <Button variant='unstyled' type='button' onClick={click}>
        Acción
      </Button>
      <Button variant='unstyled' type='button' disabled onClick={click}>
        Bloqueado
      </Button>
    </form>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Acción' }));
  fireEvent.click(screen.getByRole('button', { name: 'Bloqueado' }));
  expect(click).toHaveBeenCalledOnce();
  expect(submit).not.toHaveBeenCalled();
});

it('ejecuta la acción de la pestaña seleccionada y expone el estado activo', () => {
  const pending = vi.fn(),
    paid = vi.fn();
  render(
    <StatusTabs
      items={[
        { label: 'Pendientes', count: 2, active: true, onSelect: pending, tone: 'warning' },
        { label: 'Pagadas', count: 0, active: false, onSelect: paid }
      ]}
    />
  );
  expect(screen.getByRole('button', { name: 'Pendientes 2' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Pagadas 0' }));
  expect(paid).toHaveBeenCalledOnce();
  expect(pending).not.toHaveBeenCalled();
});

it('conecta periodo, fechas y exportación en los tres adaptadores de reportes', () => {
  const onPeriodChange = vi.fn(),
    onStartDateChange = vi.fn(),
    onEndDateChange = vi.fn(),
    onExport = vi.fn();
  render(
    <ReportToolbar
      period='custom'
      periods={DAILY_REPORT_PERIODS}
      startDate='2026-10-01'
      endDate='2026-10-14'
      onPeriodChange={onPeriodChange}
      onStartDateChange={onStartDateChange}
      onEndDateChange={onEndDateChange}
      onExport={onExport}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Hoy' }));
  fireEvent.change(screen.getByLabelText('Fecha inicial'), { target: { value: '2026-10-02' } });
  fireEvent.change(screen.getByLabelText('Fecha final'), { target: { value: '2026-10-15' } });
  fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
  expect(onPeriodChange).toHaveBeenCalledWith('today');
  expect(onStartDateChange).toHaveBeenCalledWith('2026-10-02');
  expect(onEndDateChange).toHaveBeenCalledWith('2026-10-15');
  expect(onExport).toHaveBeenCalledOnce();
});

it('admite un filtro cuyo valor es vacío y bloquea el selector deshabilitado', () => {
  render(
    <FilterSelect
      label='Estado'
      value=''
      options={[
        { value: '', label: 'Todos' },
        { value: '1', label: 'Activos' }
      ]}
      onChange={vi.fn()}
      disabled
    />
  );
  expect(screen.getByRole('combobox', { name: 'Estado' })).toBeDisabled();
  expect(screen.getByText('Todos')).toBeInTheDocument();
});

it('elige opciones con teclado y devuelve el valor del dominio, incluido el filtro vacío', async () => {
  const onChange = vi.fn();
  const { rerender } = render(
    <FilterSelect
      label='Estado'
      value=''
      options={[
        { value: '', label: 'Todos' },
        { value: '1', label: 'Activos' }
      ]}
      onChange={onChange}
    />
  );
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
  fireEvent.click(await screen.findByRole('option', { name: 'Activos' }));
  expect(onChange).toHaveBeenCalledWith('1');
  rerender(
    <FilterSelect
      label='Estado'
      value='1'
      options={[
        { value: '', label: 'Todos' },
        { value: '1', label: 'Activos' }
      ]}
      onChange={onChange}
    />
  );
  fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
  fireEvent.click(await screen.findByRole('option', { name: 'Todos' }));
  expect(onChange).toHaveBeenLastCalledWith('');
});

it('permite que el módulo decida cuándo cerrar una confirmación después de guardar', () => {
  const confirm = vi.fn(),
    close = vi.fn();
  render(
    <DeleteConfirmModal
      open
      onOpenChange={close}
      onConfirm={confirm}
      entityLabel='habitación'
      entityValue='Habitación 1'
      closeOnConfirm={false}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
  expect(confirm).toHaveBeenCalledOnce();
  expect(close).not.toHaveBeenCalled();
});
