import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ExcelJS from 'exceljs';
import {
  exportarColacionesExcel,
  filasColaciones,
  type ColacionDetalle
} from '@/components/colaciones/colacionesExport';
import { ColacionesTab } from '@/components/colaciones/ColacionesTab';
import { horaDeNegocio } from '@/lib/business/timezoneService';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/caja/useCashRegisterStatus', () => ({
  useCashRegisterStatus: () => ({ hasOpenCaja: true, cajaInfo: { id_caja: 'caja-1' } })
}));
vi.mock('@/hooks/auth/useUserPermissions', () => ({
  useUserPermissions: () => ({ hasPermission: () => true })
}));
vi.mock('@/hooks/realtime/useRealtimeRefresh', () => ({
  useRealtimeRefresh: () => {}
}));

/**
 * Descarga de colaciones del turno en Excel.
 *
 * ExcelJS sólo entrega el archivo como buffer, así que el test intercepta el
 * `Blob` que se descarga, lo vuelve a abrir con ExcelJS y revisa el contenido
 * real: una fila por colación con su botella y sus ml, y el total al final.
 */

const detalle: ColacionDetalle[] = [
  {
    trabajador: 'Ana Anfitriona',
    nick: 'ana',
    nombre_bebida: 'Whisky 750 ml',
    ml_bebida: 750,
    acompanamiento_nombre: 'Coca-Cola 1.5 L',
    registrado_por_nombre: 'Carla Cajera',
    fecha_crea: '2026-10-20T21:10:00'
  },
  {
    trabajador: 'Beto Barman',
    nick: null,
    nombre_bebida: 'Ron 700 ml',
    ml_bebida: 120,
    acompanamiento: 'soda',
    registrado_por_nombre: 'Carla Cajera',
    fecha_crea: '2026-10-20T21:25:00'
  }
];

/** Misma hora que muestra la tabla del turno. */
const horaDe = (fecha: string) => horaDeNegocio(fecha);

interface Descarga {
  nombre: string;
  href: string;
  blob: Blob;
}

let descargas: Descarga[] = [];
let ultimoBlob: Blob | null = null;

beforeEach(() => {
  descargas = [];
  ultimoBlob = null;
  // jsdom no implementa createObjectURL ni la descarga real del ancla.
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn((blob: Blob) => {
      ultimoBlob = blob;
      return 'blob:colaciones';
    })
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    if (!ultimoBlob) throw new Error('Se descargó un ancla sin blob');
    descargas.push({ nombre: this.download, href: this.href, blob: ultimoBlob });
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function leerDescarga(descarga: Descarga) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await descarga.blob.arrayBuffer());
  const sheet = workbook.getWorksheet('Colaciones del turno');
  if (!sheet) throw new Error('El archivo no tiene la hoja «Colaciones del turno»');
  const filas: unknown[][] = [];
  sheet.eachRow({ includeEmpty: false }, row => {
    const valores: unknown[] = [];
    // `values` es 1-based y deja huecos; se normaliza a un array plano.
    (row.values as unknown[]).slice(1).forEach((valor, indice) => {
      valores[indice] = valor;
    });
    filas.push(valores);
  });
  return { workbook, sheet, filas };
}

describe('filasColaciones', () => {
  it('deja una fila por colación con botella, ml, acompañamiento y quién registró', () => {
    expect(filasColaciones(detalle)).toEqual([
      {
        index: 1,
        trabajador: 'Ana Anfitriona',
        nick: 'ana',
        bebida: 'Whisky 750 ml',
        ml: 750,
        acompanamiento: 'Coca-Cola 1.5 L',
        registrado: 'Carla Cajera',
        hora: horaDe('2026-10-20T21:10:00')
      },
      {
        index: 2,
        trabajador: 'Beto Barman',
        nick: '—',
        bebida: 'Ron 700 ml',
        ml: 120,
        // Sin nombre de presentación cae al tipo configurado.
        acompanamiento: 'soda',
        registrado: 'Carla Cajera',
        hora: horaDe('2026-10-20T21:25:00')
      }
    ]);
    // La celda es una hora corta, no un ISO completo.
    expect(filasColaciones(detalle)[0].hora).toMatch(/^\d{2}:\d{2}/);
  });

  it('completa los datos que faltan como en la tabla: «Corto», «—» y 0 ml', () => {
    const [fila] = filasColaciones([
      {
        trabajador: 'Sin Datos',
        nick: '   ',
        nombre_bebida: '  ',
        ml_bebida: Number.NaN,
        acompanamiento: null,
        registrado_por_nombre: 'Carla',
        fecha_crea: '2026-10-20T08:00:00'
      }
    ]);
    expect(fila).toMatchObject({
      trabajador: 'Sin Datos',
      nick: '—',
      bebida: 'Corto',
      ml: 0,
      acompanamiento: '—'
    });
  });
});

