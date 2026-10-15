import { Skeleton as BoneyardSkeleton } from '@/components/shared/Skeleton';
import AnfitrionaServiciosPageClient from '@/components/anfitriona/AnfitrionaServiciosPageClient';

export default function Page() {
  return (
    <BoneyardSkeleton name='anfitriona-servicios-main' loading={false}>
      <AnfitrionaServiciosPageClient />
    </BoneyardSkeleton>
  );
}
