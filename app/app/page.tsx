import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Abrir en la app - Las Muñecas de Ramón',
  robots: { index: false, follow: false }
};

export default function AppDeepLinkPage(): never {
  redirect('/');
}
