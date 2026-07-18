import { Skeleton } from '@/components/shared/Skeleton';

export default function Loading() {
  return <Skeleton name="products-main" loading={true} />;
}
