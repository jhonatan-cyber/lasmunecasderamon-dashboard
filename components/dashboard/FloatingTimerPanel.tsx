'use client';

import { useEffect, useRef, useSyncExternalStore, type ReactNode, type PointerEvent } from 'react';
import { Clock, EyeOff, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

type Position = { x: number; y: number };

type Preferences = { hidden: boolean; position: Position | null };
const STORAGE_KEY = 'dashboard.floating-timer.preferences';
const CHANGE_EVENT = 'floating-timer-preferences-changed';
const defaults: Preferences = { hidden: false, position: null };
let fallback = JSON.stringify(defaults);

function readSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? fallback;
  } catch {
    return fallback;
  }
}
function parsePreferences(raw: string | null): Preferences {
  try {
    const value = JSON.parse(raw ?? '{}');
    return {
      hidden: value?.hidden === true,
      position:
        Number.isFinite(value?.position?.x) && Number.isFinite(value?.position?.y)
          ? value.position
          : null
    };
  } catch {
    return defaults;
  }
}
function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}
function updatePreferences(update: (current: Preferences) => Preferences) {
  const current = readSnapshot();
  const next = JSON.stringify(update(parsePreferences(current)));
  if (next === current) return;
  fallback = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* Sigue funcionando si el navegador bloquea el almacenamiento. */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
const serverSnapshot = () => null;

export function FloatingTimerPanel({ count, children }: { count: number; children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, serverSnapshot);
  const ready = snapshot !== null;
  const { hidden, position } = parsePreferences(snapshot);
  const setHidden = (hidden: boolean) => updatePreferences(current => ({ ...current, hidden }));
  const setPosition = (position: Position) =>
    updatePreferences(current => ({ ...current, position }));
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointer: number; x: number; y: number; left: number; top: number } | null>(
    null
  );

  function clamp(next: Position): Position {
    const bounds = panelRef.current?.getBoundingClientRect();
    return {
      x: Math.max(8, Math.min(next.x, window.innerWidth - (bounds?.width ?? 0) - 8)),
      y: Math.max(8, Math.min(next.y, window.innerHeight - (bounds?.height ?? 0) - 8))
    };
  }

  useEffect(() => {
    if (!ready) return;
    const keepVisible = () =>
      updatePreferences(current => ({
        ...current,
        position: current.position ? clamp(current.position) : null
      }));
    keepVisible();
    window.addEventListener('resize', keepVisible);
    const observer = new ResizeObserver(keepVisible);
    if (panelRef.current) observer.observe(panelRef.current);
    return () => {
      window.removeEventListener('resize', keepVisible);
      observer.disconnect();
    };
  }, [ready]);

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const bounds = panelRef.current?.getBoundingClientRect();
    if (!bounds) return;
    event.preventDefault();
    drag.current = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: bounds.left,
      top: bounds.top
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const origin = drag.current;
    if (!origin || origin.pointer !== event.pointerId) return;
    setPosition(
      clamp({ x: origin.left + event.clientX - origin.x, y: origin.top + event.clientY - origin.y })
    );
  }

  if (!ready) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        ref={panelRef}
        className='fixed z-50 max-h-[calc(100dvh-16px)] max-w-[calc(100vw-16px)] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950/95'
        style={position ? { left: position.x, top: position.y } : { bottom: 16, right: 16 }}
      >
        <div className={`flex items-center gap-2 ${hidden ? 'p-1.5' : 'px-3 py-2'}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                aria-label='Mover temporizadores'
                className='h-7 w-7 shrink-0 touch-none cursor-grab rounded-full active:cursor-grabbing'
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={() => {
                  drag.current = null;
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
                onLostPointerCapture={() => {
                  drag.current = null;
                }}
                onKeyDown={event => {
                  const delta = {
                    ArrowLeft: [-20, 0],
                    ArrowRight: [20, 0],
                    ArrowUp: [0, -20],
                    ArrowDown: [0, 20]
                  }[event.key];
                  const bounds = panelRef.current?.getBoundingClientRect();
                  if (!delta || !bounds) return;
                  event.preventDefault();
                  setPosition(clamp({ x: bounds.left + delta[0], y: bounds.top + delta[1] }));
                }}
              >
                <GripVertical className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent>Arrastrar para mover · Flechas del teclado</TooltipContent>
            </TooltipPortal>
          </Tooltip>
          {hidden ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type='button'
                  variant='ghost'
                  className='h-8 gap-2 rounded-full px-2'
                  aria-label='Mostrar temporizadores'
                  onClick={() => setHidden(false)}
                >
                  <Clock className='h-4 w-4' />
                  <span className='text-xs tabular-nums'>{count}</span>
                </Button>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent>Mostrar temporizadores</TooltipContent>
              </TooltipPortal>
            </Tooltip>
          ) : (
            <>
              <Clock className='h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300' />
              <span className='flex-1 text-xs font-semibold'>
                {count === 1 ? 'Temporizador' : `Temporizadores (${count})`}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7 rounded-full'
                    aria-label='Ocultar temporizadores'
                    onClick={() => setHidden(true)}
                  >
                    <EyeOff className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent>Ocultar temporizadores</TooltipContent>
                </TooltipPortal>
              </Tooltip>
            </>
          )}
        </div>
        {!hidden && <div className='w-80 max-w-[calc(100vw-16px)] px-3 pb-3'>{children}</div>}
      </div>
    </TooltipProvider>
  );
}
