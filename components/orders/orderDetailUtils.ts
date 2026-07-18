import { computeOrderHostessLimit } from '@/components/orders/productModalRules';

export const computeHostessLimit = computeOrderHostessLimit;

export const getOrderRoomId = (room: any) => String(room?.id_habitacion ?? room?.id ?? '');

export const getOrderRoomName = (room: any) =>
  room?.nombre || room?.name || `Habitación ${getOrderRoomId(room)}`;

export const extractHostessIds = (value: any): number[] => {
  const ids: number[] = [];

  if (typeof value === 'string') {
    const parsed = value
      .split(',')
      .map((id: string) => parseInt(id.trim()))
      .filter((id: number) => !isNaN(id));
    ids.push(...parsed);
    return ids;
  }

  if (Array.isArray(value)) {
    value.forEach(item => {
      if (typeof item === 'number') {
        ids.push(item);
      } else if (typeof item === 'string') {
        const parsed = parseInt(item.trim());
        if (!isNaN(parsed)) ids.push(parsed);
      } else if (item && typeof item === 'object') {
        const extracted = item.id_usuario ?? item.id ?? item.usuario_id;
        if (extracted !== undefined && extracted !== null) {
          const parsed = Number(extracted);
          if (!isNaN(parsed)) ids.push(parsed);
        }
      }
    });
  }

  return ids;
};
