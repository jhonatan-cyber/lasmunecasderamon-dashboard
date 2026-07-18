import { Skeleton } from '@/components/shared/Skeleton';

export default function Loading() {
  return <Skeleton name="categories-main" loading={true} />;
}
