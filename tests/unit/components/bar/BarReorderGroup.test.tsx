import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BarReorderGroup } from '@/components/bar/BarReorderGroup';

const captured = vi.hoisted(() => ({ modifiers: 'sin capturar' as unknown }));

// El contexto real necesita medidas del DOM; aquí solo interesa qué límites recibe.
vi.mock('@dnd-kit/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    DndContext: (props: { modifiers?: unknown; children: React.ReactNode }) => {
      captured.modifiers = props.modifiers;
      return <div>{props.children}</div>;
    }
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('no limita el arrastre de las tarjetas a su propia columna', () => {
  render(
    <BarReorderGroup enabled={true}>
      <span>tarjeta</span>
    </BarReorderGroup>
  );

  // El límite por columna era el que impedía mover las tarjetas a izquierda/derecha.
  expect(screen.getByText('tarjeta')).toBeInTheDocument();
  expect(captured.modifiers).toBeUndefined();
});
