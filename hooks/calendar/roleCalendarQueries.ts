import { getMonthDateRange, matchesAnyDateKey, toDateKeys } from '@/lib/utils/calendarUtils';
import type { CalendarData, DataType } from './calendarTypes';
import type { CalendarRow } from './roleCalendarData';

function validateCalendarResult(response: Response, result: any) {
  if (!response.ok || !result.success || !Array.isArray(result.data))
    throw new Error('No se pudo cargar el calendario');
  return result;
}

export async function fetchMonthCalendar({
  isAnfitriona,
  month
}: {
  isAnfitriona: boolean;
  month: Date;
}): Promise<{ calendarData: CalendarData; hostessEvents: CalendarRow[] | null }> {
  const { startDate, endDate } = getMonthDateRange(month);

  if (isAnfitriona) {
    const [response, servicesResponse] = await Promise.all([
      fetch(`/api/events/user?startDate=${startDate}&endDate=${endDate}`),
      fetch('/api/services/user')
    ]);
    const [result, servicesResult] = await Promise.all([response.json(), servicesResponse.json()]);
    if (!response.ok || !result.success || !servicesResponse.ok || !servicesResult.success)
      throw new Error('No se pudo cargar el calendario');

    const events: CalendarRow[] = result.data || [];
    const services = new Map<string, CalendarRow>(
      (servicesResult.data || []).map((service: CalendarRow) => [
        String(service.id_servicio),
        service
      ])
    );

    const rows = (type: string) =>
      events
        .filter((event: CalendarRow) => event.type === type)
        .map((event: CalendarRow) => ({
          ...event,
          ...(event.type === 'servicio'
            ? {
                tiempo: services.get(String(event.id))?.tiempo,
                cliente_nombre: services.get(String(event.id))?.cliente,
                habitacion_numero: services.get(String(event.id))?.habitacion
              }
            : {}),
          fecha_crea: event.date,
          sueldo_final: Number(event.amount || 0),
          comision: Number(event.amount || 0),
          precio_servicio: Number(event.amount || 0),
          monto: Number(event.amount || 0)
        }));

    return {
      calendarData: {
        asistencias: rows('asistencia'),
        anticipos: rows('anticipo'),
        comisiones: rows('comision').filter((event: CalendarRow) => event.subType === 'venta'),
        servicios: rows('servicio'),
        propinas: [],
        horasExtras: []
      },
      hostessEvents: events
    };
  }

  const [asistenciasRes, anticiposRes, thirdRes, fourthRes] = await Promise.all([
    fetch(`/api/attendance/by-dates?startDate=${startDate}&endDate=${endDate}`),
    fetch(`/api/advances/by-dates?startDate=${startDate}&endDate=${endDate}`),
    fetch(`/api/tips/user?startDate=${startDate}&endDate=${endDate}`),
    fetch(`/api/overtime/by-dates?startDate=${startDate}&endDate=${endDate}`)
  ]);

  const [asistenciasData, anticiposData, thirdData, fourthData] = await Promise.all([
    asistenciasRes.json(),
    anticiposRes.json(),
    thirdRes.json(),
    fourthRes.json()
  ]);

  const responses = [asistenciasRes, anticiposRes, thirdRes, fourthRes];
  const results = [asistenciasData, anticiposData, thirdData, fourthData];
  results.forEach((result, index) => validateCalendarResult(responses[index], result));

  return {
    calendarData: {
      asistencias: asistenciasData.success ? asistenciasData.data || [] : [],
      anticipos: anticiposData.success ? anticiposData.data || [] : [],
      propinas: thirdData.success ? thirdData.data || [] : [],
      horasExtras: fourthData.success ? fourthData.data || [] : [],
      comisiones: [],
      servicios: []
    },
    hostessEvents: null
  };
}

export interface SelectionSnapshot {
  counts: { [key: string]: number };
  total: number;
  rows: CalendarRow[];
}

