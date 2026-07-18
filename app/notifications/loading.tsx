import { Skeleton } from '@/components/shared/Skeleton';

export default function Loading() {
  return <Skeleton name="notifications-main" loading={true} />;
}
