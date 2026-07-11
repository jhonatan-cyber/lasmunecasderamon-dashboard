import { cn } from '@/lib/utils/utils';

// ponytail: base Skeleton lives in components/ui/skeleton.tsx (CSS variable based).
// Don't add page-specific skeletons here — use the building blocks below +
// ListPageSkeleton for the common header + filters + table layout.

// ─── Building blocks ──────────────────────────────────────────────

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className='space-y-3'>
      <div className='flex gap-4 pb-3 border-b'>
        <SkeletonBlock className='h-4 w-12' />
        <SkeletonBlock className='h-4 w-32' />
        <SkeletonBlock className='h-4 w-24' />
        <SkeletonBlock className='h-4 w-28' />
        <SkeletonBlock className='h-4 flex-1' />
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className='flex gap-4 items-center py-3'>
          <SkeletonBlock className='h-4 w-12' />
          <SkeletonBlock className='h-4 w-32' />
          <SkeletonBlock className='h-4 w-24' />
          <SkeletonBlock className='h-4 w-28' />
          <SkeletonBlock className='h-4 flex-1' />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className='p-6 border rounded-lg space-y-3'>
      <SkeletonBlock className='h-4 w-1/3' />
      <SkeletonBlock className='h-8 w-1/2' />
      <SkeletonBlock className='h-4 w-full' />
      <SkeletonBlock className='h-4 w-2/3' />
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className='p-6 border rounded-lg'>
      <div className='flex items-center justify-between mb-4'>
        <SkeletonBlock className='h-4 w-24' />
        <SkeletonBlock className='h-8 w-8 rounded-full' />
      </div>
      <SkeletonBlock className='h-8 w-32 mb-2' />
      <SkeletonBlock className='h-3 w-20' />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className='p-6 border rounded-lg'>
      <div className='flex items-center justify-between mb-6'>
        <SkeletonBlock className='h-6 w-40' />
        <SkeletonBlock className='h-8 w-24' />
      </div>
      <div className='space-y-4'>
        {[...Array(6)].map((_, i) => (
          <div key={i} className='flex items-end gap-2'>
            <SkeletonBlock className='h-3 w-12' />
            {/* eslint-disable-next-line react-hooks/purity */}
            <SkeletonBlock className='flex-1' style={{ height: `${Math.random() * 100 + 50}px` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className='space-y-6'>
      {[...Array(4)].map((_, i) => (
        <div key={i} className='space-y-2'>
          <SkeletonBlock className='h-4 w-24' />
          <SkeletonBlock className='h-10 w-full' />
        </div>
      ))}
      <div className='flex gap-3 justify-end pt-4'>
        <SkeletonBlock className='h-10 w-24' />
        <SkeletonBlock className='h-10 w-24' />
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className='space-y-3'>
      {[...Array(items)].map((_, i) => (
        <div key={i} className='flex items-center gap-4 p-4 border rounded-lg'>
          <SkeletonBlock className='h-12 w-12 rounded-full' />
          <div className='flex-1 space-y-2'>
            <SkeletonBlock className='h-4 w-3/4' />
            <SkeletonBlock className='h-3 w-1/2' />
          </div>
          <SkeletonBlock className='h-8 w-20' />
        </div>
      ))}
    </div>
  );
}

// ─── Composite layouts ────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {[...Array(4)].map((_, i) => <StatsCardSkeleton key={i} />)}
      </div>
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <div className='border rounded-lg p-6'>
        <SkeletonBlock className='h-6 w-40 mb-4' />
        <TableSkeleton rows={5} />
      </div>
    </div>
  );
}

export function ReportSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='space-y-2'>
          <SkeletonBlock className='h-8 w-48' />
          <SkeletonBlock className='h-4 w-64' />
        </div>
        <SkeletonBlock className='h-10 w-32' />
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {[...Array(4)].map((_, i) => <StatsCardSkeleton key={i} />)}
      </div>
      <ChartSkeleton />
      <div className='border rounded-lg p-6'>
        <SkeletonBlock className='h-6 w-32 mb-4' />
        <TableSkeleton rows={8} />
      </div>
    </div>
  );
}

// ─── List page skeleton (replaces UsersSkeleton, ClientsSkeleton, etc.) ─────

type ListPageVariant = 'default' | 'cards' | 'grid';

