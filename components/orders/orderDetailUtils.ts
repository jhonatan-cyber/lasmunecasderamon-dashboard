import { computeOrderHostessLimit } from '@/components/orders/productModalRules';

export const computeHostessLimit = computeOrderHostessLimit;

export const getOrderRoomId = (room: any) => String(room?.id_habitacion ?? room?.id ?? '');

export const getOrderRoomName = (room: any) =>
  room?.nombre || room?.name || `Habitación ${getOrderRoomId(room)}`;

export const extractHostessIds = (value: any): string[] => {
  if (value === null || value === undefined) return [];
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [value];
  return values.flatMap(item => {
    const raw = item && typeof item === 'object'
      ? item.id_usuario ?? item.id ?? item.usuario_id
      : item;
    if (raw === null || raw === undefined) return [];
    const id = String(raw).trim();
    return id && id !== 'NaN' && id !== 'null' && id !== 'undefined' ? [id] : [];
  });
};

export const getOrderHostessIds = (detail: any[]): string[] => [...new Set(detail.flatMap(item => [
  ...extractHostessIds(item.anfitrionaIds),
  ...extractHostessIds(item.anfitrionas_con_ids),
  ...extractHostessIds(item.anfitrionas_asignadas_ids),
  ...extractHostessIds(item.hostess_id),
  ...extractHostessIds(item.usuarios),
  ...extractHostessIds(item.hostesses)
]))];
