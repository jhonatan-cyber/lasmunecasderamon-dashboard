import { Skeleton } from '@/components/shared/Skeleton';

export default function Loading() {
  return <Skeleton name="users-main" loading={true} />;
}
