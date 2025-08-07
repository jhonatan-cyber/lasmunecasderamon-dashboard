import { StatsCards } from "@/components/stats-cards"
import { RecentActivity } from "@/components/recent-activity"
import { SalesChart } from "@/components/sales-chart"
import { RecentOrders } from "@/components/recent-orders"

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Bienvenido al panel de administración</p>
      </div>

      <StatsCards />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <SalesChart />
        </div>
        <div className="lg:col-span-3">
          <RecentActivity />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentOrders />
        </div>
      </div>
    </div>
  )
}
