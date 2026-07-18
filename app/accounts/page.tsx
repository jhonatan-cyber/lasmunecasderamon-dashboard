import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { AccountsPageClient } from '@/components/cuentas/AccountsPageClient';

export default function AccountsPage() {
  return (
    <BoneyardSkeleton name="accounts-main" loading={false}>
      <AccountsPageClient />
    </BoneyardSkeleton>
  );
}
