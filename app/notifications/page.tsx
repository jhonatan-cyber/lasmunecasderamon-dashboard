"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, Check, X, AlertCircle, Info, CheckCircle, XCircle, Clock } from "lucide-react"

const notifications = [
  {
    id: 1,
    type: "success",
    title: "Pedido completado",
    message: "El pedido #3210 ha sido entregado exitosamente a Ana García",
    time: "hace 5 minutos",
    read: false,
    category: "orders",
  },
  {
    id: 2,
    type: "warning",
    title: "Stock bajo",
    message: "El producto 'Monitor 4K' tiene solo 3 unidades en stock",
    time: "hace 15 minutos",
    read: false,
    category: "inventory",
  },
  {
    id: 3,
    type: "info",
    title: "Nuevo usuario registrado",
    message: "Carlos López se ha registrado en la plataforma",
    time: "hace 30 minutos",
    read: true,
    category: "users",
  },
  {
    id: 4,
    type: "error",
    title: "Pago fallido",
    message: "El pago del pedido #3205 ha sido rechazado",
    time: "hace 1 hora",
    read: false,
    category: "payments",
  },
  {
    id: 5,
    type: "success",
    title: "Backup completado",
    message: "La copia de seguridad diaria se ha completado correctamente",
    time: "hace 2 horas",
    read: true,
    category: "system",
  },
  {
    id: 6,
    type: "info",
    title: "Actualización disponible",
    message: "Hay una nueva versión del sistema disponible",
    time: "hace 3 horas",
    read: true,
    category: "system",
  },
]

const typeIcons = {
  success: CheckCircle,
  warning: AlertCircle,
  error: XCircle,
  info: Info,
}

const typeColors = {
  success: "text-green-600 bg-green-100",
  warning: "text-yellow-600 bg-yellow-100",
  error: "text-red-600 bg-red-100",
  info: "text-blue-600 bg-blue-100",
}

export default function Notifications() {
  const [notificationList, setNotificationList] = useState(notifications)
  const [filter, setFilter] = useState("all")

  const unreadCount = notificationList.filter((n) => !n.read).length

  const markAsRead = (id: number) => {
    setNotificationList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotificationList((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const deleteNotification = (id: number) => {
    setNotificationList((prev) => prev.filter((n) => n.id !== id))
  }

  const filteredNotifications = notificationList.filter((notification) => {
    if (filter === "all") return true
    if (filter === "unread") return !notification.read
    return notification.category === filter
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-gray-600">
            Gestiona tus notificaciones y alertas del sistema
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount} sin leer
              </Badge>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={markAllAsRead} disabled={unreadCount === 0}>
            <Check className="h-4 w-4 mr-2" />
            Marcar todas como leídas
          </Button>
          <Button variant="outline">
            <Bell className="h-4 w-4 mr-2" />
            Configurar
          </Button>
        </div>
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todas ({notificationList.length})</TabsTrigger>
          <TabsTrigger value="unread">Sin leer ({unreadCount})</TabsTrigger>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay notificaciones</h3>
                <p className="text-gray-500 text-center">
                  {filter === "unread"
                    ? "¡Genial! No tienes notificaciones sin leer."
                    : "No hay notificaciones en esta categoría."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => {
                const Icon = typeIcons[notification.type as keyof typeof typeIcons]
                return (
                  <Card
                    key={notification.id}
                    className={`transition-all ${!notification.read ? "border-l-4 border-l-blue-500 bg-blue-50/30" : ""}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full ${typeColors[notification.type as keyof typeof typeColors]}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-medium ${!notification.read ? "text-gray-900" : "text-gray-700"}`}>
                              {notification.title}
                            </h3>
                            {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {notification.time}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.read && (
                            <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => deleteNotification(notification.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
