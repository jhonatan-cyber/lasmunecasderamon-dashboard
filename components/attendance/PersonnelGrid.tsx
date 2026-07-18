'use client';

import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PersonnelItem {
  id: string | number;
  name: string;
  lastName: string;
  nick: string;
  role: string;
  status: number;
  foto?: string | null;
}

interface PersonnelGridProps {
  personnel: PersonnelItem[];
  onSelect: (person: PersonnelItem) => void;
}

export function PersonnelGrid({ personnel, onSelect }: PersonnelGridProps) {
  if (personnel.length === 0) {
    return (
      <div className='text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700'>
        <p className='text-slate-500'>No se encontró personal activo registrado.</p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
      {personnel.map(person => (
        <Card
          key={person.id}
          className='group relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer'
          onClick={() => onSelect(person)}
        >
          <div className='absolute inset-0'>
            <Image
              src={person.foto ? `/img/users/${person.foto}` : '/placeholder-user.jpg'}
              alt={`${person.name} ${person.lastName}`}
              fill
              className='object-cover transition-all duration-500 group-hover:scale-105'
              sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
              onError={e => {
                (e.target as HTMLImageElement).src = '/placeholder-user.jpg';
              }}
            />
            <div className='absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity' />
          </div>

          <div className='relative h-[280px] flex flex-col justify-end p-5'>
            <div className='transform translate-y-2 group-hover:translate-y-0 transition-all duration-300'>
              <h3 className='text-2xl font-black text-white leading-tight tracking-tight uppercase drop-shadow-lg'>
                {person.name}
                <span className='block text-slate-300 font-bold'>{person.lastName}</span>
              </h3>

              <div className='flex items-center justify-between mt-3 gap-2'>
                <div className='flex flex-col'>
                  <span className='text-[9px] font-black text-slate-400 uppercase tracking-widest'>
                    Username
                  </span>
                  <span className='text-sm font-bold text-white'>@{person.nick}</span>
                </div>
                <Badge className='bg-white/20 backdrop-blur-xs text-white font-black text-[10px] px-3 py-1.5 rounded-xl border border-white/20 uppercase tracking-wider'>
                  {person.role}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
