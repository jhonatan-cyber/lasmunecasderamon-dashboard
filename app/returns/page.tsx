'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Settings } from 'lucide-react';
import Link from 'next/link';
import { BackgroundGradient } from '@/components/shared/background-gradient';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

export default function ReturnsPage() {
  return (
    <PermissionGuard module='returns' action='view'>
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='mb-6 sm:mb-8'>
          <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-neutral-100 mb-2'>
            Devoluciones
          </h1>
          <p className='text-sm sm:text-base text-gray-600 dark:text-neutral-400'>
            Gestiona las devoluciones de ventas y servicios de tu negocio
          </p>
        </div>

        <div className='flex justify-center'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 max-w-7xl'>
            {}
            <div className='space-y-10 lg:space-y-16'>
              <Link href='/returns/sales' className='block mb-8 lg:mb-16'>
                <BackgroundGradient className='bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800'>
                  <Card className='hover:shadow-lg transition-shadow duration-300 cursor-pointer hover:scale-105 transition-transform duration-200 bg-transparent border-0'>
                    <CardHeader className='p-6 lg:p-8'>
                      <div className='flex items-center gap-4'>
                        <div className='p-3 lg:p-4 bg-blue-100 dark:bg-blue-950/40 rounded-xl'>
                          <ShoppingCart className='h-6 w-6 lg:h-8 lg:w-8 text-blue-600 dark:text-blue-300' />
                        </div>
                        <div>
                          <CardTitle className='text-xl lg:text-2xl text-black dark:text-neutral-100'>
                            Devoluciones de Ventas
                          </CardTitle>
                          <CardDescription className='text-sm lg:text-base mt-1'>
                            Gestiona las devoluciones de productos y servicios vendidos
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className='px-6 lg:px-8 pb-6 lg:pb-8'>
                      <p className='text-sm lg:text-base text-gray-600 dark:text-neutral-400 leading-relaxed'>
                        Lista todas las ventas anuladas con filtros avanzados y permite ver detalles
                        completos de cada transacción para análisis.
                      </p>
                    </CardContent>
                  </Card>
                </BackgroundGradient>
              </Link>

              {}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6'>
                <Card className='bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900'>
                  <CardContent className='p-4 lg:p-5'>
                    <div className='flex items-center gap-2 mb-2'>
                      <div className='w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full'></div>
                      <h4 className='font-medium text-blue-900 dark:text-blue-200 text-sm lg:text-base'>
                        Listar Ventas Anuladas
                      </h4>
                    </div>
                    <p className='text-xs lg:text-sm text-blue-700 dark:text-blue-300 leading-relaxed'>
                      Muestra todas las ventas con estado anulado en una tabla organizada
                    </p>
                  </CardContent>
                </Card>

                <Card className='bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900'>
                  <CardContent className='p-4 lg:p-5'>
                    <div className='flex items-center gap-2 mb-2'>
                      <div className='w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full'></div>
                      <h4 className='font-medium text-blue-900 dark:text-blue-200 text-sm lg:text-base'>
                        Ver Detalles de Ventas
                      </h4>
                    </div>
                    <p className='text-xs lg:text-sm text-blue-700 dark:text-blue-300 leading-relaxed'>
                      Modal con información completa de productos, totales y detalles
                    </p>
                  </CardContent>
                </Card>

                <Card className='bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900'>
                  <CardContent className='p-4 lg:p-5'>
                    <div className='flex items-center gap-2 mb-2'>
                      <div className='w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full'></div>
                      <h4 className='font-medium text-blue-900 dark:text-blue-200 text-sm lg:text-base'>
                        Filtros y Búsqueda
                      </h4>
                    </div>
                    <p className='text-xs lg:text-sm text-blue-700 dark:text-blue-300 leading-relaxed'>
                      Búsqueda por código, cliente, habitación y filtro por método de pago
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {}
            <div className='space-y-10 lg:space-y-16'>
              <Link href='/returns/services' className='block mb-8 lg:mb-16'>
                <BackgroundGradient className='bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800'>
                  <Card className='hover:shadow-lg transition-shadow duration-300 cursor-pointer hover:scale-105 transition-transform duration-200 bg-transparent border-0'>
                    <CardHeader className='p-6 lg:p-8'>
                      <div className='flex items-center gap-4'>
                        <div className='p-3 lg:p-4 bg-green-100 dark:bg-green-950/40 rounded-xl'>
                          <Settings className='h-6 w-6 lg:h-8 lg:w-8 text-green-600 dark:text-green-300' />
                        </div>
                        <div>
                          <CardTitle className='text-xl lg:text-2xl text-black dark:text-neutral-100'>
                            Devoluciones de Servicios
                          </CardTitle>
                          <CardDescription className='text-sm lg:text-base mt-1'>
                            Maneja las devoluciones de servicios prestados
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className='px-6 lg:px-8 pb-6 lg:pb-8'>
                      <p className='text-sm lg:text-base text-gray-600 dark:text-neutral-400 leading-relaxed'>
                        Lista los servicios activos con filtros y permite ver detalles completos de
                        cada servicio para análisis y procesamiento de devoluciones.
                      </p>
                    </CardContent>
                  </Card>
                </BackgroundGradient>
              </Link>

              {}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6'>
                <Card className='bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900'>
                  <CardContent className='p-4 lg:p-5'>
                    <div className='flex items-center gap-2 mb-2'>
                      <div className='w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full'></div>
                      <h4 className='font-medium text-green-900 dark:text-green-200 text-sm lg:text-base'>
                        Servicios Activos
                      </h4>
                    </div>
                    <p className='text-xs lg:text-sm text-green-700 dark:text-green-300 leading-relaxed'>
                      Muestra todos los servicios activos en una tabla organizada
                    </p>
                  </CardContent>
                </Card>

                <Card className='bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900'>
                  <CardContent className='p-4 lg:p-5'>
                    <div className='flex items-center gap-2 mb-2'>
                      <div className='w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full'></div>
                      <h4 className='font-medium text-green-900 dark:text-green-200 text-sm lg:text-base'>
                        Reembolsos de servicios
                      </h4>
                    </div>
                    <p className='text-xs lg:text-sm text-green-700 dark:text-green-300 leading-relaxed'>
                      Modal para procesar reembolsos de los servicios cancelados
                    </p>
                  </CardContent>
                </Card>

                <Card className='bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900'>
                  <CardContent className='p-4 lg:p-5'>
                    <div className='flex items-center gap-2 mb-2'>
                      <div className='w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full'></div>
                      <h4 className='font-medium text-green-900 dark:text-green-200 text-sm lg:text-base'>
                        Gestión de Servicios
                      </h4>
                    </div>
                    <p className='text-xs lg:text-sm text-green-700 dark:text-green-300 leading-relaxed'>
                      Modal con información completa de servicios y detalles
                    </p>
                  </CardContent>
                </Card>

                <Card className='bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900'>
                  <CardContent className='p-4 lg:p-5'>
                    <div className='flex items-center gap-2 mb-2'>
                      <div className='w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full'></div>
                      <h4 className='font-medium text-green-900 dark:text-green-200 text-sm lg:text-base'>
                        Reportes de Devoluciones
                      </h4>
                    </div>
                    <p className='text-xs lg:text-sm text-green-700 dark:text-green-300 leading-relaxed'>
                      Filtros por tipo de servicio, fecha y estado de devolución
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
