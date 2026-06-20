'use client';

import { useAnulacionContext } from '@/contexts/AnulacionContext';
import { AnulacionConfirmModal } from './AnulacionConfirmModal';

export default function AnulacionNotificationModal() {
  const { modalData, isModalOpen, closeModal } = useAnulacionContext();

  return (
    <AnulacionConfirmModal
      open={isModalOpen}
      onOpenChange={closeModal}
      onAccept={closeModal}
      data={modalData}
    />
  );
}