export async function fetchSelectionData({
  isAnfitriona,
  selectedDates,
  selectedDataType,
  calendarData,
  hostessEvents
}: {
  isAnfitriona: boolean;
  selectedDates: Date[];
  selectedDataType: DataType;
  calendarData: CalendarData;
  hostessEvents: CalendarRow[];
}): Promise<SelectionSnapshot> {
  const dateKeys = toDateKeys(selectedDates);
  const datesParam = dateKeys.join(',');

  if (isAnfitriona) {
    const selected = Object.fromEntries(
      Object.entries(calendarData).map(([key, rows]) => [
        key,
        rows.filter((item: CalendarRow) => matchesAnyDateKey(item.fecha_crea, dateKeys))
      ])
    );
    const total = hostessEvents
      .filter(event => matchesAnyDateKey(event.date, dateKeys))
      .reduce((sum, event) => {
        const amount = Number(event.amount || 0),
          state = Number(event.estado);
        if (event.type === 'anticipo') return sum - ([0, 1].includes(state) ? amount : 0);
        if (['asistencia', 'comision', 'gratificacion'].includes(event.type) && state === 1)
          return sum + amount;
        return sum;
      }, 0);

    return {
      counts: Object.fromEntries(Object.entries(selected).map(([key, rows]) => [key, rows.length])),
      total,
      rows: selected[selectedDataType] || []
    };
  }

  const fetchCountsPromises = [
    fetch(`/api/attendance/by-dates?dates=${datesParam}`).then(async res =>
      validateCalendarResult(res, await res.json())
    ),
    fetch(`/api/advances/by-dates?dates=${datesParam}`).then(async res =>
      validateCalendarResult(res, await res.json())
    ),
    Promise.resolve({
      success: true,
      data: calendarData.propinas.filter(item => matchesAnyDateKey(item.fecha_crea, dateKeys))
    }),
    fetch(`/api/overtime/by-dates?dates=${datesParam}`).then(async res =>
      validateCalendarResult(res, await res.json())
    )
  ];

  const [asistenciasRes, anticiposRes, thirdRes, fourthRes] =
    await Promise.all(fetchCountsPromises);

  const counts = {
    asistencias: asistenciasRes.success ? asistenciasRes.data?.length || 0 : 0,
    anticipos: anticiposRes.success ? anticiposRes.data?.length || 0 : 0,
    propinas: thirdRes.success ? thirdRes.data?.length || 0 : 0,
    horasExtras: fourthRes.success ? fourthRes.data?.length || 0 : 0,
    comisiones: 0,
    servicios: 0
  };

  let total = 0;

  if (asistenciasRes.success && asistenciasRes.data) {
    const asistenciasEstado1 = asistenciasRes.data.filter(
      (item: CalendarRow) => Number(item.estado) === 1
    );
    total += asistenciasEstado1.reduce(
      (sum: number, item: CalendarRow) => sum + Number(item.sueldo_final || 0),
      0
    );
  }

  if (thirdRes.success && thirdRes.data) {
    const propinasEstado1 = thirdRes.data.filter((item: CalendarRow) => Number(item.estado) === 1);
    total += propinasEstado1.reduce(
      (sum: number, item: CalendarRow) => sum + Number(item.monto || 0),
      0
    );
  }

  if (fourthRes.success && fourthRes.data) {
    const horasExtrasEstado1 = fourthRes.data.filter(
      (item: CalendarRow) => Number(item.estado) === 1
    );
    total += horasExtrasEstado1.reduce(
      (sum: number, item: CalendarRow) => sum + Number(item.total || 0),
      0
    );
  }

  if (anticiposRes.success && anticiposRes.data) {
    const anticiposEstado1 = anticiposRes.data.filter(
      (item: CalendarRow) => Number(item.estado) === 1
    );
    total -= anticiposEstado1.reduce(
      (sum: number, item: CalendarRow) => sum + Number(item.monto || 0),
      0
    );
  }

  // Misma correspondencia que el selector de pestañas: propinas y comisiones
  // comparten la tercera consulta, horas extras y servicios la cuarta.
  const rowsFor = (category: DataType): CalendarRow[] => {
    switch (category) {
      case 'asistencias':
        return asistenciasRes.success ? asistenciasRes.data || [] : [];
      case 'anticipos':
        return anticiposRes.success ? anticiposRes.data || [] : [];
      case 'propinas':
      case 'comisiones':
        return thirdRes.success ? thirdRes.data || [] : [];
      case 'horasExtras':
      case 'servicios':
        return fourthRes.success ? fourthRes.data || [] : [];
      default:
        return [];
    }
  };

  return { counts, total, rows: rowsFor(selectedDataType) };
}
