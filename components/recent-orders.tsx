import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const orders = [
  {
    id: "#3210",
    customer: "Ana García",
    product: 'Laptop Pro 15"',
    amount: "$1,299.00",
    status: "completed",
    date: "2024-01-15",
  },
  {
    id: "#3209",
    customer: "Carlos López",
    product: "Smartphone X",
    amount: "$699.00",
    status: "processing",
    date: "2024-01-15",
  },
  {
    id: "#3208",
    customer: "María Rodríguez",
    product: "Tablet Air",
    amount: "$449.00",
    status: "shipped",
    date: "2024-01-14",
  },
  {
    id: "#3207",
    customer: "Pedro Martín",
    product: "Auriculares Pro",
    amount: "$199.00",
    status: "completed",
    date: "2024-01-14",
  },
  {
    id: "#3206",
    customer: "Laura Sánchez",
    product: "Monitor 4K",
    amount: "$399.00",
    status: "cancelled",
    date: "2024-01-13",
  },
]

const statusColors = {
  completed: "bg-green-100 text-green-800",
  processing: "bg-yellow-100 text-yellow-800",
  shipped: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
}

const statusLabels = {
  completed: "Completado",
  processing: "Procesando",
  shipped: "Enviado",
  cancelled: "Cancelado",
}

export function RecentOrders() {
  return (
    <Card className="border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-gray-900">Pedidos Recientes</CardTitle>
        <Button variant="outline" size="sm">
          Ver todos
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-medium text-gray-900">{order.id}</p>
                  <p className="text-sm text-gray-500">{order.customer}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.product}</p>
                  <p className="text-sm text-gray-500">{order.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-medium text-gray-900">{order.amount}</p>
                  <Badge variant="secondary" className={statusColors[order.status as keyof typeof statusColors]}>
                    {statusLabels[order.status as keyof typeof statusLabels]}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                    <DropdownMenuItem>Editar pedido</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">Cancelar pedido</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
