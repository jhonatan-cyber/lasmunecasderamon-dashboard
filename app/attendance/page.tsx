'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import useAsistencias from '@/hooks/useAsistencias'
import AttendanceTable from '@/components/attendance/AttendanceTable'

export default function AttendancePage() {
  const { data, loading, error } = useAsistencias()



  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-10 mt-4 sm:mt-6 lg:mt-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Asistencias</h1>
      </div>

      {error ? (
        <Card className='shadow-sm'>
          <CardHeader className='pb-4'>
            <CardTitle className='text-lg sm:text-xl'>Error</CardTitle>
            <CardDescription className='text-sm sm:text-base'>
              Ocurrió un error al cargar los datos
            </CardDescription>
          </CardHeader>
          <CardContent className='p-4 sm:p-6'>
            <p className="text-sm sm:text-base text-red-500">{error}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className='shadow-sm'>
            <CardHeader className='pb-4'>
              <CardTitle className='text-lg sm:text-xl'>Listado de Asistencias</CardTitle>
            </CardHeader>
            <CardContent className='p-4 sm:p-6'>
              <div className="overflow-x-auto">
                <AttendanceTable />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}