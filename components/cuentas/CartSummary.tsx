import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/formatters';

interface CartSummaryProps {
  total: number;
  itemCount: number;
  onSubmit: () => void;
  loading: boolean;
}

function CartSummaryComponent({ total, itemCount, onSubmit, loading }: CartSummaryProps) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="text-lg font-bold mb-2">TOTAL</div>
      <div className="text-lg font-bold text-green-600">
        {formatCurrencyNoDecimals(total)}
      </div>

      <Button
        onClick={onSubmit}
        disabled={loading || itemCount === 0}
        className="rounded-full px-6 bg-black text-white hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ShoppingCart className="mr-2 h-4 w-4" />
        {loading ? 'Agregando...' : 'Agregar'}
      </Button>
    </div>
  );
}

export const CartSummary = memo(CartSummaryComponent);
