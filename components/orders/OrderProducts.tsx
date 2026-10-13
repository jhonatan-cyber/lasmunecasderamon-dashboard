'use client';

import { Separator } from '@/components/ui/separator';
import { OrderDetailTotalsSummary } from '@/components/orders/detail';
import { SalesProductDetail } from '@/components/sales/SalesProductDetail';
import { orderLineToSaleDetail } from '@/lib/sales/orderSale';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';

interface OrderProductsProps {
  detail: any[];
  propina: number;
  recargoAnfitrionas: number;
}

export function OrderProducts({ detail, propina, recargoAnfitrionas }: OrderProductsProps) {
  const defaultShotMl = useConfigValue<number>('bar', 'shot_ml', 50);
  const subtotal = detail.reduce(
    (sum, item) => sum + Number(item.precio || 0) * Number(item.cantidad || 0),
    0
  );
  return (
    <div className='overflow-hidden rounded-2xl border bg-background shadow-sm'>
      <div className='divide-y'>
        {detail.map((item, index) => {
          const line = orderLineToSaleDetail(item);
          const mlCliente = resolveShotMl(item.ml_shot, defaultShotMl);
          const ml = line.shot_anfitriona
            ? resolveShotMlAnfitriona(item.ml_shot_anfitriona, mlCliente)
            : mlCliente;
          const mixer =
            line.tipo_venta === 'shot' ? line.acompanamiento_corto : line.acompanamiento_botella;
          return (
            <SalesProductDetail
              consumoProducto={
                line.tipo_venta === 'shot'
                  ? `${ml * line.cantidad} ml (${ml} ml por corto)`
                  : `${line.cantidad} unidades`
              }
              key={item.id_detalle_pedido || index}
              detail={{
                ...line,
                venta_id: item.id_pedido,
                producto_nombre: item.producto_nombre,
                categoria_nombre: item.categoria,
                presentacion_nombre: item.presentacion_nombre,
                producto_foto: item.producto_foto,
                anfitrionas:
                  item.anfitrionas_asignadas_nombres
                    ?.split(',')
                    .map((name: string) => name.trim()) ?? line.hostesses,
                acompanamiento: mixer
                  ? {
                      ...mixer,
                      nombre:
                        item.acompanamiento_nombre ||
                        ('nombre' in mixer ? mixer.nombre : undefined),
                      foto: item.acompanamiento_foto
                    }
                  : undefined
              }}
            />
          );
        })}
      </div>
      <Separator />
      <OrderDetailTotalsSummary
        subtotal={subtotal}
        propina={propina}
        recargoAnfitrionas={recargoAnfitrionas}
        total={subtotal + propina + recargoAnfitrionas}
      />
    </div>
  );
}
