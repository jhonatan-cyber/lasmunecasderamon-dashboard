'use client';

import { cn } from '@/lib/utils/utils';
import { Button } from '@/components/ui/button';
import {
  Wine,
  Sparkles,
  Beer,
  FlaskRound,
  Wine as Cocktail,
  CupSoda,
  Cigarette,
  Package,
  type LucideIcon
} from 'lucide-react';

const CATEGORY_STYLES: Record<
  string,
  {
    icon: LucideIcon;
    bg: string;
    bgHover: string;
    ring: string;
    text: string;
    darkBg: string;
    darkBgHover: string;
    darkRing: string;
    darkText: string;
  }
> = {
  vino: {
    icon: Wine,
    bg: 'bg-rose-50',
    bgHover: 'hover:bg-rose-100',
    ring: 'ring-rose-200',
    text: 'text-rose-700',
    darkBg: 'dark:bg-rose-950/30',
    darkBgHover: 'dark:hover:bg-rose-950/50',
    darkRing: 'dark:ring-rose-800',
    darkText: 'dark:text-rose-300'
  },
  champagne: {
    icon: Sparkles,
    bg: 'bg-amber-50',
    bgHover: 'hover:bg-amber-100',
    ring: 'ring-amber-200',
    text: 'text-amber-700',
    darkBg: 'dark:bg-amber-950/30',
    darkBgHover: 'dark:hover:bg-amber-950/50',
    darkRing: 'dark:ring-amber-800',
    darkText: 'dark:text-amber-300'
  },
  cerveza: {
    icon: Beer,
    bg: 'bg-yellow-50',
    bgHover: 'hover:bg-yellow-100',
    ring: 'ring-yellow-200',
    text: 'text-yellow-700',
    darkBg: 'dark:bg-yellow-950/30',
    darkBgHover: 'dark:hover:bg-yellow-950/50',
    darkRing: 'dark:ring-yellow-800',
    darkText: 'dark:text-yellow-300'
  },
  whisky: {
    icon: FlaskRound,
    bg: 'bg-orange-50',
    bgHover: 'hover:bg-orange-100',
    ring: 'ring-orange-200',
    text: 'text-orange-700',
    darkBg: 'dark:bg-orange-950/30',
    darkBgHover: 'dark:hover:bg-orange-950/50',
    darkRing: 'dark:ring-orange-800',
    darkText: 'dark:text-orange-300'
  },
  ginebra: {
    icon: FlaskRound,
    bg: 'bg-emerald-50',
    bgHover: 'hover:bg-emerald-100',
    ring: 'ring-emerald-200',
    text: 'text-emerald-700',
    darkBg: 'dark:bg-emerald-950/30',
    darkBgHover: 'dark:hover:bg-emerald-950/50',
    darkRing: 'dark:ring-emerald-800',
    darkText: 'dark:text-emerald-300'
  },
  ron: {
    icon: FlaskRound,
    bg: 'bg-amber-50',
    bgHover: 'hover:bg-amber-100',
    ring: 'ring-amber-200',
    text: 'text-amber-700',
    darkBg: 'dark:bg-amber-950/30',
    darkBgHover: 'dark:hover:bg-amber-950/50',
    darkRing: 'dark:ring-amber-800',
    darkText: 'dark:text-amber-300'
  },
  tequila: {
    icon: FlaskRound,
    bg: 'bg-lime-50',
    bgHover: 'hover:bg-lime-100',
    ring: 'ring-lime-200',
    text: 'text-lime-700',
    darkBg: 'dark:bg-lime-950/30',
    darkBgHover: 'dark:hover:bg-lime-950/50',
    darkRing: 'dark:ring-lime-800',
    darkText: 'dark:text-lime-300'
  },
  vodka: {
    icon: FlaskRound,
    bg: 'bg-sky-50',
    bgHover: 'hover:bg-sky-100',
    ring: 'ring-sky-200',
    text: 'text-sky-700',
    darkBg: 'dark:bg-sky-950/30',
    darkBgHover: 'dark:hover:bg-sky-950/50',
    darkRing: 'dark:ring-sky-800',
    darkText: 'dark:text-sky-300'
  },
  cóctel: {
    icon: Cocktail,
    bg: 'bg-pink-50',
    bgHover: 'hover:bg-pink-100',
    ring: 'ring-pink-200',
    text: 'text-pink-700',
    darkBg: 'dark:bg-pink-950/30',
    darkBgHover: 'dark:hover:bg-pink-950/50',
    darkRing: 'dark:ring-pink-800',
    darkText: 'dark:text-pink-300'
  },
  refresco: {
    icon: CupSoda,
    bg: 'bg-blue-50',
    bgHover: 'hover:bg-blue-100',
    ring: 'ring-blue-200',
    text: 'text-blue-700',
    darkBg: 'dark:bg-blue-950/30',
    darkBgHover: 'dark:hover:bg-blue-950/50',
    darkRing: 'dark:ring-blue-800',
    darkText: 'dark:text-blue-300'
  },
  'bebidas analcoholicas': {
    icon: CupSoda,
    bg: 'bg-cyan-50',
    bgHover: 'hover:bg-cyan-100',
    ring: 'ring-cyan-200',
    text: 'text-cyan-700',
    darkBg: 'dark:bg-cyan-950/30',
    darkBgHover: 'dark:hover:bg-cyan-950/50',
    darkRing: 'dark:ring-cyan-800',
    darkText: 'dark:text-cyan-300'
  },
  cigarrillo: {
    icon: Cigarette,
    bg: 'bg-stone-50',
    bgHover: 'hover:bg-stone-100',
    ring: 'ring-stone-200',
    text: 'text-stone-700',
    darkBg: 'dark:bg-stone-950/30',
    darkBgHover: 'dark:hover:bg-stone-950/50',
    darkRing: 'dark:ring-stone-800',
    darkText: 'dark:text-stone-300'
  }
};

