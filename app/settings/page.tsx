'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Database,
  GlassWater,
  Key,
  MessageCircle,
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
import { BiometricDevices } from '@/components/settings/BiometricDevices';
import { BiometricStatus } from '@/components/settings/BiometricStatus';
import { SettingsBottleHostessCard } from '@/components/settings/SettingsBottleHostessCard';
import { SettingsServiceLevelsCard } from '@/components/settings/SettingsServiceLevelsCard';
import { SettingsBarTab } from '@/components/settings/SettingsBarTab';
import { SettingsWhatsAppTab } from '@/components/settings/SettingsWhatsAppTab';

export default function Settings() {
  return (
    <div className='w-full max-w-none p-4 sm:p-6 lg:p-8'>
      <Tabs defaultValue='empresa' className='w-full space-y-6'>
        <TabsList className='@container flex w-full flex-nowrap justify-start gap-1 sm:gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'>
          <TabsTrigger
            value='empresa'
            className='flex shrink-0 items-center gap-2 rounded-full px-2.5 sm:px-3'
          >
            <Building2 className='h-4 w-4 hidden @min-[1100px]:block' />
            Empresa
          </TabsTrigger>
          <TabsTrigger
            value='facturacion'
            className='flex shrink-0 items-center gap-2 rounded-full px-2.5 sm:px-3'
          >
            <SettingsIcon className='h-4 w-4 hidden @min-[1100px]:block' />
            Facturación
          </TabsTrigger>
          <TabsTrigger
            value='permisos'
            className='flex shrink-0 items-center gap-2 rounded-full px-2.5 sm:px-3'
          >
            <Key className='h-4 w-4 hidden @min-[1100px]:block' />
            Permisos
          </TabsTrigger>
          <TabsTrigger
            value='comisiones'
            className='flex shrink-0 items-center gap-2 rounded-full px-2.5 sm:px-3'
          >
            <Users className='h-4 w-4 hidden @min-[1100px]:block' />
            Comisiones
          </TabsTrigger>
          <TabsTrigger
            value='bar'
            className='flex shrink-0 items-center gap-2 rounded-full px-2.5 sm:px-3'
          >
            <GlassWater className='h-4 w-4 hidden @min-[1100px]:block' />
            Bar
          </TabsTrigger>
          <TabsTrigger
            value='whatsapp'
            className='flex shrink-0 items-center gap-2 rounded-full px-2.5 sm:px-3'
          >
            <MessageCircle className='h-4 w-4 hidden @min-[1100px]:block' />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger
            value='mantenimiento'
            className='flex shrink-0 items-center gap-2 rounded-full px-2.5 sm:px-3'
          >
            <Database className='h-4 w-4 hidden @min-[1100px]:block' />
            Mantenimiento
          </TabsTrigger>
          <TabsTrigger
            value='logs'
            className='flex shrink-0 items-center gap-2 rounded-full px-2.5 sm:px-3'
          >
            <ShieldAlert className='h-4 w-4 hidden @min-[1100px]:block' />
            Logs
          </TabsTrigger>
          <TabsTrigger
            value='asistencia'
            className='flex shrink-0 items-center gap-2 rounded-full px-2.5 sm:px-3'
          >
            <Clock className='h-4 w-4 hidden @min-[1100px]:block' />
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
          <SettingsBottleHostessCard />
        </TabsContent>
        <TabsContent value='bar'>
          <SettingsBarTab />
        </TabsContent>

        <TabsContent value='whatsapp'>
          <SettingsWhatsAppTab />
        </TabsContent>

        <TabsContent value='mantenimiento'>
          <SettingsMaintenanceTab />
        </TabsContent>

        <TabsContent value='logs'>
          <SettingsLogsTab />
        </TabsContent>

        <TabsContent value='asistencia' className='flex flex-col gap-6'>
          <SettingsAttendanceTab />
          <BiometricStatus />
          <BiometricDevices />
          <KioskDevices />
        </TabsContent>
      </Tabs>
    </div>
  );
}
