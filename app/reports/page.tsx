"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package } from "lucide-react"

const salesData = [
  { period: "Enero 2024", revenue: 45231, orders: 234, customers: 189, growth: "+12.5%" },
  { period: "Febrero 2024", revenue: 52890, orders: 267, customers: 201, growth: "+16.9%" },
  { period: "Marzo 2024", revenue: 48756, orders: 245, customers: 195, growth: "-7.8%" },
  { period: "Abril 2024", revenue: 61234, orders: 298, customers: 234, growth: "+25.6%" },
]

const topProducts = [
  { name: 'Laptop Pro 15"', sales: 89, revenue: "$115,611", growth: "+23%" },
  { name: "Smartphone X", sales: 67, revenue: "$46,833", growth: "+15%" },
  { name: "Auriculares Pro", sales: 156, revenue: "$31,044", growth: "+8%" },
  { name: "Tablet Air", sales: 43, revenue: "$19,307", growth: "-5%" },
  { name: "Monitor 4K", sales: 34, revenue: "$13,566", growth: "+12%" },
]

const customerSegments = [
  { segment: "Nuevos Clientes", count: 1234, percentage: 45.2, revenue: "$89,456" },
  { segment: "Clientes Recurrentes", count: 987, percentage: 36.1, revenue: "$156,789" },
  { segment: "Clientes VIP", count: 234, percentage: 8.6, revenue: "$234,567" },
  { segment: "Clientes Inactivos", count: 278, percentage: 10.1, revenue: "$12,345" },
]

export default function Reports() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-600">Análisis detallado del rendimiento de tu negocio</p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="last30days">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7days">Últimos 7 días</SelectItem>
              <SelectItem value="last30days">Últimos 30 días</SelectItem>
              <SelectItem value="last90days">Últimos 90 días</SelectItem>
              <SelectItem value="lastyear">Último año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Resumen General</TabsTrigger>
          <TabsTrigger value="sales">Ventas</TabsTrigger>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$208,111</div>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +16.2% vs período anterior
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pedidos Totales</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,044</div>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12.8% vs período anterior
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nuevos Clientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">819</div>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +8.4% vs período anterior
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Productos Vendidos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,389</div>
                <div className="flex items-center text-xs text-red-600">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  -2.1% vs período anterior
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rendimiento Mensual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {salesData.map((data, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">{data.period}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span>{data.orders} pedidos</span>
                        <span>{data.customers} clientes</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">${data.revenue.toLocaleString()}</div>
                      <div className={`text-sm ${data.growth.startsWith("+") ? "text-green-600" : "text-red-600"}`}>
                        {data.growth}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Productos Más Vendidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{product.name}</h3>
                        <p className="text-sm text-gray-500">{product.sales} unidades vendidas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{product.revenue}</div>
                      <div className={`text-sm ${product.growth.startsWith("+") ? "text-green-600" : "text-red-600"}`}>
                        {product.growth}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Segmentación de Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customerSegments.map((segment, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{segment.segment}</span>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>{segment.count} clientes</span>
                        <span className="font-medium text-gray-900">{segment.revenue}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${segment.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
