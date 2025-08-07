'use client';

import { PermissionsManager } from '@/components/permissions/PermissionsManager';

export default function PermissionsPage() {
  return (
    <div className='container mx-auto px-4 sm:px-6 py-4 sm:py-6 mt-4 sm:mt-6 lg:mt-10'>
      <PermissionsManager />
    </div>
  );
} 