describe('exportarColacionesExcel', () => {
  it('descarga un xlsx con una fila por botella, sus ml y el total al final', async () => {
    await exportarColacionesExcel(detalle);

    expect(descargas).toHaveLength(1);
    const [descarga] = descargas;
    expect(descarga.nombre).toMatch(/^colaciones_\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(descarga.href).toBe('blob:colaciones');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:colaciones');

    const { filas } = await leerDescarga(descarga);
    expect(filas[0]).toEqual([
      '#',
      'Trabajador',
      'Nick',
      'Bebida (botella)',
      'Ml',
      'Acompañamiento (botella)',
      'Registró',
      'Hora'
    ]);
    // Botellas y ml servidos, en el mismo orden de la tabla.
    expect(filas[1].slice(0, 5)).toEqual([1, 'Ana Anfitriona', 'ana', 'Whisky 750 ml', 750]);
    expect(filas[2].slice(0, 5)).toEqual([2, 'Beto Barman', '—', 'Ron 700 ml', 120]);
    // Cierre con el total de ml del turno.
    expect(filas).toHaveLength(4);
    expect(filas[3][1]).toBe('Total');
    expect(filas[3][4]).toBe(870);
  });

  it('deja el total en 0 cuando el turno no tiene colaciones', async () => {
    await exportarColacionesExcel([]);

    const { filas } = await leerDescarga(descargas[0]);
    expect(filas).toHaveLength(2);
    expect(filas[1][1]).toBe('Total');
    expect(filas[1][4]).toBe(0);
  });

  it('nombra la hoja y deja el total en negrita', async () => {
    await exportarColacionesExcel(detalle);

    const { workbook, sheet } = await leerDescarga(descargas[0]);
    expect(workbook.worksheets.map(hoja => hoja.name)).toEqual(['Colaciones del turno']);
    const total = sheet.getRow(4);
    expect(total.getCell(5).value).toBe(870);
    expect(total.getCell(5).font?.bold).toBe(true);
  });
});

describe('botón Excel de Colaciones del turno', () => {
  const registros = [
    {
      id: 'c1',
      usuario_id: 'w-anf',
      trabajador: 'Ana Anfitriona',
      nick: 'ana',
      nombre_bebida: 'Whisky 750 ml',
      ml_bebida: 750,
      acompanamiento_nombre: 'Coca-Cola 1.5 L',
      registrado_por_nombre: 'Carla Cajera',
      fecha_crea: '2026-10-20T21:10:00'
    },
    {
      id: 'c2',
      usuario_id: 'w-caj',
      trabajador: 'Carla Cajera',
      nick: null,
      nombre_bebida: 'Sprite 350 ml',
      ml_bebida: 200,
      acompanamiento: null,
      registrado_por_nombre: 'Carla Cajera',
      fecha_crea: '2026-10-20T21:20:00'
    }
  ];

  function stubFetch() {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const ok = (data: unknown) => ({ ok: true, json: async () => ({ success: true, data }) });
        if (url.startsWith('/api/users')) return ok([]);
        if (url.includes('solo_colaciones_analcoholicas=true')) return ok([]);
        if (url.includes('solo_colaciones=true')) return ok([]);
        if (url.startsWith('/api/colaciones')) return ok(registros);
        if (url.startsWith('/api/bar')) return ok([]);
        throw new Error(`URL inesperada: ${url}`);
      })
    );
  }

  it('descarga el detalle visible con botellas, ml y total', async () => {
    stubFetch();
    render(<ColacionesTab />);

    expect(await screen.findByText('2 registrados')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Descargar detalle de colaciones del turno' })
    );

    await waitFor(() => expect(descargas).toHaveLength(1));
    const { filas } = await leerDescarga(descargas[0]);
    expect(filas[1].slice(3, 5)).toEqual(['Whisky 750 ml', 750]);
    expect(filas[2].slice(3, 5)).toEqual(['Sprite 350 ml', 200]);
    expect(filas[3][1]).toBe('Total');
    expect(filas[3][4]).toBe(950);
  });

  it('exporta solo lo que coincide con la búsqueda', async () => {
    stubFetch();
    render(<ColacionesTab searchTerm='Whisky' />);

    expect(await screen.findByText('1 registrados')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Descargar detalle de colaciones del turno' })
    );

    await waitFor(() => expect(descargas).toHaveLength(1));
    const { filas } = await leerDescarga(descargas[0]);
    expect(filas).toHaveLength(3);
    expect(filas[1][3]).toBe('Whisky 750 ml');
    expect(filas[2][4]).toBe(750);
  });
});
