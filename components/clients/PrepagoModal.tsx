/* eslint-disable */
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Client } from '@/types/client';
import { toast } from 'sonner';

interface PrepagoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSuccess?: () => void;
}

export function PrepagoModal({ open, onOpenChange, client, onSuccess }: PrepagoModalProps) {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !amount) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/clients/prepago', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cliente_id: client.id,
          monto: parseInt(amount),
          tipo: 'CARGA'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Saldo cargado correctamente');
        setAmount('');
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.message || 'Error al cargar saldo');
      }
    } catch (error) {
      toast.error('Error al procesar la solicitud');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cargar Saldo Prepago</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="client-name">Cliente</Label>
            <Input
              id="client-name"
              value={client ? `${client.name} ${client.lastName}` : ''}
              disabled
              className="bg-gray-100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="balance">Saldo Actual</Label>
            <div className="text-xl font-bold">
              ${(client?.saldo || 0).toLocaleString('es-CL')}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Monto a Cargar</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Ej: 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="1"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !amount}>
              {isSubmitting ? 'Cargando...' : 'Confirmar Carga'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
