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
  UserCheck,
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
import { SettingsTestPresenceTab } from '@/components/settings/SettingsTestPresenceTab';
import { usePersistentTab } from '@/hooks/shared/usePersistentTab';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo, useRef, useCallback, useEffect } from 'react';

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
  { value: 'asistencia', label: 'Asistencia', icon: Clock },
  { value: 'pruebas', label: 'Pruebas', icon: UserCheck }
];

// Conserva la selección anterior de Comisiones y la muestra en la pestaña unificada.
const CLAVE_TAB = 'settings_tab';

export default function Settings() {
  // La pestaña de WhatsApp —y sus credenciales por administrador— es sólo para el rol
  // administrador: a los demás no se les muestra ni el trigger ni el contenido.
  const { user } = useAuth();
  const esAdmin = user?.role?.toLowerCase() === 'administrador';

  // Referencias estables: si cambiaran en cada render, el efecto que restaura el tab se
  // volvería a ejecutar siempre.
  const tabs = useMemo(
    () => (esAdmin ? TABS : TABS.filter(tab => tab.value !== 'whatsapp')),
    [esAdmin]
  );
  const valoresTab = useMemo(() => [...tabs.map(tab => tab.value), 'comisiones'], [tabs]);

  // Al recargar se reabre en el tab que quedó abierto, no en Empresa.
  const [tab, setTab] = usePersistentTab(CLAVE_TAB, valoresTab, 'empresa');

  // Auto-scroll: cuando cambia el tab, el trigger activo se centra en la barra
  // para que no quede oculto por el desbordamiento horizontal.
  const listRef = useRef<HTMLDivElement>(null);
  const activeTriggerRef = useRef<HTMLButtonElement>(null);
  const handleTabChange = useCallback((value: string) => setTab(value), [setTab]);

  // Marca la referencia del trigger activo para el auto-scroll.
  const setActiveRef = useCallback((el: HTMLButtonElement | null) => {
    activeTriggerRef.current = el;
  }, []);

  const currentTab = tab === 'comisiones' ? 'bar' : tab;
  useEffect(() => {
    const trigger = activeTriggerRef.current;
    const list = listRef.current;
    if (!trigger || !list) return;

    const listRect = list.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const padding = 4;
    const hiddenLeft = listRect.left + padding - triggerRect.left;
    const hiddenRight = triggerRect.right - (listRect.right - padding);
    const offset = hiddenLeft > 0 ? -hiddenLeft : hiddenRight > 0 ? hiddenRight : 0;

    if (offset) list.scrollBy({ left: offset, behavior: 'smooth' });
  }, [currentTab]);

  return (
    <div className='w-full max-w-none p-4 sm:p-6 lg:p-8'>
      <Tabs value={currentTab} onValueChange={handleTabChange} className='w-full space-y-6'>
        <div className='flex items-center gap-3'>
          <h1 className='text-xl font-bold text-neutral-900 sm:text-2xl lg:text-3xl dark:text-white truncate'>
            Configuraciones
          </h1>
        </div>

        <div className='relative'>
          <TabsList
            ref={listRef}
            className='@container flex h-11 w-full flex-nowrap justify-start gap-1.5 rounded-none bg-transparent p-0 sm:gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth'
          >
            {tabs.map(({ value, label, icon: Icon }) => {
              const isActive = currentTab === value;
              return (
                <TabsTrigger
                  key={value}
                  value={value}
                  ref={isActive ? setActiveRef : undefined}
                  className='group flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 transition-all duration-200 ease-out hover:bg-gray-50 hover:text-gray-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 data-[state=active]:!border-black data-[state=active]:!bg-black data-[state=active]:!text-white dark:data-[state=active]:!border-white dark:data-[state=active]:!bg-white dark:data-[state=active]:!text-black'
                >
                  <Icon
                    className={`h-4 w-4 transition-all duration-200 ${
                      isActive
                        ? 'block scale-100 opacity-100'
                        : 'hidden @min-[1100px]:block scale-95 opacity-70 group-hover:scale-100 group-hover:opacity-100'
                    }`}
                  />
                  <span className='font-medium'>{label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <div className='animate-in fade-in duration-200' key={currentTab}>
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

          {esAdmin && (
            <TabsContent value='whatsapp'>
              <SettingsWhatsAppTab />
            </TabsContent>
          )}

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

          <TabsContent value='pruebas'>
            <SettingsTestPresenceTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
