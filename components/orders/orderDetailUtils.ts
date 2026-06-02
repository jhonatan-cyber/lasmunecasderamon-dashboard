export const getOrderRoomId = (room: any) => String(room?.id_habitacion ?? room?.id ?? '');

export const getOrderRoomName = (room: any) =>
  room?.nombre || room?.name || `Habitación ${getOrderRoomId(room)}`;

export const isChampagneProduct = (producto: any) => {
  const categoria = (producto?.categoria || '').toLowerCase();
  return (
    categoria.includes('champaña') ||
    categoria.includes('shampaña') ||
    categoria.includes('champagne')
  );
};

export const computeHostessLimit = (items: any[]) => {
  const champagneProducts = items.filter(isChampagneProduct);
  const otherCommissionProducts = items.filter(
    p => !isChampagneProduct(p) && (Number(p.genera_comision) === 1 || Number(p.generaComision) === 1)
  );

  const otherCommissionQuantity = otherCommissionProducts.reduce(
    (sum, p) => sum + (Number(p.cantidad) || 1),
    0
  );

  let champagneLimit = 0;
  let maxChampagnePrice = 0;

  if (champagneProducts.length > 0) {
    maxChampagnePrice = Math.max(...champagneProducts.map(p => Number(p.precio || p.price || 0)));

    if (maxChampagnePrice >= 240000) champagneLimit = 5;
    else if (maxChampagnePrice >= 200000) champagneLimit = 4;
    else if (maxChampagnePrice >= 140000) champagneLimit = 3;
    else if (maxChampagnePrice >= 120000) champagneLimit = 2;
    else champagneLimit = 1;
  }

  const maxAnfitrionas =
    champagneProducts.length > 0 ? champagneLimit + otherCommissionQuantity : otherCommissionQuantity;

  return {
    maxAnfitrionas,
    champagneLimit,
    otherCommissionQuantity,
    hasChampagneProducts: champagneProducts.length > 0,
    maxChampagnePrice
  };
};

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
