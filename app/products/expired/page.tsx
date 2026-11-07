import { ExpiredStockPanel } from '@/components/products/ExpiredStockPanel';

export const metadata = {
  title: 'Productos vencidos retirados | Las Muñecas de Ramón'
};

export default function ExpiredStockPage() {
  return <ExpiredStockPanel historialOnly />;
}