// ponytail: single skeleton for the common list page layout:
// header + search filters + table/card grid + rows.
export function ListPageSkeleton({
  variant = 'default',
  rows = 5
}: {
  variant?: ListPageVariant;
  rows?: number;
}) {
  return (
    <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-6'>
        <div className='space-y-2'>
          <SkeletonBlock className='h-8 w-40 sm:h-10 sm:w-48' />
          <SkeletonBlock className='h-4 w-56 sm:w-72' />
        </div>
        <div className='flex gap-2'>
          <SkeletonBlock className='h-10 w-24 rounded-full' />
          <SkeletonBlock className='h-10 w-32 rounded-full' />
        </div>
      </div>

      {/* Filters bar */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-xl bg-gray-50/50'>
        <SkeletonBlock className='h-10 w-full rounded-lg' />
        <SkeletonBlock className='h-10 w-full rounded-lg' />
        <SkeletonBlock className='h-10 w-full rounded-lg' />
        <SkeletonBlock className='h-10 w-full rounded-lg' />
      </div>

      {/* Content */}
      {variant === 'grid' && (
        <div className='grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'>
          {[...Array(rows)].map((_, i) => (
            <div key={i} className='p-6 border rounded-xl space-y-4 bg-white'>
              <div className='flex justify-between items-center'>
                <SkeletonBlock className='h-6 w-2/3' />
                <SkeletonBlock className='h-6 w-16 rounded-full' />
              </div>
              <SkeletonBlock className='h-4 w-full' />
              <SkeletonBlock className='h-4 w-3/4' />
              <div className='flex justify-between items-center pt-2'>
                <SkeletonBlock className='h-4 w-24' />
                <div className='flex gap-2'>
                  <SkeletonBlock className='h-8 w-8 rounded-full' />
                  <SkeletonBlock className='h-8 w-8 rounded-full' />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === 'cards' && (
        <div className='grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {[...Array(rows)].map((_, i) => (
            <div key={i} className='p-6 border rounded-xl space-y-3 bg-white'>
              <SkeletonBlock className='h-32 w-full rounded-lg' />
              <SkeletonBlock className='h-5 w-3/4' />
              <SkeletonBlock className='h-4 w-1/2' />
            </div>
          ))}
        </div>
      )}

      {variant === 'default' && (
        <div className='border rounded-xl overflow-hidden bg-white'>
          {/* Desktop table */}
          <div className='hidden lg:block'>
            <div className='flex bg-gray-50 border-b p-4'>
              <SkeletonBlock className='h-4 w-1/6 mr-4' />
              <SkeletonBlock className='h-4 w-1/6 mr-4' />
              <SkeletonBlock className='h-4 w-1/6 mr-4' />
              <SkeletonBlock className='h-4 w-1/6 mr-4' />
              <SkeletonBlock className='h-4 w-1/6 mr-4' />
              <SkeletonBlock className='h-4 w-1/6' />
            </div>
            {[...Array(rows)].map((_, i) => (
              <div key={i} className='flex p-4 border-b last:border-b-0 items-center'>
                <div className='flex items-center w-1/6 mr-4'>
                  <SkeletonBlock className='h-10 w-10 rounded-full mr-3' />
                  <div className='space-y-2 flex-1'>
                    <SkeletonBlock className='h-4 w-full' />
                    <SkeletonBlock className='h-3 w-1/2' />
                  </div>
                </div>
                <SkeletonBlock className='h-4 w-1/6 mr-4' />
                <SkeletonBlock className='h-4 w-1/6 mr-4' />
                <SkeletonBlock className='h-6 w-1/6 mr-4 rounded-full' />
                <SkeletonBlock className='h-6 w-1/6 mr-4 rounded-full' />
                <div className='w-1/6 flex justify-center'>
                  <SkeletonBlock className='h-8 w-8 rounded-full' />
                </div>
              </div>
            ))}
          </div>
          {/* Mobile cards */}
          <div className='lg:hidden space-y-4 p-4'>
            {[...Array(3)].map((_, i) => (
              <div key={i} className='p-4 border rounded-lg space-y-4'>
                <div className='flex justify-between items-center'>
                  <SkeletonBlock className='h-6 w-8 rounded-full' />
                  <div className='flex gap-2'>
                    <SkeletonBlock className='h-6 w-16 rounded-full' />
                    <SkeletonBlock className='h-8 w-8 rounded-full' />
                  </div>
                </div>
                <div className='flex items-center gap-4'>
                  <SkeletonBlock className='h-16 w-16 rounded-full' />
                  <div className='space-y-2 flex-1'>
                    <SkeletonBlock className='h-5 w-3/4' />
                    <SkeletonBlock className='h-4 w-1/2' />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ponytail: RoleTableSkeleton / RoleDashboardSkeleton / RoleCalendarSkeleton
// are all the same: header + filters + content area. Replaced by this prop-driven skeleton.
export function RoleSkeleton({
  variant = 'table'
}: {
  variant?: 'table' | 'dashboard' | 'calendar';
}) {
  if (variant === 'calendar') {
    return (
      <div className='p-6 space-y-6'>
        <div className='flex justify-between items-center'>
          <SkeletonBlock className='h-8 w-48' />
          <div className='flex gap-2'>
            <SkeletonBlock className='h-10 w-10 rounded-md' />
            <SkeletonBlock className='h-10 w-32 rounded-md' />
            <SkeletonBlock className='h-10 w-10 rounded-md' />
          </div>
        </div>
        <div className='border rounded-lg p-4'>
          <div className='grid grid-cols-7 gap-2 mb-4'>
            {[...Array(7)].map((_, i) => <SkeletonBlock key={i} className='h-6 w-full rounded-md' />)}
          </div>
          {[...Array(5)].map((_, row) => (
            <div key={row} className='grid grid-cols-7 gap-2 mb-2'>
              {[...Array(7)].map((_, col) => (
                <SkeletonBlock key={col} className='h-20 w-full rounded-md' />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className='p-6 space-y-6'>
        <div className='space-y-4'>
          <div className='text-left space-y-2'>
            <SkeletonBlock className='h-8 w-64' />
            <SkeletonBlock className='h-4 w-48' />
          </div>
          <div className='text-center space-y-2'>
            <SkeletonBlock className='h-4 w-32 mx-auto' />
            <SkeletonBlock className='h-8 w-40 mx-auto' />
          </div>
        </div>
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {[...Array(5)].map((_, i) => (
            <div key={i} className='border-dotted border-2 border-gray-200 rounded-lg p-6 space-y-3'>
              <div className='flex items-center justify-between'>
                <SkeletonBlock className='h-8 w-8 rounded-md' />
                <SkeletonBlock className='h-8 w-12' />
              </div>
              <SkeletonBlock className='h-6 w-32' />
              <SkeletonBlock className='h-4 w-full' />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // default: table variant
  return (
    <div className='p-6 space-y-6'>
      <div className='flex justify-between items-center'>
        <div className='space-y-2'>
          <SkeletonBlock className='h-4 w-40' />
          <SkeletonBlock className='h-8 w-64' />
        </div>
        <SkeletonBlock className='h-10 w-24 rounded-full' />
      </div>

      <div className='text-center'>
        <SkeletonBlock className='h-4 w-28 mx-auto mb-2' />
        <SkeletonBlock className='h-8 w-36 mx-auto' />
      </div>

      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <SkeletonBlock className='h-10 w-32 rounded-md' />
        <div className='flex items-center gap-2'>
          <SkeletonBlock className='h-4 w-12' />
          <SkeletonBlock className='h-10 w-48 rounded-md' />
        </div>
      </div>

      <div className='border rounded-lg overflow-hidden'>
        <div className='bg-gray-50 p-4 flex gap-4'>
          <SkeletonBlock className='h-4 w-8' />
          <SkeletonBlock className='h-4 w-32' />
          <SkeletonBlock className='h-4 w-24' />
          <SkeletonBlock className='h-4 w-24' />
          <SkeletonBlock className='h-4 w-20' />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className='flex gap-4 p-4 border-t items-center'>
            <SkeletonBlock className='h-8 w-8 rounded-full' />
            <div className='space-y-1'>
              <SkeletonBlock className='h-4 w-28' />
              <SkeletonBlock className='h-3 w-20' />
            </div>
            <SkeletonBlock className='h-4 w-24' />
            <SkeletonBlock className='h-4 w-24' />
            <SkeletonBlock className='h-6 w-20 rounded-full' />
          </div>
        ))}
      </div>

      <div className='flex justify-center'>
        <SkeletonBlock className='h-10 w-64 rounded-lg' />
      </div>
    </div>
  );
}

// ─── Backward-compat aliases ───────────────────────────────────────
// ponytail: these are just aliases for existing imports. If you're
// creating a NEW loading.tsx, use ListPageSkeleton or RoleSkeleton instead.

/** @deprecated Use {@link ListPageSkeleton} or {@link RoleSkeleton} instead */
export const UsersSkeleton = ListPageSkeleton;
/** @deprecated Use {@link ListPageSkeleton} with variant='default' */
export const ClientsSkeleton = ListPageSkeleton;
/** @deprecated Use {@link ListPageSkeleton} with variant='grid' */
export const CategoriesSkeleton = () => <ListPageSkeleton variant='grid' rows={6} />;
/** @deprecated Use {@link ListPageSkeleton} with variant='cards' */
export const ProductsSkeleton = () => <ListPageSkeleton variant='cards' rows={8} />;
/** @deprecated Use {@link RoleSkeleton} instead */
export const RoleTableSkeleton = RoleSkeleton;
/** @deprecated Use {@link RoleSkeleton} with variant='dashboard' */
export const RoleDashboardSkeleton = () => <RoleSkeleton variant='dashboard' />;
/** @deprecated Use {@link RoleSkeleton} with variant='calendar' */
export const RoleCalendarSkeleton = () => <RoleSkeleton variant='calendar' />;

// ─── Restored specific aliases for backward compat ────────────────

/** @deprecated Use {@link ListPageSkeleton} instead */
export const SettingsSkeleton = () => <ListPageSkeleton />;
/** @deprecated Use {@link ListPageSkeleton} with variant='default' + custom rows */
export const RoomsSkeleton = ListPageSkeleton;
/** @deprecated Use {@link ListPageSkeleton} instead */
export const SalesSkeleton = () => (
  <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
    <div className='flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 shadow-sm'>
      <SkeletonBlock className='h-8 w-48' />
      <SkeletonBlock className='h-10 w-10 rounded-full' />
    </div>
    <SkeletonBlock className='h-16 w-full rounded-xl' />
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      {[...Array(4)].map((_, i) => <StatsCardSkeleton key={i} />)}
    </div>
    <div className='flex justify-center mb-6'>
      <SkeletonBlock className='h-12 w-64 rounded-full' />
    </div>
    <TableSkeleton rows={5} />
  </div>
);
/** @deprecated Import building blocks directly */
export const ProfileSkeleton = () => (
  <div className='flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-10 mt-4 sm:mt-6 lg:mt-10'>
    <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6'>
      <SkeletonBlock className='h-10 w-48 sm:w-64' />
      <SkeletonBlock className='h-10 w-32 rounded-full' />
    </div>
    <div className='grid gap-6 md:grid-cols-2'>
      <div className='border rounded-lg p-6 space-y-4'>
        <SkeletonBlock className='h-6 w-48' />
        <div className='flex items-center space-x-4'>
          <SkeletonBlock className='h-20 w-20 rounded-full' />
          <div className='space-y-2'>
            <SkeletonBlock className='h-5 w-40' />
            <SkeletonBlock className='h-4 w-24' />
          </div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {[...Array(6)].map((_, i) => (
            <div key={i} className='space-y-2'>
              <SkeletonBlock className='h-4 w-20' />
              <SkeletonBlock className='h-10 w-full rounded-md' />
            </div>
          ))}
        </div>
      </div>
      <div className='border rounded-lg p-6 space-y-4'>
        <SkeletonBlock className='h-6 w-40' />
        <div className='space-y-4'>
          {[...Array(4)].map((_, i) => (
            <div key={i} className='flex justify-between items-center p-3 border rounded-lg'>
              <SkeletonBlock className='h-4 w-32' />
              <SkeletonBlock className='h-4 w-24' />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
/** @deprecated Import building blocks directly */
export const ErrorLogsSkeleton = () => (
  <div className='p-8 space-y-4'>
    <div className='flex justify-between items-center mb-4'>
      <SkeletonBlock className='h-8 w-56' />
      <SkeletonBlock className='h-10 w-24 rounded-md' />
    </div>
    {[...Array(5)].map((_, i) => (
      <div key={i} className='border rounded-lg p-4 space-y-3'>
        <div className='flex justify-between items-start'>
          <SkeletonBlock className='h-5 w-48' />
          <SkeletonBlock className='h-4 w-32' />
        </div>
        <SkeletonBlock className='h-4 w-16' />
        <SkeletonBlock className='h-16 w-full rounded-md' />
      </div>
    ))}
  </div>
);
/** @deprecated Import building blocks directly */
export const NotificationsSkeleton = () => (
  <div className='p-6 space-y-6'>
    <div className='flex justify-between items-center'>
      <div className='space-y-2'>
        <SkeletonBlock className='h-8 w-48' />
        <SkeletonBlock className='h-4 w-72' />
      </div>
      <div className='flex gap-2'>
        <SkeletonBlock className='h-10 w-48 rounded-md' />
        <SkeletonBlock className='h-10 w-32 rounded-md' />
      </div>
    </div>
    <SkeletonBlock className='h-10 w-full max-w-2xl rounded-lg' />
    <div className='space-y-3'>
      {[...Array(5)].map((_, i) => (
        <div key={i} className='border rounded-lg p-4'>
          <div className='flex items-start gap-4'>
            <SkeletonBlock className='h-8 w-8 rounded-full' />
            <div className='flex-1 space-y-2'>
              <SkeletonBlock className='h-4 w-1/3' />
              <SkeletonBlock className='h-3 w-3/4' />
              <SkeletonBlock className='h-3 w-24' />
            </div>
            <div className='flex gap-1'>
              <SkeletonBlock className='h-8 w-8 rounded-md' />
              <SkeletonBlock className='h-8 w-8 rounded-md' />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ponytail: these are the original names kept for backward compat.
// They all delegate to the generic ListPageSkeleton / RoleSkeleton.
// Delete when all loading.tsx files have been updated.

// ─── Private helpers ──────────────────────────────────────────────

function SkeletonBlock({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-gray-700', className)}
      {...props}
    />
  );
}
