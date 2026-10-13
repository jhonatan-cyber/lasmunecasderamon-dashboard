import { z } from 'zod';
import { UBICACIONES_LIMPIEZA, type AccesoLimpieza } from '@/types/limpieza';

export function accesoLimpieza(role: string): AccesoLimpieza {
  const rol = role.trim().toLowerCase();
  if (
    [
      'administrador',
      'admin',
      'almacenero',
      'almacen',
      'almacén',
      'bodeguero',
      'encargado'
    ].includes(rol)
  ) {
    return { gestionar: true, ubicaciones: [...UBICACIONES_LIMPIEZA] };
  }
  if (rol === 'barman') return { gestionar: false, ubicaciones: ['bar'] };
  if (['cajero', 'cajera'].includes(rol)) return { gestionar: false, ubicaciones: ['caja'] };
  if (['limpieza', 'encargado local'].includes(rol))
    return { gestionar: false, ubicaciones: ['local'] };
  return { gestionar: false, ubicaciones: [] };
}

const cantidad = z.number().finite().positive().max(999999999).multipleOf(0.001);
const ubicacion = z.enum(UBICACIONES_LIMPIEZA);
const nota = z.string().trim().max(500).default('');
export const OperacionLimpiezaSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('articulo'),
    nombre: z.string().trim().min(2).max(120),
    unidad: z.enum(['unidad', 'litro', 'kilo', 'paquete', 'metro']),
    minimo: z.number().finite().min(0).max(999999999).multipleOf(0.001).default(0)
  }),
  z.object({
    tipo: z.literal('ingreso'),
    articulo_id: z.string().uuid(),
    cantidad,
    proveedor: z.string().trim().max(120).default(''),
    costo_unitario: z.number().finite().min(0).max(999999999).default(0),
    nota
  }),
  z.object({
    tipo: z.literal('traspaso'),
    articulo_id: z.string().uuid(),
    cantidad,
    origen: ubicacion,
    destino: ubicacion,
    nota
  }),
  z.object({
    tipo: z.literal('consumo'),
    articulo_id: z.string().uuid(),
    cantidad,
    origen: ubicacion,
    nota: z.string().trim().min(3).max(500)
  }),
  z.object({
    tipo: z.literal('resolver'),
    id: z.string().uuid(),
    accion: z.enum(['aceptar', 'rechazar'])
  })
]);
export type OperacionLimpieza = z.infer<typeof OperacionLimpiezaSchema>;