const fallback = {
  icon: Package,
  bg: 'bg-neutral-50',
  bgHover: 'hover:bg-neutral-100',
  ring: 'ring-neutral-200',
  text: 'text-neutral-700',
  darkBg: 'dark:bg-neutral-800/30',
  darkBgHover: 'dark:hover:bg-neutral-800/50',
  darkRing: 'dark:ring-neutral-700',
  darkText: 'dark:text-neutral-300'
};

function getCategoryStyle(categoria: string) {
  const normalized = categoria
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  for (const [key, style] of Object.entries(CATEGORY_STYLES)) {
    if (normalized.includes(key)) return style;
  }
  return fallback;
}

interface SettingsCategoryCardProps {
  categoria: string;
  productoCount: number;
  isSelected?: boolean;
  onClick: () => void;
}

export function SettingsCategoryCard({
  categoria,
  productoCount,
  isSelected = false,
  onClick
}: SettingsCategoryCardProps) {
  const style = getCategoryStyle(categoria);
  const Icon = style.icon;

  return (
    <Button
      variant='unstyled'
      type='button'
      onClick={onClick}
      className={cn(
        'group flex flex-col items-center gap-3 rounded-2xl border p-5 transition-all duration-200',
        style.bg,
        style.bgHover,
        style.darkBg,
        style.darkBgHover,
        'border-neutral-200 dark:border-neutral-800',
        isSelected
          ? cn('ring-2', style.ring, style.darkRing)
          : 'hover:ring-2 hover:ring-neutral-300 dark:hover:ring-neutral-600'
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110',
          'bg-white/80 dark:bg-neutral-900/80',
          style.text,
          style.darkText
        )}
      >
        <Icon className='h-6 w-6' aria-hidden='true' />
      </div>
      <div className='text-center'>
        <p className='text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-[140px]'>
          {categoria}
        </p>
        <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-0.5'>
          {productoCount} {productoCount === 1 ? 'producto' : 'productos'}
        </p>
      </div>
    </Button>
  );
}
