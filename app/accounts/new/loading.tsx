import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className='p-10 space-y-6 mt-10'>
      {}
      <div className='flex justify-between items-center'>
        <div className='flex items-center gap-4'>
          <Skeleton className='h-8 w-20' />
          <div>
            <Skeleton className='h-8 w-48 mb-2' />
            <Skeleton className='h-4 w-64' />
          </div>
        </div>
      </div>

      {}
      <Card>
        <CardHeader>
          <Skeleton className='h-6 w-48' />
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div>
              <Skeleton className='h-4 w-16 mb-2' />
              <Skeleton className='h-10 w-full' />
            </div>
            <div>
              <Skeleton className='h-4 w-16 mb-2' />
              <Skeleton className='h-10 w-full' />
            </div>
            <div>
              <Skeleton className='h-4 w-16 mb-2' />
              <Skeleton className='h-10 w-full' />
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <Card>
        <CardHeader>
          <div className='flex justify-between items-center'>
            <Skeleton className='h-6 w-48' />
            <Skeleton className='h-8 w-32' />
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {[1, 2].map(i => (
              <div
                key={i}
                className='grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border border-gray-200 rounded-lg'
              >
                <div>
                  <Skeleton className='h-3 w-16 mb-2' />
                  <Skeleton className='h-8 w-full' />
                </div>
                <div>
                  <Skeleton className='h-3 w-12 mb-2' />
                  <Skeleton className='h-8 w-full' />
                </div>
                <div>
                  <Skeleton className='h-3 w-16 mb-2' />
                  <Skeleton className='h-8 w-full' />
                </div>
                <div>
                  <Skeleton className='h-3 w-16 mb-2' />
                  <Skeleton className='h-8 w-full' />
                </div>
                <div className='flex items-end'>
                  <Skeleton className='h-8 w-20' />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {}
      <Card>
        <CardHeader>
          <Skeleton className='h-6 w-48' />
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-center'>
            <div className='p-4 bg-blue-50 rounded-lg'>
              <Skeleton className='h-4 w-20 mx-auto mb-2' />
              <Skeleton className='h-6 w-24 mx-auto' />
            </div>
            <div className='p-4 bg-orange-50 rounded-lg'>
              <Skeleton className='h-4 w-24 mx-auto mb-2' />
              <Skeleton className='h-6 w-24 mx-auto' />
            </div>
            <div className='p-4 bg-green-50 rounded-lg'>
              <Skeleton className='h-4 w-20 mx-auto mb-2' />
              <Skeleton className='h-6 w-24 mx-auto' />
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <div className='flex justify-center gap-4'>
        <Skeleton className='h-12 w-32' />
        <Skeleton className='h-12 w-40' />
      </div>
    </div>
  );
}
