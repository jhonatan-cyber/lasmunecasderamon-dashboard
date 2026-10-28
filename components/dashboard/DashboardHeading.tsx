import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/utils';

const tones = {
  emerald: { icon: 'text-emerald-500', tile: 'bg-emerald-500/10 text-emerald-500' },
  indigo: { icon: 'text-indigo-500', tile: 'bg-indigo-500/10 text-indigo-500' },
  amber: { icon: 'text-amber-400', tile: 'bg-amber-500/10 text-amber-500' },
  slate: { icon: 'text-slate-500', tile: 'bg-slate-500/10 text-slate-500' }
} as const;

export type DashboardHeadingTone = keyof typeof tones;

interface SectionHeadingProps {
  icon: LucideIcon;
  title: string;
  tone?: DashboardHeadingTone;
  className?: string;
}

/** Título de sección del dashboard (icono + etiqueta en mayúsculas). */
export function SectionHeading({
  icon: Icon,
  title,
  tone = 'emerald',
  className
}: SectionHeadingProps) {
  return (
    <div className={cn('flex items-center gap-2 px-2', className)}>
      <Icon aria-hidden='true' className={cn('h-4 w-4', tones[tone].icon)} />
      <h2 className='text-xs font-black uppercase tracking-widest text-slate-400'>{title}</h2>
    </div>
  );
}

interface PanelHeadingProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  tone?: DashboardHeadingTone;
  className?: string;
}

/** Encabezado de panel interno (icono en caja + título + subtítulo). */
export function PanelHeading({
  icon: Icon,
  title,
  description,
  tone = 'emerald',
  className
}: PanelHeadingProps) {
  return (
    <div className={cn('flex items-center gap-3 px-1', className)}>
      <div className={cn('rounded-xl p-2', tones[tone].tile)}>
        <Icon aria-hidden='true' className='h-4 w-4' />
      </div>
      <div className='flex flex-col'>
        <span className='text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white'>
          {title}
        </span>
        {description && (
          <span className='text-[10px] font-bold uppercase tracking-tighter text-slate-400'>
            {description}
          </span>
        )}
      </div>
    </div>
  );
}
