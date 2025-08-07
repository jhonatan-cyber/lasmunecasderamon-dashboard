import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping } from "@fortawesome/free-solid-svg-icons";
import React from "react";
import { formatCurrencyNoDecimals } from "@/lib/formatters";

interface OrderTotalHeaderProps {
  total: number;
  onSubmit?: () => void;
}

const OrderTotalHeader: React.FC<OrderTotalHeaderProps> = ({ total, onSubmit }) => (
  <div className="flex flex-col items-center justify-center">
    <div className="text-xs text-gray-400 font-semibold mb-1">TOTAL</div>
    <div className="text-2xl font-bold text-gray-800 mb-2">{formatCurrencyNoDecimals(total)}</div>
    <Button
      variant="outline"
      className="rounded-full px-6 bg-black text-white hover:scale-110 transition-all duration-200"
      onClick={onSubmit}
    >
      <FontAwesomeIcon icon={faCartShopping} className="mr-2" />
      Generar pedido
    </Button>
  </div>
);

export default OrderTotalHeader; 