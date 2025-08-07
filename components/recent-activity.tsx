import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const activities = [
  {
    id: 1,
    user: "Ana García",
    action: "realizó una compra",
    amount: "$299.00",
    time: "hace 2 minutos",
    status: "completed",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 2,
    user: "Carlos López",
    action: "se registró",
    amount: null,
    time: "hace 5 minutos",
    status: "new",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 3,
    user: "María Rodríguez",
    action: "canceló pedido",
    amount: "$150.00",
    time: "hace 10 minutos",
    status: "cancelled",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 4,
    user: "Pedro Martín",
    action: "realizó una compra",
    amount: "$89.99",
    time: "hace 15 minutos",
    status: "completed",
    avatar: "/placeholder.svg?height=32&width=32",
  },
  {
    id: 5,
    user: "Laura Sánchez",
    action: "actualizó perfil",
    amount: null,
    time: "hace 20 minutos",
    status: "updated",
    avatar: "/placeholder.svg?height=32&width=32",
  },
]

const statusColors = {
  completed: "bg-green-100 text-green-800",
  new: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  updated: "bg-yellow-100 text-yellow-800",
}

const statusLabels = {
  completed: "Completado",
  new: "Nuevo",
  cancelled: "Cancelado",
  updated: "Actualizado",
}

export function RecentActivity() {
  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Actividad Reciente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center gap-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={activity.avatar || "/placeholder.svg"} />
                <AvatarFallback>
                  {activity.user
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{activity.user}</p>
                  <Badge variant="secondary" className={statusColors[activity.status as keyof typeof statusColors]}>
                    {statusLabels[activity.status as keyof typeof statusLabels]}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">
                  {activity.action}
                  {activity.amount && <span className="font-medium text-gray-900 ml-1">{activity.amount}</span>}
                </p>
              </div>
              <div className="text-xs text-gray-400">{activity.time}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
