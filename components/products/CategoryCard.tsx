'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTag, faBox, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CardContainer, CardBody } from '@/components/ui/3d-card';

interface CategoryCardProps {
  category: {
    id: number;
    name: string;
    description: string;
    status: number;
    total_products?: number;
    created_at?: string;
  };
  onClick: () => void;
}

// Función para generar un color basado en el ID de la categoría
const generateColor = (id: number) => {
  const colors = [
    '#3B82F6',
    '#10B981',
    '#8B5CF6',
    '#F59E0B',
    '#EF4444',
    '#06B6D4',
    '#84CC16',
    '#F97316',
    '#EC4899',
    '#6366F1',
    '#14B8A6',
    '#F43F5E',
    '#8B5CF6',
    '#06B6D4',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#3B82F6',
    '#10B981'
  ];
  return colors[id % colors.length];
};

export default function CategoryCard({ category, onClick }: CategoryCardProps) {
  const categoryColor = generateColor(category.id);

  // Formatear fecha de creación
  const createdAt = category.created_at
    ? new Date(category.created_at).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

  return (
    <CardContainer className='inter-var'>
      <CardBody 
        className='bg-white relative group/card hover:shadow-2xl hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto h-auto rounded-xl p-4 sm:p-6 border cursor-pointer hover:scale-105 transition-all duration-300'
      >
        <div onClick={onClick} className="w-full h-full">
        {/* Header */}
        <div className='flex items-start justify-between pb-3'>
          <div className='flex items-center gap-2 sm:gap-3'>
            <div
              className='w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center'
              style={{ backgroundColor: categoryColor + '15' }}
            >
              <FontAwesomeIcon icon={faTag} className='h-4 w-4 sm:h-6 sm:w-6' style={{ color: categoryColor }} />
            </div>
            <div className='flex-1'>
              <div className='text-sm sm:text-lg font-semibold text-neutral-600 dark:text-white group-hover:text-blue-600 transition-colors'>
                {category.name}
              </div>
              <p className='text-xs sm:text-sm text-gray-500 dark:text-neutral-300'>{category.total_products || 0} productos</p>
            </div>
          </div>
          <div className='opacity-0 group-hover:opacity-100 transition-opacity'>
            <FontAwesomeIcon
              icon={faArrowRight}
              className='h-3 w-3 sm:h-4 sm:w-4 text-gray-400 transition-colors'
            />
          </div>
        </div>

        {/* Content */}
        <div className='space-y-3 sm:space-y-4'>
          {/* Status badges */}
          <div className='flex items-center justify-between'>
            <Badge variant='secondary' className='bg-green-100 text-green-800 text-xs sm:text-sm'>
              Activa
            </Badge>
            <div className='flex items-center gap-1 text-green-600 text-xs sm:text-sm'>
              <FontAwesomeIcon icon={faBox} className='h-3 w-3' />
              Disponible
            </div>
          </div>

          {/* Description */}
          <p className='text-xs sm:text-sm text-gray-600 dark:text-neutral-300 line-clamp-2'>
            {category.description || 'Sin descripción'}
          </p>

          {/* Footer info */}
          <div className='flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700'>
            <span className='text-xs text-gray-500 dark:text-neutral-400'>Creada: {createdAt}</span>
          </div>
        </div>
      </div>
      </CardBody>
    </CardContainer>
  );
}
