import { Skeleton } from '@/components/shared/Skeleton';

export default function Loading() {
  return <Skeleton name="private-rooms-main" loading={true} />;
}
