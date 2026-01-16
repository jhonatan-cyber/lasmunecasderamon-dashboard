import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import LayoutContent from '@/components/LayoutContent';
import { AnulacionProvider } from '@/contexts/AnulacionContext';
import { TimerProvider } from '@/contexts/TimerContext';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { NotificationProvider, NotificationStatus, ClientOnly } from '@/components/notifications';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import AnulacionNotificationModal from '@/components/AnulacionNotificationModal';

import './globals.css';
import '@/styles/sidebar.css';



export const metadata: Metadata = {
  title: 'Las Muñecas de Ramón',
  description: 'Panel de administración del club'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='es' suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.css"
        />
      </head>
      <body className='font-sans antialiased'>
        <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
          <QueryProvider>
            <AnulacionProvider>
              <TimerProvider>
                <NotificationProvider>
                  <LayoutContent>{children}</LayoutContent>
                  {/* Notification Status oculto */}
                  {/* <div className='fixed bottom-4 left-4 z-50'>
                    <ClientOnly>
                      <NotificationStatus />
                    </ClientOnly>
                  </div> */}
                  <Toaster
                    richColors
                    position='top-right'
                    expand={true}
                    closeButton={true}
                    duration={4000}
                  />
                  <AnulacionNotificationModal />
                </NotificationProvider>
              </TimerProvider>
            </AnulacionProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
