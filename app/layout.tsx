import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import LayoutContent from '@/components/LayoutContent';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import { siteConfig } from '@/lib/api/site';

import './globals.css';
import '@/styles/sidebar.css';
import '@/styles/notifications.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.adminDescription,
  manifest: '/manifest.json',
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.legalName }],
  alternates: {
    canonical: '/'
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/img/system/logo1.png'
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.legalName,
    locale: siteConfig.locale,
    type: 'website',
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage]
  },
  robots: {
    index: true,
    follow: true
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: siteConfig.name
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0b0b0f'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='es' suppressHydrationWarning data-scroll-behavior="smooth">
      <body className='font-sans antialiased'>
        <ErrorBoundary>
          <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
            <LayoutContent>{children}</LayoutContent>
            <Toaster
              richColors
              position='top-right'
              expand={true}
              closeButton={true}
              duration={4000}
            />
            <ServiceWorkerRegistration />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
