'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { syncOfflineRequests, getQueuedRequests } from '@/lib/utils/offlineStore';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface SyncContextType {
  isOnline: boolean;
  pendingCount: number;
}

const SyncContext = createContext<SyncContextType>({ isOnline: true, pendingCount: 0 });

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('ConexiÃ³n restaurada. Sincronizando datos...');
      syncOfflineRequests();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Sin conexiÃ³n. Las acciones se guardarÃ¡n localmente.');
    };

    const updatePendingCount = () => {
      setPendingCount(getQueuedRequests().length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-updated', updatePendingCount);

    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-updated', updatePendingCount);
    };
  }, []);

  return (
    <SyncContext.Provider value={{ isOnline, pendingCount }}>
      {children}

      {/* Sync Status Overlay */}
      {mounted && (!isOnline || pendingCount > 0) && (
        <div className='fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2'>
          {!isOnline && (
            <div className='bg-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce'>
              <WifiOff className='w-4 h-4' />
              <span className='text-sm font-bold'>Modo Offline</span>
            </div>
          )}
          {pendingCount > 0 && isOnline && (
            <div className='bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2'>
              <RefreshCw className='w-4 h-4 animate-spin' />
              <span className='text-sm font-bold text-white'>Sincronizando {pendingCount}...</span>
            </div>
          )}
          {pendingCount > 0 && !isOnline && (
            <div className='bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2'>
              <RefreshCw className='w-4 h-4' />
              <span className='text-sm font-bold text-white'>{pendingCount} pendientes</span>
            </div>
          )}
        </div>
      )}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
