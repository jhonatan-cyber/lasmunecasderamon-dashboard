import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Users, UserCheck, DollarSign, Clock, CheckCircle, Barcode } from "lucide-react";

const badgeColors = [
  "bg-purple-300 text-purple-800",
  "bg-pink-200 text-pink-800",
  "bg-blue-200 text-blue-800",
  "bg-green-200 text-green-800",
  "bg-yellow-200 text-yellow-800",
];

interface OrderTableProps {
  orders: any[];
  onRowClick?: (order: any) => void;
  searchBar?: ReactNode;
}

export default function OrderTable({
  orders,
  onRowClick,
  searchBar,
}: OrderTableProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {searchBar}
        </div>
      </div>
      {orders.map((order) => {
        const anfitrionas = order.nicks
          ? order.nicks
              .split(",")
              .map((a: string) => a.trim())
              .filter(Boolean)
          : [];
        return (
          <div
            key={order.id_pedido}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition-all duration-200"
            onClick={() => onRowClick?.(order)}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="w-full sm:w-auto">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2 sm:mb-1">
                                     <div className="flex items-center gap-2">
                     <Barcode className="h-4 w-4 text-gray-500" />
                     <h3 className="font-medium text-gray-900 text-sm sm:text-base">{order.codigo}</h3>
                   </div>
                  {order.estado === 1 && (
                    <Badge
                      className="bg-purple-300 text-purple-800 hover:bg-purple-400 hover:text-purple-800 text-xs sm:text-sm"
                      variant="outline"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      Pendiente
                    </Badge>
                  )}
                  {order.estado === 2 && (
                    <Badge
                      className="bg-red-500 text-red-800 hover:bg-red-600 hover:text-red-800 text-xs sm:text-sm"
                      variant="outline"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Cerrado
                    </Badge>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-2">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-3 w-3 text-gray-400" />
                    <span className="font-medium">
                      <b className="text-gray-600">Garzón:</b> {order.garzon}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-gray-400" />
                      <b className="text-gray-600">Anfitrionas:</b>
                    </div>
                    <div className="flex flex-wrap gap-1 items-center">
                      {anfitrionas.length > 0 ? (
                        anfitrionas.map((anfitriona: string, idx: number) => (
                          <Badge
                            key={anfitriona + idx}
                            className={
                              badgeColors[idx % badgeColors.length] +
                              " px-2 py-0.5 text-xs"
                            }
                            variant="outline"
                          >
                            {anfitriona}
                          </Badge>
                        ))
                      ) : (
                        <span>-</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-gray-400" />
                    <span className="font-medium">
                      <b className="text-gray-600">Cliente:</b> {order.cliente}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 mt-3 sm:mt-0 w-full sm:w-auto">
              <div className="text-left sm:text-right w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-3 w-3 text-green-500" />
                  <p className="font-medium text-gray-900 text-sm sm:text-base">
                    <b className="text-gray-600">Total:</b>{" "}
                    {order.total.toLocaleString("es-CL", {
                      style: "currency",
                      currency: "CLP",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
