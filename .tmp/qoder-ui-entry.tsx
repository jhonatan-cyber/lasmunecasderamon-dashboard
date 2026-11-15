'use client';

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { SettingsBottleHostessCard } from '@/components/settings/SettingsBottleHostessCard';
import { EntregaCoversDialog, type GrupoCover } from '@/components/bar/EntregaCoversDialog';

// Temporary component harness, not a Next route or product source.
// All displayed records are fixtures; domain components, forms and providers are real.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false }
  }
});

const grupoFixture: GrupoCover = {
  id: 'qoder-ui-grupo-1',
  cliente: 'Fixture temporal (sin DB)',
  filas: [{ id: 'qoder-ui-entrada-1', monto_entrada: 10000, hora: '20:00' }],
  cantidad: 1,
  total: 10000,
  montoUnitario: 10000,
  metodo: 'efectivo',
  hora: '20:00',
  registradoPor: 'Harness temporal'
};

function Harness() {
  const view = new URLSearchParams(window.location.search).get('view');
  const [grupo, setGrupo] = useState<GrupoCover | null>(null);
  const [entregas, setEntregas] = useState(0);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <main className='mx-auto max-w-5xl space-y-4 p-4 sm:p-6'>
          <p className='text-sm text-muted-foreground'>
            Harness temporal de componentes. Datos ficticios en memoria; sin sesión ni DB.
          </p>
          {view === 'covers' ? (
            <>
              <Button type='button' onClick={() => setGrupo(grupoFixture)}>
                Abrir covers de prueba
              </Button>
              <p role='status' aria-label='Entregas del harness'>
                Entregas completadas: {entregas}
              </p>
              <EntregaCoversDialog
                grupo={grupo}
                tope={10000}
                onClose={() => setGrupo(null)}
                onEntregado={() => setEntregas(previous => previous + 1)}
              />
            </>
          ) : (
            <SettingsBottleHostessCard />
          )}
        </main>
        <Toaster richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

const container = document.getElementById('qoder-ui-root');
if (!container) throw new Error('Missing temporary harness root');
createRoot(container).render(<Harness />);
