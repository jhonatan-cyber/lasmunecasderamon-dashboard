import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { PayrollSummaryPageClient } from '@/components/payroll/PayrollSummaryPageClient';

export default function PayrollSummaryPage() {
  return (
    <BoneyardSkeleton name="payroll-summary-main" loading={false}>
      <PayrollSummaryPageClient />
    </BoneyardSkeleton>
  );
}
