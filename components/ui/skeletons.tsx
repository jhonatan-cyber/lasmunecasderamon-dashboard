import { cn } from '@/lib/utils';

// Skeleton base
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-gray-700', className)}
      {...props}
    />
  );
}

// Table Skeleton
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 flex-1" />
      </div>
      
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center py-3">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

// Card Skeleton
export function CardSkeleton() {
  return (
    <div className="p-6 border rounded-lg space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

// Stats Card Skeleton
export function StatsCardSkeleton() {
  return (
    <div className="p-6 border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-32 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

// Chart Skeleton
export function ChartSkeleton() {
  return (
    <div className="p-6 border rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-24" />
      </div>
      
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-end gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton 
              className="flex-1" 
              style={{ height: `${Math.random() * 100 + 50}px` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Form Skeleton
export function FormSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      
      <div className="flex gap-3 justify-end pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

// Report Skeleton
export function ReportSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Chart */}
      <ChartSkeleton />
      
      {/* Table */}
      <div className="border rounded-lg p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <TableSkeleton rows={8} />
      </div>
    </div>
  );
}

// Dashboard Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      
      {/* Recent Activity */}
      <div className="border rounded-lg p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <TableSkeleton rows={5} />
      </div>
    </div>
  );
}

// List Skeleton
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(items)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

// Users Skeleton
export function UsersSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 sm:h-10 sm:w-64" />
          <Skeleton className="h-4 w-64 sm:w-80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 sm:w-32 rounded-full" />
          <Skeleton className="h-10 w-32 sm:w-40 rounded-full" />
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-xl bg-gray-50/50">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      {/* Table Skeleton */}
      <div className="border rounded-xl overflow-hidden bg-white mt-6">
        <div className="hidden lg:block">
          <div className="flex bg-gray-50 border-b p-4">
            <Skeleton className="h-4 w-1/6 mr-4" />
            <Skeleton className="h-4 w-1/6 mr-4" />
            <Skeleton className="h-4 w-1/6 mr-4" />
            <Skeleton className="h-4 w-1/6 mr-4" />
            <Skeleton className="h-4 w-1/6 mr-4" />
            <Skeleton className="h-4 w-1/6" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex p-4 border-b last:border-b-0 items-center">
              <div className="flex items-center w-1/6 mr-4">
                <Skeleton className="h-10 w-10 rounded-full mr-3" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-4 w-1/6 mr-4" />
              <Skeleton className="h-4 w-1/6 mr-4" />
              <Skeleton className="h-6 w-1/6 mr-4 rounded-full" />
              <Skeleton className="h-6 w-1/6 mr-4 rounded-full" />
              <div className="w-1/6 flex justify-center">
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        
        {/* Mobile Cards Skeleton */}
        <div className="lg:hidden space-y-4 p-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 border rounded-lg space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-8 rounded-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Clients Skeleton
export function ClientsSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32 sm:h-10 sm:w-48" />
          <Skeleton className="h-4 w-64 sm:w-80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 sm:w-32 rounded-full" />
          <Skeleton className="h-10 w-32 sm:w-40 rounded-full" />
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-xl bg-gray-50/50">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden bg-white mt-6">
        <div className="hidden lg:block">
          <div className="flex bg-gray-50 border-b p-4">
            <Skeleton className="h-4 w-1/5 mr-4" />
            <Skeleton className="h-4 w-1/5 mr-4" />
            <Skeleton className="h-4 w-1/5 mr-4" />
            <Skeleton className="h-4 w-1/5 mr-4" />
            <Skeleton className="h-4 w-1/5" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex p-4 border-b last:border-b-0 items-center">
              <Skeleton className="h-4 w-1/5 mr-4" />
              <Skeleton className="h-4 w-1/5 mr-4" />
              <Skeleton className="h-4 w-1/5 mr-4" />
              <Skeleton className="h-6 w-1/5 mr-4 rounded-full" />
              <div className="w-1/5 flex justify-center">
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="lg:hidden space-y-4 p-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Categories Skeleton
export function CategoriesSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 sm:h-10 sm:w-48" />
          <Skeleton className="h-4 w-56 sm:w-72" />
        </div>
        <Skeleton className="h-10 w-40 rounded-full" />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-xl bg-gray-50/50">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      {/* Category Cards Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-6 border rounded-xl space-y-4 bg-white">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex justify-between items-center pt-2">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Products Skeleton
export function ProductsSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 sm:h-10 sm:w-48" />
          <Skeleton className="h-4 w-64 sm:w-80" />
        </div>
      </div>

      {/* Category Cards Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="p-6 border rounded-xl space-y-3 bg-white">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Settings (Permissions) Skeleton
export function SettingsSkeleton() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 sm:h-10 sm:w-72" />
          <Skeleton className="h-4 w-64 sm:w-80" />
        </div>
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 border rounded-lg">
            <div className="text-center space-y-2">
              <Skeleton className="h-8 w-12 mx-auto" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
          </div>
        ))}
      </div>

      {/* Filter Card */}
      <div className="p-4 sm:p-6 border rounded-lg">
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="h-10 w-48 rounded-full" />
        </div>
      </div>

      {/* Permissions List */}
      <div className="border rounded-lg p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3 w-64" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Profile Skeleton
export function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-10 mt-4 sm:mt-6 lg:mt-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48 sm:w-64" />
          <Skeleton className="h-4 w-64 sm:w-80" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>

      {/* Profile Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Info Card */}
        <div className="border rounded-lg p-6 space-y-4">
          <div className="space-y-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-px w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
          </div>
        </div>

        {/* Activity Card */}
        <div className="border rounded-lg p-6 space-y-4">
          <div className="space-y-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-3 border rounded-lg">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Error Logs Skeleton
export function ErrorLogsSkeleton() {
  return (
    <div className="p-8 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-start">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-16 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

// Notifications Skeleton
export function NotificationsSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-48 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>

      {/* Tabs */}
      <Skeleton className="h-10 w-full max-w-2xl rounded-lg" />

      {/* Notification Items */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="flex items-start gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Role Dashboard Skeleton (for anfitriona-dashboard, garzon-dashboard)
export function RoleDashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="text-left space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="text-center space-y-2">
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-8 w-40 mx-auto" />
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border-dotted border-2 border-gray-200 rounded-lg p-6 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-12" />
            </div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Rooms Skeleton
export function RoomsSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
        <Skeleton className="h-8 w-48 sm:h-10 sm:w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-xl bg-gray-50/50">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      {/* Grid of Rooms */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 mt-4 sm:mt-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="border rounded-xl p-4 space-y-4 bg-white">
            <div className="flex justify-between items-center">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="flex justify-between items-center pt-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Role Table Skeleton (for anfitriona/garzon/cajero list pages: anticipos, asistencias, comisiones, etc.)
export function RoleTableSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>

      {/* Totals */}
      <div className="text-center">
        <Skeleton className="h-4 w-28 mx-auto mb-2" />
        <Skeleton className="h-8 w-36 mx-auto" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Skeleton className="h-10 w-32 rounded-md" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-48 rounded-md" />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 p-4 flex gap-4">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-t items-center">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center">
        <Skeleton className="h-10 w-64 rounded-lg" />
      </div>
    </div>
  );
}

// Role Calendar Skeleton
export function RoleCalendarSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-6 w-full rounded-md" />
          ))}
        </div>
        {/* Calendar cells */}
        {[...Array(5)].map((_, row) => (
          <div key={row} className="grid grid-cols-7 gap-2 mb-2">
            {[...Array(7)].map((_, col) => (
              <Skeleton key={col} className="h-20 w-full rounded-md" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Sales Skeleton
export function SalesSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10">
      {/* Sales Header */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 shadow-sm">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      {/* Caja Status Banner */}
      <Skeleton className="h-16 w-full rounded-xl" />

      {/* Sales Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Sales Filters */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      </div>

      {/* Sales Tabs */}
      <div className="flex justify-center mb-6">
        <Skeleton className="h-12 w-64 rounded-full" />
      </div>

      {/* Sales List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 overflow-hidden">
        <div className="bg-gray-50 dark:bg-slate-800/50 p-4 flex gap-4 border-b dark:border-slate-700">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 flex-1" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="p-4 border-b dark:border-slate-800 last:border-b-0 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
