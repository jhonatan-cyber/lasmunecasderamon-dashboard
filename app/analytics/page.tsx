"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, Users, Eye, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react"

const trafficData = [
  { source: "Búsqueda Orgánica", visitors: 12543, percentage: 45.2, change: "+12.5%" },
  { source: "Redes Sociales", visitors: 8932, percentage: 32.1, change: "+8.3%" },
  { source: "Directo", visitors: 4521, percentage: 16.3, change: "-2.1%" },
  { source: "Email Marketing", visitors: 1789, percentage: 6.4, change: "+15.7%" },
]

const pageViews = [
  { page: "/dashboard", views: 15420, bounce: "23.5%" },
  { page: "/productos", views: 12890, bounce: "31.2%" },
  { page: "/usuarios", views: 9876, bounce: "28.7%" },
  { page: "/pedidos", views: 7654, bounce: "19.8%" },
  { page: "/configuracion", views: 3421, bounce: "45.3%" },
]

export default function Analytics() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Análisis detallado del rendimiento de tu plataforma</p>
        </div>
        <Select defaultValue="7days">
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Últimos 7 días</SelectItem>
            <SelectItem value="30days">Últimos 30 días</SelectItem>
            <SelectItem value="90days">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitantes Únicos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">27,685</div>
            <div className="flex items-center text-xs text-green-600">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +12.5% vs mes anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Páginas Vistas</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">49,261</div>
            <div className="flex items-center text-xs text-green-600">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +8.2% vs mes anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3:24</div>
            <div className="flex items-center text-xs text-red-600">
              <ArrowDownRight className="h-3 w-3 mr-1" />
              -5.1% vs mes anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4%</div>
            <div className="flex items-center text-xs text-green-600">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              +0.3% vs mes anterior
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="traffic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="traffic">Fuentes de Tráfico</TabsTrigger>
          <TabsTrigger value="pages">Páginas Populares</TabsTrigger>
          <TabsTrigger value="devices">Dispositivos</TabsTrigger>
        </TabsList>

        <TabsContent value="traffic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fuentes de Tráfico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trafficData.map((item) => (
                  <div key={item.source} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{item.source}</span>
                        <span className="text-sm text-gray-500">{item.visitors.toLocaleString()} visitantes</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${item.percentage}%` }} />
                      </div>
                    </div>
                    <div className="ml-4 text-sm text-green-600">{item.change}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Páginas Más Visitadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pageViews.map((item) => (
                  <div key={item.page} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <span className="text-sm font-medium">{item.page}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{item.views.toLocaleString()} vistas</span>
                      <span>Rebote: {item.bounce}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Desktop</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold text-blue-600">64.2%</div>
                <p className="text-sm text-gray-500">17,789 visitantes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Mobile</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold text-green-600">31.5%</div>
                <p className="text-sm text-gray-500">8,721 visitantes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Tablet</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold text-purple-600">4.3%</div>
                <p className="text-sm text-gray-500">1,175 visitantes</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
