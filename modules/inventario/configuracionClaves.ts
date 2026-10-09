import type { DefinicionClave } from '@/lib/configuracion/definiciones';
import { enteroEnRango } from '@/lib/configuracion/definiciones';
export const CLAVES_INVENTARIO: Record<string, DefinicionClave> = {
  shot_ml: {
    categoria: 'bar',
    tipo: 'number',
    default: 50,
    validar: enteroEnRango('shot_ml', 1, 1000, 'ml por shot')
  },
  botella_ml: {
    categoria: 'bar',
    tipo: 'number',
    default: 750,
    validar: enteroEnRango('botella_ml', 1, 10000, 'ml por botella')
  },
  shots_alerta: {
    categoria: 'bar',
    tipo: 'number',
    default: 3,
    validar: enteroEnRango('shots_alerta', 1, 50, 'shots restantes')
  },
  merma_shots_ml: {
    categoria: 'bar',
    tipo: 'number',
    default: 50,
    validar: enteroEnRango('merma_shots_ml', 0, 250, 'ml de merma por botella')
  }
};
