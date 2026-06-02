import { redirect } from 'next/navigation';

/**
 * Dashboard root. The public marketing site lives in the Astro project
 * (lasmunecasderamon-web). Anyone landing here without an active session
 * gets sent to the auth flow.
 */
export default function HomePage(): never {
  redirect('/login');
}
