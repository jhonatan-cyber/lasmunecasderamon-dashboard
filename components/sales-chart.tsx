"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const data = [
  { month: "Ene", sales: 4000 },
  { month: "Feb", sales: 3000 },
  { month: "Mar", sales: 5000 },
  { month: "Abr", sales: 4500 },
  { month: "May", sales: 6000 },
  { month: "Jun", sales: 5500 },
]

export function SalesChart() {
  const maxSales = Math.max(...data.map((d) => d.sales))

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Ventas por Mes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end justify-between gap-2">
          {data.map((item) => (
            <div key={item.month} className="flex flex-col items-center gap-2 flex-1">
              <div className="text-xs font-medium text-gray-600">${(item.sales / 1000).toFixed(0)}k</div>
              <div
                className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm transition-all duration-300 hover:from-blue-600 hover:to-blue-500"
                style={{
                  height: `${(item.sales / maxSales) * 200}px`,
                  minHeight: "20px",
                }}
              />
              <div className="text-xs text-gray-500 font-medium">{item.month}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
