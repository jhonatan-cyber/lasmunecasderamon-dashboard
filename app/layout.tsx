import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import LayoutContent from '@/components/LayoutContent';
import { AnulacionProvider } from '@/contexts/AnulacionContext';
import { TimerProvider } from '@/contexts/TimerContext';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { TimerDisplay } from '@/components/dashboard/TimerDisplay';
import { NotificationProvider, NotificationStatus } from '@/components/notifications';
import AnulacionNotificationModal from '@/components/AnulacionNotificationModal';

import 'sweetalert2/dist/sweetalert2.min.css';
import './globals.css';
import '@/styles/sidebar.css';



export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Panel de administración del club'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='es'>
      <head>
        <script src='https://cdn.jsdelivr.net/npm/sweetalert2@11'></script>
      </head>
      <body className='font-sans antialiased'>
        <QueryProvider>
          <AnulacionProvider>
            <TimerProvider>
              <NotificationProvider>
                <LayoutContent>{children}</LayoutContent>
                <div className='fixed bottom-4 left-4 z-50'>
                  <NotificationStatus />
                </div>
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
      </body>
    </html>
  );
}
