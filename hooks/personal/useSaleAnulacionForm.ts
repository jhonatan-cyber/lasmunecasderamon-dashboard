import { useState } from 'react';

interface UseSaleAnulacionFormProps {
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { motivo: string; monto: number }) => void;
}

export function useSaleAnulacionForm({
  onOpenChange,
  onConfirm
}: UseSaleAnulacionFormProps) {
  const [motivo, setMotivo] = useState("");
  const [monto, setMonto] = useState("");

  const handleConfirm = () => {
    const montoNumerico = Number(monto.replace(/\D/g, ''));

    if (motivo.trim() && montoNumerico > 0) {
      onConfirm({ motivo: motivo.trim(), monto: montoNumerico });
      setMotivo("");
      setMonto("");
    }
  };

  const handleCancel = () => {
    setMotivo("");
    setMonto("");
    onOpenChange(false);
  };

  return {
    motivo,
    setMotivo,
    monto,
    setMonto,
    handleConfirm,
    handleCancel
  };
}
