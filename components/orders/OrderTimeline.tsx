'use client';

import { Button } from '@/components/ui/button';

interface OrderTimelineProps {
  isRegistering: boolean;
  isClienteRegistrado: boolean;
  onRegistrarVenta: (e?: React.MouseEvent) => void;
  onRegistrarCuenta: (e?: React.MouseEvent) => void;
  onClose: () => void;
}

export function OrderTimeline({
  isRegistering,
  isClienteRegistrado,
  onRegistrarVenta,
  onRegistrarCuenta,
  onClose,
}: OrderTimelineProps) {
  return (
    <div className="shrink-0 border-t border-border/60 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
        <Button
          size="sm"
          variant="outline"
          className="w-full rounded-full bg-black px-4 text-xs text-white transition-all duration-200 hover:scale-105 sm:w-auto sm:px-6 sm:text-sm dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          onClick={onRegistrarVenta}
          disabled={isRegistering}
          type="button"
        >
          {isRegistering ? 'Registrando...' : 'Registrar Venta'}
        </Button>

        {isClienteRegistrado && (
          <Button
            size="sm"
            variant="outline"
            className="w-full rounded-full bg-black px-4 text-xs text-white transition-all duration-200 hover:scale-105 sm:w-auto sm:px-6 sm:text-sm dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
            onClick={onRegistrarCuenta}
            disabled={isRegistering}
            type="button"
          >
            {isRegistering ? 'Registrando...' : 'Registrar Cuenta'}
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          className="w-full rounded-full bg-gray-500 px-4 text-xs text-white transition-all duration-200 hover:scale-105 hover:bg-gray-600 sm:w-auto sm:px-6 sm:text-sm dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          onClick={(e) => {
            e.preventDefault();
            onClose();
          }}
          type="button"
        >
          Cerrar
        </Button>
      </div>
    </div>
  );
}
