import { Card, CardContent } from '@/components/ui/card';
import { Order, SolicitudServicio } from '@/hooks/orders/useOrdersList';

interface OrdersStatsProps {
  activeTab: string;
  orders: Order[];
  servicios: SolicitudServicio[];
}

export const OrdersStats = ({ activeTab, orders, servicios }: OrdersStatsProps) => {
  if (activeTab === 'productos') {
    return (
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
        <StatCard value={orders.length} label="Total Órdenes" color="blue" />
        <StatCard value={orders.filter(o => o.estado === 1).length} label="Pendientes" color="yellow" />
        <StatCard value={orders.filter(o => o.estado === 0).length} label="Completadas" color="green" />
        <StatCard value={orders.filter(o => o.estado === 2).length} label="Canceladas" color="red" />
      </div>
    );
  }

  return (
    <div className='grid grid-cols-2 md:grid-cols-3 gap-4 mb-6'>
      <StatCard value={servicios.length} label="Total Solicitudes" color="blue" />
      <StatCard value={servicios.filter(s => s.estado === 'pendiente').length} label="Pendientes" color="yellow" />
      <StatCard value={servicios.filter(s => s.estado === 'aprobada').length} label="Aprobadas" color="green" />
    </div>
  );
};

const StatCard = ({ value, label, color }: { value: number; label: string; color: string }) => {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600',
    yellow: 'text-yellow-600',
    green: 'text-green-600',
    red: 'text-red-600',
  };

  return (
    <Card className="hover:shadow-md transition-shadow border-none bg-gray-50/50">
      <CardContent className='p-4'>
        <div className='text-center'>
          <p className={`text-2xl font-black ${colorClasses[color]}`}>{value}</p>
          <p className='text-[10px] text-gray-500 uppercase font-black tracking-tighter'>{label}</p>
        </div>
      </CardContent>
    </Card>
  );
};
