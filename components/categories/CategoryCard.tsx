import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faTrash,
  faCheckCircle,
  faTag,
  faEye,
  faBox,
  faEyeSlash,
  faEllipsisV,
  faPowerOff
} from '@fortawesome/free-solid-svg-icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';
import { DeleteCategoryConfirmModal } from './DeleteCategoryConfirmModal';
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
  onEdit: (category: { id: number; name: string; description: string }) => void;
  onDelete: (id: number) => void;
  onActivate: (id: number) => void;
  onDeactivate: (id: number) => void;
}

const statusColors = {
  1: 'bg-green-100 text-green-800',
  0: 'bg-red-100 text-red-800'
};

const statusLabels = {
  1: 'Activa',
  0: 'Inactiva'
};

// Función para generar un color basado en el nombre de la categoría
const generateColor = (name: string, id: number) => {
  // Paleta de colores vibrantes y variados
  const colors = [
    // Azules
    '#3B82F6',
    '#1D4ED8',
    '#2563EB',
    '#1E40AF',
    '#1E3A8A',
    // Verdes
    '#10B981',
    '#059669',
    '#047857',
    '#065F46',
    '#064E3B',
    // Púrpuras
    '#8B5CF6',
    '#7C3AED',
    '#6D28D9',
    '#5B21B6',
    '#4C1D95',
    // Naranjas
    '#F59E0B',
    '#D97706',
    '#B45309',
    '#92400E',
    '#78350F',
    // Rojos
    '#EF4444',
    '#DC2626',
    '#B91C1C',
    '#991B1B',
    '#7F1D1D',
    // Grises
    '#6B7280',
    '#4B5563',
    '#374151',
    '#1F2937',
    '#111827',
    // Cian
    '#06B6D4',
    '#0891B2',
    '#0E7490',
    '#155E75',
    '#164E63',
    // Amarillos
    '#84CC16',
    '#65A30D',
    '#4D7C0F',
    '#3F6212',
    '#365314',
    // Rosas
    '#EC4899',
    '#DB2777',
    '#BE185D',
    '#9D174D',
    '#831843',
    // Índigo
    '#6366F1',
    '#4F46E5',
    '#4338CA',
    '#3730A3',
    '#312E81',
    // Esmeralda
    '#10B981',
    '#059669',
    '#047857',
    '#065F46',
    '#064E3B',
    // Teal
    '#14B8A6',
    '#0D9488',
    '#0F766E',
    '#115E59',
    '#134E4A'
  ];

  // Usar el ID para seleccionar un color de manera determinística
  const colorIndex = (id * name.length) % colors.length;
  return colors[colorIndex];
};

export default function CategoryCard({
  category,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate
}: CategoryCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const categoryColor = generateColor(category.name, category.id);

  // Crear slug para la URL
  const slug = category.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

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

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    onDelete(category.id);
  };

  return (
    <CardContainer className='inter-var'>
      <CardBody className='bg-white relative group/card hover:shadow-2xl hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto h-auto rounded-xl p-4 sm:p-6 border'>
        {/* Header */}
        <div className='flex items-start justify-between pb-3'>
          <div className='flex items-center gap-2 sm:gap-3'>
            <div
              className='w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center'
              style={{ backgroundColor: categoryColor + '15' }}
            >
              <FontAwesomeIcon
                icon={faTag}
                className='h-4 w-4 sm:h-6 sm:w-6'
                style={{ color: categoryColor }}
              />
            </div>
            <div>
              <div className='text-base sm:text-lg font-semibold text-neutral-600 dark:text-white'>
                {category.name || 'Sin nombre'}
              </div>
              <div className='text-xs sm:text-sm text-gray-500 dark:text-neutral-300'>
                /{slug}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='bg-white hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full hover:scale-105 transition-all duration-200 p-2'
              >
                <FontAwesomeIcon icon={faEllipsisV} className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem
                      onClick={() => onEdit(category)}
                      className='cursor-pointer group'
                    >
                      <FontAwesomeIcon
                        icon={faEdit}
                        className='mr-2 text-purple-600 group-hover:text-purple-700 transition-colors w-3 h-3 sm:w-4 sm:h-4'
                      />
                      <span className='group-hover:text-purple-700 transition-colors text-sm sm:text-base'>
                        Editar
                      </span>
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Editar esta categoría</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {category.status === 1 ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem
                        onClick={() => onDeactivate(category.id)}
                        className='cursor-pointer group'
                      >
                        <FontAwesomeIcon
                          icon={faPowerOff}
                          className='mr-2 text-orange-600 group-hover:text-orange-700 transition-colors w-3 h-3 sm:w-4 sm:h-4'
                        />
                        <span className='group-hover:text-orange-700 transition-colors text-sm sm:text-base'>
                          Desactivar
                        </span>
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Desactivar esta categoría</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuItem
                        onClick={() => onActivate(category.id)}
                        className='cursor-pointer group'
                      >
                        <FontAwesomeIcon
                          icon={faCheckCircle}
                          className='mr-2 text-green-600 group-hover:text-green-700 transition-colors w-3 h-3 sm:w-4 sm:h-4'
                        />
                        <span className='group-hover:text-green-700 transition-colors text-sm sm:text-base'>
                          Activar
                        </span>
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Activar esta categoría</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem
                      className='cursor-pointer group'
                      onClick={handleDeleteClick}
                    >
                      <FontAwesomeIcon
                        icon={faTrash}
                        className='mr-2 text-red-600 group-hover:text-red-700 transition-colors w-3 h-3 sm:w-4 sm:h-4'
                      />
                      <span className='group-hover:text-red-700 transition-colors text-sm sm:text-base'>Eliminar</span>
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Eliminar esta categoría</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <div className='space-y-3 sm:space-y-4'>
          {/* Status badges */}
          <div className='flex items-center justify-between'>
            <Badge
              variant='secondary'
              className={`${statusColors[category.status as keyof typeof statusColors]} text-xs sm:text-sm`}
            >
              {statusLabels[category.status as keyof typeof statusLabels]}
            </Badge>
            {category.status === 1 ? (
              <div className='flex items-center gap-1 text-green-600 text-xs sm:text-sm'>
                <FontAwesomeIcon icon={faEye} className='h-3 w-3' />
                <span className='hidden sm:inline'>Visible</span>
              </div>
            ) : (
              <div className='flex items-center gap-1 text-gray-500 text-xs sm:text-sm'>
                <FontAwesomeIcon icon={faEyeSlash} className='h-3 w-3 opacity-50' />
                <span className='hidden sm:inline'>Oculta</span>
              </div>
            )}
          </div>

          {/* Description */}
          <p className='text-xs sm:text-sm text-gray-600 dark:text-neutral-300 line-clamp-2'>
            {category.description || 'Sin descripción'}
          </p>

          {/* Footer info */}
          <div className='flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700'>
            <div className='flex items-center gap-2'>
              <FontAwesomeIcon icon={faBox} className='h-3 w-3 sm:h-4 sm:w-4 text-gray-400' />
              <span className='text-xs sm:text-sm text-gray-600 dark:text-neutral-300'>
                {category.total_products || 0} productos
              </span>
            </div>
            <span className='text-xs text-gray-500 dark:text-neutral-400 hidden sm:block'>Creada: {createdAt}</span>
          </div>
        </div>

        <DeleteCategoryConfirmModal
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          onConfirm={handleConfirmDelete}
          categoryName={category.name}
        />
      </CardBody>
    </CardContainer>
  );
}
