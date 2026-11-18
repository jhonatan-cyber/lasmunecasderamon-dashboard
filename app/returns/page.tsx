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
      <div className='p-4 sm:p-6 lg:p-8 space-y-6'>
        <div>
          <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-neutral-100 mb-2'>
            Devoluciones
          </h1>
          <p className='text-sm sm:text-base text-gray-600 dark:text-neutral-400'>
            Gestiona las devoluciones de ventas y servicios de tu negocio
          </p>
        </div>

        <div className='flex justify-center'>
          <div className='grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-2'>
            {}
            <div className='space-y-6'>
              <Link href='/returns/sales' className='block'>
                <BackgroundGradient className='bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800'>
                  <Card className='hover:shadow-lg transition-shadow duration-300 cursor-pointer hover:scale-105 transition-transform duration-200 bg-transparent border border-neutral-200 dark:border-neutral-800'>
                    <CardHeader className='p-4 sm:p-6'>
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
                    <CardContent className='p-4 sm:p-6'>
                      <p className='text-sm lg:text-base text-gray-600 dark:text-neutral-400 leading-relaxed'>
                        Lista todas las ventas anuladas con filtros avanzados y permite ver detalles
                        completos de cada transacción para análisis.
                      </p>
                    </CardContent>
                  </Card>
                </BackgroundGradient>
              </Link>

              {}
            </div>

            {}
            <div className='space-y-6'>
              <Link href='/returns/services' className='block'>
                <BackgroundGradient className='bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800'>
                  <Card className='hover:shadow-lg transition-shadow duration-300 cursor-pointer hover:scale-105 transition-transform duration-200 bg-transparent border border-neutral-200 dark:border-neutral-800'>
                    <CardHeader className='p-4 sm:p-6'>
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
                    <CardContent className='p-4 sm:p-6'>
                      <p className='text-sm lg:text-base text-gray-600 dark:text-neutral-400 leading-relaxed'>
                        Lista los servicios activos con filtros y permite ver detalles completos de
                        cada servicio para análisis y procesamiento de devoluciones.
                      </p>
                    </CardContent>
                  </Card>
                </BackgroundGradient>
              </Link>

              {}
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
