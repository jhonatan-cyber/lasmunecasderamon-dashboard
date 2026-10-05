/**
 * Fichas de clientes — casos de uso del módulo Clientes.
 *
 * Altas, edición, borrado, listado, detalle e historial. No abren unidad de
 * trabajo: son operaciones de una sola tabla (el historial es sólo lectura).
 */
import type { ClientType } from '@/lib/business/schemas';
import * as repositorio from './repositorio';

export function listarClientes(params?: {
  search?: string;
  limit?: number;
  offset?: number;
  conSaldo?: boolean;
}) {
  return repositorio.listarClientes(params);
}

export function obtenerCliente(id: string) {
  return repositorio.obtenerCliente(id);
}

export function crearCliente(data: Pick<ClientType, 'run' | 'name' | 'lastName' | 'phone'>) {
  return repositorio.crearCliente(data);
}

export function actualizarCliente(id: string, data: Partial<ClientType>) {
  return repositorio.actualizarCliente(id, data);
}

export function eliminarCliente(id: string) {
  return repositorio.eliminarClienteFisico(id);
}

export function obtenerHistorial(clientId: string) {
  return repositorio.obtenerHistorial(clientId);
}
