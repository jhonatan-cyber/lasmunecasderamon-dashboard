import { Skeleton } from '@/components/shared/Skeleton';

export default function Loading() {
  return <Skeleton name="attendance-main" loading={true} />;
}