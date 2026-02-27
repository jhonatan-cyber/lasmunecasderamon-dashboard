'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Users,
    Clock,
    AlertTriangle,
    CheckCircle2,
    HelpCircle,
    ShieldAlert,
    Beer,
    Waves
} from 'lucide-react';
import { useTimer, useCountdown } from '@/contexts/TimerContext';
import { ServicioWithDetails } from '@/types/servicio';
import { Room } from '@/types/room';

interface RoomMapDashboardProps {
    habitaciones: any[];
    servicios: any[];
}

export const RoomMapDashboard: React.FC<RoomMapDashboardProps> = ({
    habitaciones,
    servicios
}) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-1">
            {habitaciones.map(room => {
                const activeService = servicios.find(s => s.habitacion_id === room.id);
                return (
                    <RoomMapCard
                        key={room.id}
                        room={room}
                        servicio={activeService}
                    />
                );
            })}
        </div>
    );
};

const RoomMapCard: React.FC<{ room: Room; servicio?: ServicioWithDetails }> = ({
    room,
    servicio
}) => {
    const { getTimerByServicioId, formatTime } = useTimer();
    const timer = servicio ? getTimerByServicioId(servicio.id_servicio!) : null;
    const remainingTime = useCountdown(timer || undefined);

    const isOccupied = room.status === 2 || !!servicio;
    const isAvailable = room.status === 1 && !servicio;
    const isWarning = isOccupied && remainingTime > 0 && remainingTime <= 300; // 5 min
    const isEnded = isOccupied && remainingTime <= 0;

    let bgClass = 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800';
    let accentColor = 'bg-zinc-100 text-zinc-400';
    let badgeLabel = 'LIBRE';
    let badgeVariant: any = 'secondary';

    if (isAvailable) {
        bgClass = 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-emerald-400 hover:shadow-emerald-50 dark:hover:shadow-emerald-950/20';
        accentColor = 'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20';
    } else if (isEnded) {
        bgClass = 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900 animate-pulse-red';
        accentColor = 'bg-red-100 text-red-600 dark:bg-red-900/40';
        badgeLabel = 'FINALIZADO';
        badgeVariant = 'destructive';
    } else if (isWarning) {
        bgClass = 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 animate-pulse-yellow';
        accentColor = 'bg-amber-100 text-amber-600 dark:bg-amber-900/40';
        badgeLabel = 'POR TERMINAR';
    } else if (isOccupied) {
        bgClass = 'bg-indigo-50 dark:bg-indigo-950/10 border-indigo-100 dark:border-indigo-900 shadow-indigo-100/50 dark:shadow-none';
        accentColor = 'bg-indigo-500 text-white';
        badgeLabel = 'OCUPADA';
    }

    return (
        <Card className={`relative flex flex-col p-4 h-40 transition-all duration-300 border-2 ${bgClass} shadow-sm cursor-default overflow-hidden group`}>
            {/* Decorative Gradient Overlay */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full -mr-10 -mt-10 blur-2xl" />

            <div className="flex justify-between items-start z-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                            {room.name.replace('Habitación ', '')}
                        </span>
                    </div>
                    <Badge variant={badgeVariant} className="text-[10px] px-1.5 py-0 font-bold tracking-wider">
                        {badgeLabel}
                    </Badge>
                </div>

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${accentColor}`}>
                    {isAvailable && <CheckCircle2 className="w-5 h-5" />}
                    {isEnded && <AlertTriangle className="w-5 h-5" />}
                    {isWarning && <Clock className="w-5 h-5" />}
                    {isOccupied && !isWarning && !isEnded && <Users className="w-5 h-5" />}
                </div>
            </div>

            <div className="flex-1" />

            <div className="flex items-end justify-between z-10">
                {isOccupied ? (
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                            <Clock className={`w-3.5 h-3.5 ${isEnded ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-indigo-500'}`} />
                            <span className={`font-mono text-lg font-black tracking-tighter ${isEnded ? 'text-red-700' : isWarning ? 'text-amber-700' : 'text-indigo-700 dark:text-indigo-400'}`}>
                                {formatTime(remainingTime)}
                            </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate max-w-[100px]">
                            {servicio?.anfitrionas_nombres || 'Sin personal'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        <span className="text-xs font-medium text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">Listo</span>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Esperando servicio</p>
                    </div>
                )}

                <div className="text-right">
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium block">
                        #{room.id}
                    </span>
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        {room.price ? `$${(room.price / 1000).toFixed(0)}k` : '—'}
                    </span>
                </div>
            </div>

            {/* Progress bar for active timers */}
            {isOccupied && remainingTime > 0 && (
                <div className="absolute bottom-0 left-0 h-1 bg-zinc-200 dark:bg-zinc-800 w-full">
                    <div
                        className={`h-full transition-all duration-1000 ${isWarning ? 'bg-amber-500' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(100, (remainingTime / (room.time * 60)) * 100)}%` }}
                    />
                </div>
            )}
        </Card>
    );
};
