import { fireEvent, screen, within } from '@testing-library/react';

/**
 * Abre el DatePicker por su etiqueta accesible y elige un día del calendario,
 * navegando los meses que hagan falta. El popover se cierra al seleccionar.
 */
function asegurarResizeObserver(): void {
  try {
    const observer = new globalThis.ResizeObserver(() => {});
    if (typeof observer.observe === 'function') return;
  } catch {
    // cae al mock de abajo
  }
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

export function seleccionarFecha(label: string | RegExp, fecha: string): void {
  asegurarResizeObserver();
  fireEvent.click(screen.getByLabelText(label));

  const mesObjetivo = fecha.slice(0, 7);
  const mesesMaximos = 60;

  for (let intento = 0; intento < mesesMaximos; intento++) {
    // Solo las celdas del calendario: los botones de día también llevan data-day.
    const celdas = Array.from(document.querySelectorAll<HTMLElement>('td[data-day]'));
    const celdaDelMes = celdas.find(celda => !celda.hasAttribute('data-outside'));
    const mesVisible = celdaDelMes?.dataset.day?.slice(0, 7);

    if (mesVisible === mesObjetivo) break;

    const boton = document.querySelector<HTMLButtonElement>(
      mesVisible && mesVisible < mesObjetivo ? '.rdp-button_next' : '.rdp-button_previous'
    );
    if (!boton) throw new Error(`No se pudo navegar al mes ${mesObjetivo}`);
    fireEvent.click(boton);
  }

  const celda = document.querySelector<HTMLElement>(`td[data-day="${fecha}"]`);
  if (!celda) throw new Error(`No se encontró el día ${fecha} en el calendario`);
  fireEvent.click(within(celda).getByRole('button'));
}

/** `2026-07-31` → `31/07/2026`, el formato compacto del DatePicker. */
export function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}
