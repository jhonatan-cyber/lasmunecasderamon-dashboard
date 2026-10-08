// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mapServiceFromDB, parseMixedPayments } from '@/modules/operacion/servicios/mapeo';
describe('lectura de servicios y pagos mixtos', () => {
  it('descarta formatos inválidos y pagos vacíos, cero o negativos', () => {
    for (const raw of [null, '', 'bad-json', '{}', {}, 0]) expect(parseMixedPayments(raw)).toEqual([]);
    const values = [{ metodo: 'efectivo', monto: '100' }, null, { metodo: '', monto: 5 }, { metodo: 'tarjeta', monto: -1 }, { metodo: 'tarjeta', monto: 0 }];
    expect(parseMixedPayments(values)).toEqual([{ metodo: 'efectivo', monto: 100 }]); expect(parseMixedPayments(JSON.stringify(values))).toEqual([{ metodo: 'efectivo', monto: 100 }]);
  });
  it('mapea valores ausentes sin inventar anfitrionas ni pagos', () => {
    expect(mapServiceFromDB(null)).toBeNull(); expect(mapServiceFromDB({})).toMatchObject({ total: 0, total_usuarios: 1, pagos_mixtos: [], total_comision: 0, habitacion_comision: null, waiter_name: null });
  });
  it.each([
    [{ creator_nick: 'Nick' }, 'Nick'],
    [{ creator_nombre: 'Ana', creator_apellido: 'Pérez' }, 'Ana Pérez'],
    [{ usuario_nick: 'Garzón' }, 'Garzón'],
    [{ creator_name: 'Old', creator_last_name: 'Name' }, 'Old Name']
  ])('resuelve el autor del servicio: %s', (fields, expected) => {
    expect(mapServiceFromDB(fields).waiter_name).toBe(expected);
  });
  it('distribuye la comisión fija entre anfitrionas y conserva datos financieros', () => {
    const row = mapServiceFromDB({ id_servicio: 's1', codigo: 'S1', anfitrionas_ids: 'a1,a2,', habitacion_comision: '101', precio_servicio: '200', precio_habitacion: '300', iva: '10', sub_total: '500', total: '510', tiempo: '30', habitacion_numero: '101', anfitrionas_nombres: 'Ana, Lola', creator_foto: 'photo.png', cliente_nombre: 'Luis', pagos_mixtos: '[{"metodo":"tarjeta","monto":510}]', es_temporal: 1, servicio_original_id: 's0', fecha_crea: '2026-01-01', fecha_mod: '2026-01-02' });
    expect(row).toMatchObject({ total: 510, total_usuarios: 2, total_comision: 101, comision_individual: 50, habitacion_nombre: '101', waiter_foto: 'photo.png', es_temporal: 1 });
  });
  it.each(['habitacion_nombre', 'habitacion_name'])('usa habitaciones heredadas en %s y comisión por anfitriona sin tarifa fija', field => {
    expect(mapServiceFromDB({ [field]: 'Suite', anfitrionas: 'Ana', anfitrionas_ids: 'a1,a2', precio_servicio: 100 })).toMatchObject({ habitacion_nombre: 'Suite', anfitrionas_nombres: 'Ana', total_comision: 200, comision_individual: 100 });
  });
});
