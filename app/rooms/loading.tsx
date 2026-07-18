import { Skeleton } from '@/components/shared/Skeleton';

export default function Loading() {
  return <Skeleton name="rooms-main" loading={true} />;
}
