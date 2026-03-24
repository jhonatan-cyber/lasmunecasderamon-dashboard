/* eslint-disable */
import { Badge } from "@/components/ui/badge";
import { Package, DollarSign, Coins, TrendingUp } from "lucide-react";
import { formatCurrencyNoDecimals } from "@/lib/formatters";

interface ProductStatsBarProps {
  productos: any[];
  filteredCount: number;
  searchTerm: string;
}

export default function ProductStatsBar({ 
  productos, 
  filteredCount, 
  searchTerm 
}: ProductStatsBarProps) {
  const totalProducts = productos?.length || 0;
  
  const stats = productos?.reduce((acc, producto) => {
    const precio = producto.precio || producto.price || 0;
    const comision = producto.comision || producto.commission || 0;
    
    return {
      totalValue: acc.totalValue + precio,
      totalCommission: acc.totalCommission + comision,
      withCommission: acc.withCommission + (comision > 0 ? 1 : 0),
      avgPrice: acc.totalValue + precio,
    };
  }, {
    totalValue: 0,
    totalCommission: 0,
    withCommission: 0,
    avgPrice: 0,
  }) || { totalValue: 0, totalCommission: 0, withCommission: 0, avgPrice: 0 };

  const avgPrice = totalProducts > 0 ? stats.totalValue / totalProducts : 0;

  return (
    <div className="flex items-center gap-4 text-xs text-gray-600 bg-white rounded-lg p-3 border">
      <div className="flex items-center gap-1">
        <Package className="w-3 h-3" />
        <span>
          {searchTerm ? (
            <>
              {filteredCount} de {totalProducts} productos
            </>
          ) : (
            <>
              {totalProducts} productos
            </>
          )}
        </span>
      </div>
      
      {totalProducts > 0 && (
        <>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-green-600" />
            <span>Precio promedio: {formatCurrencyNoDecimals(avgPrice)}</span>
          </div>
          
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1">
            <Coins className="w-3 h-3 text-orange-600" />
            <span>{stats.withCommission} con comisión</span>
          </div>
          
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-blue-600" />
            <span>Valor total: {formatCurrencyNoDecimals(stats.totalValue)}</span>
          </div>
        </>
      )}
      
      {searchTerm && (
        <Badge variant="outline" className="ml-auto text-xs">
          Filtrado: "{searchTerm}"
        </Badge>
      )}
    </div>
  );
}
