import { Sidebar } from "./components/sidebar"
import { Header } from "./components/header"
import { StatsCards } from "./components/stats-cards"
import { SalesChart } from "./components/sales-chart"
import { RecentActivity } from "./components/recent-activity"
import { RecentOrders } from "./components/recent-orders"

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Bienvenido de vuelta, aquí tienes un resumen de tu negocio.</p>
            </div>

            <StatsCards />

            <div className="grid gap-6 lg:grid-cols-2">
              <SalesChart />
              <RecentActivity />
            </div>

            <RecentOrders />
          </div>
        </main>
      </div>
    </div>
  )
}
