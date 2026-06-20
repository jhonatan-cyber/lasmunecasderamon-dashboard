 
import {
  Edit,
  Trash2,
  CheckCircle,
  Tag,
  Eye,
  Package,
  EyeOff,
  MoreVertical,
  Power,
  GripVertical
} from 'lucide-react';
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
import { CardContainer, CardBody } from '@/components/shared/3d-card';
import { formatLongDateEs } from '@/lib/utils/calendarUtils';

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    description: string;
    status: number;
    total_products?: number;
    created_at?: string;
  };
  onEdit: (category: { id: string; name: string; description: string }) => void;
  onDelete: (id: string) => void;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  isDragging?: boolean;
  dragHandleProps?: any;
  canEdit?: boolean;
  canDelete?: boolean;
  canActivate?: boolean;
  canDeactivate?: boolean;
  isLoading?: boolean;
}

const statusColors = {
  1: 'bg-green-100 text-green-800',
  0: 'bg-red-100 text-red-800'
};

const statusLabels = {
  1: 'Activa',
  0: 'Inactiva'
};


const generateColor = (name: string, id: string) => {
  
  const colors = [
    
    '#3B82F6',
    '#1D4ED8',
    '#2563EB',
    '#1E40AF',
    '#1E3A8A',
    
    '#10B981',
    '#059669',
    '#047857',
    '#065F46',
    '#064E3B',
    
    '#8B5CF6',
    '#7C3AED',
    '#6D28D9',
    '#5B21B6',
    '#4C1D95',
    
    '#F59E0B',
    '#D97706',
    '#B45309',
    '#92400E',
    '#78350F',
    
    '#EF4444',
    '#DC2626',
    '#B91C1C',
    '#991B1B',
    '#7F1D1D',
    
    '#6B7280',
    '#4B5563',
    '#374151',
    '#1F2937',
    '#111827',
    
    '#06B6D4',
    '#0891B2',
    '#0E7490',
    '#155E75',
    '#164E63',
    
    '#84CC16',
    '#65A30D',
    '#4D7C0F',
    '#3F6212',
    '#365314',
    
    '#EC4899',
    '#DB2777',
    '#BE185D',
    '#9D174D',
    '#831843',
    
    '#6366F1',
    '#4F46E5',
    '#4338CA',
    '#3730A3',
    '#312E81',
    
    '#10B981',
    '#059669',
    '#047857',
    '#065F46',
    '#064E3B',
    
    '#14B8A6',
    '#0D9488',
    '#0F766E',
    '#115E59',
    '#134E4A'
  ];

  
  let hash = 0;
  const strId = String(id);
  for (let i = 0; i < strId.length; i++) {
    hash = strId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

export default function CategoryCard({
  category,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  isDragging = false,
  dragHandleProps,
  canEdit = true,
  canDelete = true,
  canActivate = true,
  canDeactivate = true,
  isLoading = false
}: CategoryCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const categoryColor = generateColor(category.name, category.id);
  
  
  const hasAnyAction = canEdit || canDelete || canActivate || canDeactivate;

  
  const slug = category.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  
  const createdAt = category.created_at
    ? formatLongDateEs(category.created_at)
    : formatLongDateEs(new Date());

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    onDelete(category.id);
  };

  return (
    <CardContainer className='inter-var'>
      <CardBody className={`bg-white relative group/card hover:shadow-2xl hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto h-auto rounded-xl p-4 sm:p-6 border ${isDragging ? 'opacity-50' : ''}`}>
        {}
        <div className='flex items-start justify-between pb-3'>
          <div className='flex items-center gap-2 sm:gap-3'>
            {}
            <div {...dragHandleProps} className='cursor-grab active:cursor-grabbing touch-none'>
              <GripVertical className='h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600' />
            </div>
            <div
              className='w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center'
              style={{ backgroundColor: categoryColor + '15' }}
            >
              <Tag
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

          {hasAnyAction && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='bg-white hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full hover:scale-105 transition-all duration-200 p-2'
                >
                  <MoreVertical className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                {canEdit && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuItem
                          onClick={() => onEdit(category)}
                          className='cursor-pointer group'
                        >
                          <Edit
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
                )}

                {category.status === 1 && canDeactivate ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuItem
                          onClick={() => onDeactivate(category.id)}
                          className='cursor-pointer group'
                        >
                          <Power
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
                ) : category.status === 0 && canActivate ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuItem
                          onClick={() => onActivate(category.id)}
                          className='cursor-pointer group'
                        >
                          <CheckCircle
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
                ) : null}

                {canDelete && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuItem
                          className='cursor-pointer group'
                          onClick={handleDeleteClick}
                        >
                          <Trash2
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
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {}
        <div className='space-y-3 sm:space-y-4'>
          {}
          <div className='flex items-center justify-between'>
            <Badge
              variant='secondary'
              className={`${statusColors[category.status as keyof typeof statusColors]} text-xs sm:text-sm`}
            >
              {statusLabels[category.status as keyof typeof statusLabels]}
            </Badge>
            {category.status === 1 ? (
              <div className='flex items-center gap-1 text-green-600 text-xs sm:text-sm'>
                <Eye className='h-3 w-3' />
                <span className='hidden sm:inline'>Visible</span>
              </div>
            ) : (
              <div className='flex items-center gap-1 text-gray-500 text-xs sm:text-sm'>
                <EyeOff className='h-3 w-3 opacity-50' />
                <span className='hidden sm:inline'>Oculta</span>
              </div>
            )}
          </div>

          {}
          <p className='text-xs sm:text-sm text-gray-600 dark:text-neutral-300 line-clamp-2'>
            {category.description || 'Sin descripción'}
          </p>

          {}
          <div className='flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700'>
            <div className='flex items-center gap-2'>
              <Package className='h-3 w-3 sm:h-4 sm:w-4 text-gray-400' />
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
          isLoading={isLoading}
        />
      </CardBody>
    </CardContainer>
  );
}

