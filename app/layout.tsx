import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import LayoutContent from '@/components/LayoutContent';
import { AuthProvider } from '@/contexts/AuthContext';
import { AnulacionProvider } from '@/contexts/AnulacionContext';
import { TimerProvider } from '@/contexts/TimerContext';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { NotificationProvider } from '@/components/notifications';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ServicioAnfitrionasProvider } from '@/contexts/ServicioAnfitrionasContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import AnulacionNotificationModal from '@/components/AnulacionNotificationModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { FetchInterceptorInit } from '@/components/FetchInterceptorInit';
import { PermissionsSSEListener } from '@/components/PermissionsSSEListener';

import './globals.css';
import '@/styles/sidebar.css';
import '@/styles/notifications.css';

// Optimización de fuentes con next/font
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  fallback: ['system-ui', 'arial'],
});



export const metadata: Metadata = {
  title: 'Las Muñecas de Ramón',
  description: 'Panel de administración del club',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Admin Dashboard',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='es' suppressHydrationWarning className={inter.variable}>
      <body className='font-sans antialiased'>
        <ErrorBoundary>
          <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
            <FetchInterceptorInit />
            <AuthProvider>
              <PermissionsSSEListener />
              <QueryProvider>
                <AnulacionProvider>
                  <TimerProvider>
                    <ServicioAnfitrionasProvider>
                      <NotificationsProvider>
                        <NotificationProvider>
                          <LayoutContent>{children}</LayoutContent>
                          <Toaster
                            richColors
                            position='top-right'
                            expand={true}
                            closeButton={true}
                            duration={4000}
                          />
                          <AnulacionNotificationModal />
                          <ServiceWorkerRegistration />
                        </NotificationProvider>
                      </NotificationsProvider>
                    </ServicioAnfitrionasProvider>
                  </TimerProvider>
                </AnulacionProvider>
              </QueryProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
