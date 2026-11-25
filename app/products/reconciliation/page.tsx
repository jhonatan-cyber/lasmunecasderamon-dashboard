import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { StockReconciliationClient } from '@/components/products/StockReconciliationClient';

export default function StockReconciliationPage() {
  return (
    <PermissionGuard module='products' action='view'>
      <StockReconciliationClient />
    </PermissionGuard>
  );
}
