import { Skeleton } from '@/components/shared/Skeleton';

export default function Loading() {
  return <Skeleton name="api-docs-main" loading={true} />;
}
