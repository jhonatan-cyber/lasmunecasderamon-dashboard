"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Bell, Shield, CreditCard, Palette, Save } from "lucide-react"

export default function Settings() {
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: true,
    marketing: false,
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600">Gestiona la configuración de tu cuenta y preferencias</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          <TabsTrigger value="billing">Facturación</TabsTrigger>
          <TabsTrigger value="appearance">Apariencia</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="/placeholder.svg?height=80&width=80" />
                  <AvatarFallback>JP</AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline">Cambiar Foto</Button>
                  <p className="text-sm text-gray-500 mt-1">JPG, PNG o GIF. Máximo 2MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input id="firstName" defaultValue="Juan" />
                </div>
                <div>
                  <Label htmlFor="lastName">Apellidos</Label>
                  <Input id="lastName" defaultValue="Pérez" />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="juan.perez@email.com" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" defaultValue="+34 600 000 000" />
                </div>
                <div>
                  <Label htmlFor="timezone">Zona Horaria</Label>
                  <Select defaultValue="europe/madrid">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="europe/madrid">Europa/Madrid</SelectItem>
                      <SelectItem value="europe/london">Europa/Londres</SelectItem>
                      <SelectItem value="america/new_york">América/Nueva York</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Biografía</Label>
                <Textarea id="bio" placeholder="Cuéntanos sobre ti..." />
              </div>

              <Button>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Preferencias de Notificación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Notificaciones por Email</h3>
                  <p className="text-sm text-gray-500">Recibe actualizaciones importantes por email</p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Notificaciones Push</h3>
                  <p className="text-sm text-gray-500">Recibe notificaciones en tiempo real</p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Notificaciones SMS</h3>
                  <p className="text-sm text-gray-500">Recibe alertas críticas por SMS</p>
                </div>
                <Switch
                  checked={notifications.sms}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, sms: checked })}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Marketing y Promociones</h3>
                  <p className="text-sm text-gray-500">Recibe ofertas especiales y noticias</p>
                </div>
                <Switch
                  checked={notifications.marketing}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, marketing: checked })}
                />
              </div>

              <Button>Guardar Preferencias</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Seguridad de la Cuenta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Cambiar Contraseña</h3>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="currentPassword">Contraseña Actual</Label>
                    <Input id="currentPassword" type="password" />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">Nueva Contraseña</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                    <Input id="confirmPassword" type="password" />
                  </div>
                  <Button>Actualizar Contraseña</Button>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-2">Autenticación de Dos Factores</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Añade una capa extra de seguridad a tu cuenta</p>
                    <Badge variant="outline" className="mt-1">
                      Desactivado
                    </Badge>
                  </div>
                  <Button variant="outline">Configurar 2FA</Button>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-2">Sesiones Activas</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                    <div>
                      <p className="font-medium">Chrome en Windows</p>
                      <p className="text-sm text-gray-500">Madrid, España • Activa ahora</p>
                    </div>
                    <Badge variant="secondary">Actual</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                    <div>
                      <p className="font-medium">Safari en iPhone</p>
                      <p className="text-sm text-gray-500">Madrid, España • Hace 2 horas</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Cerrar Sesión
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Facturación y Suscripción
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                <div>
                  <h3 className="font-medium">Plan Profesional</h3>
                  <p className="text-sm text-gray-500">Facturación mensual • Próximo pago: 15 Feb 2024</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">€29.99/mes</div>
                  <Button variant="outline" size="sm">
                    Cambiar Plan
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-3">Métodos de Pago</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center">
                        VISA
                      </div>
                      <div>
                        <p className="font-medium">•••• •••• •••• 4242</p>
                        <p className="text-sm text-gray-500">Expira 12/26</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">Principal</Badge>
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="mt-3 bg-transparent">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Añadir Método de Pago
                </Button>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-3">Historial de Facturación</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Enero 2024</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">€29.99</span>
                      <Button variant="ghost" size="sm">
                        Descargar
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm">Diciembre 2023</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">€29.99</span>
                      <Button variant="ghost" size="sm">
                        Descargar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Apariencia y Tema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-3">Tema</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-500">
                    <div className="w-full h-16 bg-white border rounded mb-2"></div>
                    <p className="text-sm text-center">Claro</p>
                  </div>
                  <div className="p-3 border border-blue-500 rounded-lg cursor-pointer">
                    <div className="w-full h-16 bg-gray-900 rounded mb-2"></div>
                    <p className="text-sm text-center">Oscuro</p>
                  </div>
                  <div className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-500">
                    <div className="w-full h-16 bg-gradient-to-r from-white to-gray-900 rounded mb-2"></div>
                    <p className="text-sm text-center">Sistema</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-3">Idioma</h3>
                <Select defaultValue="es">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Animaciones Reducidas</h3>
                  <p className="text-sm text-gray-500">Reduce las animaciones para mejorar el rendimiento</p>
                </div>
                <Switch />
              </div>

              <Button>Guardar Configuración</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
