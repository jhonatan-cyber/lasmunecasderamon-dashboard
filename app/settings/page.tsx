'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Database,
  Key,
  Settings as SettingsIcon,
  ShieldAlert,
  Clock,
  Users
} from 'lucide-react';
import { SettingsCompanyTab } from '@/components/settings/SettingsCompanyTab';
import { SettingsBillingTab } from '@/components/settings/SettingsBillingTab';
import { SettingsPermissionsTab } from '@/components/settings/SettingsPermissionsTab';
import { SettingsMaintenanceTab } from '@/components/settings/SettingsMaintenanceTab';
import { SettingsLogsTab } from '@/components/settings/SettingsLogsTab';
import { SettingsAttendanceTab } from '@/components/settings/SettingsAttendanceTab';
import { KioskDevices } from '@/components/settings/KioskDevices';
import { SettingsChampagneCard } from '@/components/settings/SettingsChampagneCard';
import { SettingsServiceLevelsCard } from '@/components/settings/SettingsServiceLevelsCard';

export default function Settings() {
  return (
    <div className='w-full max-w-none p-4 sm:p-6 lg:p-8'>
      <Tabs defaultValue='empresa' className='w-full space-y-6'>
        <TabsList className='flex w-full flex-wrap justify-start gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-full'>
          <TabsTrigger value='empresa' className='flex items-center gap-2 rounded-full'>
            <Building2 className='h-4 w-4' />
            Empresa
          </TabsTrigger>
          <TabsTrigger value='facturacion' className='flex items-center gap-2 rounded-full'>
            <SettingsIcon className='h-4 w-4' />
            Facturación
          </TabsTrigger>
          <TabsTrigger value='permisos' className='flex items-center gap-2 rounded-full'>
            <Key className='h-4 w-4' />
            Permisos
          </TabsTrigger>
          <TabsTrigger value='comisiones' className='flex items-center gap-2 rounded-full'>
            <Users className='h-4 w-4' />
            Comisiones
          </TabsTrigger>
          <TabsTrigger value='mantenimiento' className='flex items-center gap-2 rounded-full'>
            <Database className='h-4 w-4' />
            Mantenimiento
          </TabsTrigger>
          <TabsTrigger value='logs' className='flex items-center gap-2 rounded-full'>
            <ShieldAlert className='h-4 w-4' />
            Logs
          </TabsTrigger>
          <TabsTrigger value='asistencia' className='flex items-center gap-2 rounded-full'>
            <Clock className='h-4 w-4' />
            Asistencia
          </TabsTrigger>
        </TabsList>

        <TabsContent value='empresa'>
          <SettingsCompanyTab />
        </TabsContent>

        <TabsContent value='facturacion'>
          <SettingsBillingTab />
        </TabsContent>

        <TabsContent value='permisos'>
          <SettingsPermissionsTab />
        </TabsContent>

        <TabsContent value='comisiones' className='space-y-6'>
          <SettingsServiceLevelsCard />
          <SettingsChampagneCard />
        </TabsContent>

        <TabsContent value='mantenimiento'>
          <SettingsMaintenanceTab />
        </TabsContent>

        <TabsContent value='logs'>
          <SettingsLogsTab />
        </TabsContent>

        <TabsContent value='asistencia' className='flex flex-col gap-6'>
          <SettingsAttendanceTab />
          <KioskDevices />
        </TabsContent>
      </Tabs>
    </div>
  );
}
