import { Skeleton } from '@/components/shared/Skeleton';

export default function Loading() {
  return <Skeleton name="error-logs-main" loading={true} />;
}
