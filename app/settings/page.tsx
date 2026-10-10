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
  type LucideIcon
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
import { usePersistentTab } from '@/hooks/shared/usePersistentTab';

/**
 * Las pestañas de Configuraciones, en una sola lista: la dibujan los triggers y también
 * define qué valores guardados vale la pena restaurar (un tab que se borre deja de estar
 * en la lista y la página vuelve al primero en vez de quedar en blanco).
 */
const TABS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'empresa', label: 'Empresa', icon: Building2 },
  { value: 'facturacion', label: 'Facturación', icon: SettingsIcon },
  { value: 'permisos', label: 'Permisos', icon: Key },
  { value: 'bar', label: 'Bar y comisiones', icon: GlassWater },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'mantenimiento', label: 'Mantenimiento', icon: Database },
  { value: 'logs', label: 'Logs', icon: ShieldAlert },
  { value: 'asistencia', label: 'Asistencia', icon: Clock }
];

// Referencias estables: si cambiaran en cada render, el efecto que restaura el tab se
// volvería a ejecutar siempre.
// Conserva la selección anterior de Comisiones y la muestra en la pestaña unificada.
const VALORES_TAB = [...TABS.map(tab => tab.value), 'comisiones'];
const CLAVE_TAB = 'settings_tab';

export default function Settings() {
  // Al recargar se reabre en el tab que quedó abierto, no en Empresa.
  const [tab, setTab] = usePersistentTab(CLAVE_TAB, VALORES_TAB, 'empresa');

  return (
    <div className='w-full max-w-none p-4 sm:p-6 lg:p-8'>
      <Tabs
        value={tab === 'comisiones' ? 'bar' : tab}
        onValueChange={setTab}
        className='w-full space-y-6'
      >
        <TabsList className='@container flex w-full flex-nowrap justify-start gap-1 sm:gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'>
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className='flex shrink-0 items-center gap-2 rounded-full px-2.5 sm:px-3'
            >
              <Icon className='h-4 w-4 hidden @min-[1100px]:block' />
              {label}
            </TabsTrigger>
          ))}
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

        <TabsContent value='bar' className='space-y-6'>
          <SettingsBarTab />
          <SettingsBottleHostessCard />
          <SettingsServiceLevelsCard />
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
