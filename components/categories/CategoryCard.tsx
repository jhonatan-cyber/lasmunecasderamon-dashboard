'use client';

import {
  Edit,
  Trash2,
  CheckCircle,
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
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal';
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
      <CardBody
        className={`bg-white relative group/card hover:shadow-2xl hover:shadow-emerald-500/10 dark:bg-black dark:border-white/20 border-black/10 w-auto h-auto rounded-xl p-4 sm:p-6 border ${isDragging ? 'opacity-50' : ''}`}
      >
        {}
        <div className='flex items-start justify-between pb-3'>
          <div className='flex items-center gap-2 sm:gap-3'>
            {}
            <div {...dragHandleProps} className='cursor-grab active:cursor-grabbing touch-none'>
              <GripVertical className='h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600' />
            </div>

            <div>
              <div className='text-base sm:text-lg font-semibold text-neutral-600 dark:text-white'>
                {category.name || 'Sin nombre'}
              </div>
              <div className='text-xs sm:text-sm text-gray-500 dark:text-neutral-300'>/{slug}</div>
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
                  <MoreVertical className='w-3 h-3 sm:w-4 sm:h-4' />
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
                          <Edit className='mr-2 text-purple-600 group-hover:text-purple-700 transition-colors w-3 h-3 sm:w-4 sm:h-4' />
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
                          <Power className='mr-2 text-orange-600 group-hover:text-orange-700 transition-colors w-3 h-3 sm:w-4 sm:h-4' />
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
                          <CheckCircle className='mr-2 text-green-600 group-hover:text-green-700 transition-colors w-3 h-3 sm:w-4 sm:h-4' />
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
                          <Trash2 className='mr-2 text-red-600 group-hover:text-red-700 transition-colors w-3 h-3 sm:w-4 sm:h-4' />
                          <span className='group-hover:text-red-700 transition-colors text-sm sm:text-base'>
                            Eliminar
                          </span>
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
            <span className='text-xs text-gray-500 dark:text-neutral-400 hidden sm:block'>
              Creada: {createdAt}
            </span>
          </div>
        </div>

        <DeleteConfirmModal
          open={showDeleteModal}
          onOpenChange={setShowDeleteModal}
          onConfirm={handleConfirmDelete}
          entityLabel='categoría'
          entityValue={category.name}
          fieldName='Categoría'
          isLoading={isLoading}
        />
      </CardBody>
    </CardContainer>
  );
}
