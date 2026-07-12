import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Redirección - Las Muñecas de Ramón'
};

export default function HomePage(): never {
  redirect('/login');
}
