import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Redirección - Las Muñecas de Ramón',
  robots: { index: false, follow: false }
};

export default function HomePage(): never {
  redirect('/login');
}
