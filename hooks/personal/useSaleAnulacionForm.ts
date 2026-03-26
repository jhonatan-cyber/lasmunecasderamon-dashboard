import { useState } from 'react';

interface UseSaleAnulacionFormProps {
  onOpenChange: (open: boolean) => void;
  onConfirm: (motivo: string) => void;
}

export function useSaleAnulacionForm({
  onOpenChange,
  onConfirm
}: UseSaleAnulacionFormProps) {
  const [motivo, setMotivo] = useState("");

  const handleConfirm = () => {
    if (motivo.trim()) {
      onConfirm(motivo.trim());
      setMotivo("");
    }
  };

  const handleCancel = () => {
    setMotivo("");
    onOpenChange(false);
  };

  return {
    motivo,
    setMotivo,
    handleConfirm,
    handleCancel
  };
}
