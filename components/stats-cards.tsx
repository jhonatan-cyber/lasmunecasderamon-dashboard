import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Package } from "lucide-react"

const stats = [
  {
    title: "Ingresos Totales",
    value: "$45,231.89",
    change: "+20.1%",
    changeType: "positive" as const,
    icon: DollarSign,
  },
  {
    title: "Usuarios Activos",
    value: "2,350",
    change: "+180.1%",
    changeType: "positive" as const,
    icon: Users,
  },
  {
    title: "Pedidos",
    value: "12,234",
    change: "+19%",
    changeType: "positive" as const,
    icon: ShoppingCart,
  },
  {
    title: "Productos",
    value: "573",
    change: "-4.3%",
    changeType: "negative" as const,
    icon: Package,
  },
]

export function StatsCards() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="flex items-center gap-1 text-xs">
              {stat.changeType === "positive" ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <span className={stat.changeType === "positive" ? "text-green-600" : "text-red-600"}>{stat.change}</span>
              <span className="text-gray-500">desde el mes pasado</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
