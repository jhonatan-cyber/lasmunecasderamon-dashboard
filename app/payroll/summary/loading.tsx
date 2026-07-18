import { Skeleton } from '@/components/shared/Skeleton';

export default function Loading() {
  return <Skeleton name="payroll-summary-main" loading={true} />;
}
