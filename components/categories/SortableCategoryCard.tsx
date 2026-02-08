import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CategoryCard from './CategoryCard';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface SortableCategoryCardProps {
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

export default function SortableCategoryCard({
  category,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate
}: SortableCategoryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: category.id });

  const { hasPermission } = useUserPermissions();
  
  // Verificar permisos
  const canEdit = hasPermission('categorias', 'editar');
  const canDelete = hasPermission('categorias', 'eliminar');
  const canActivate = hasPermission('categorias', 'activar');
  const canDeactivate = hasPermission('categorias', 'desactivar');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <CategoryCard
        category={category}
        onEdit={onEdit}
        onDelete={onDelete}
        onActivate={onActivate}
        onDeactivate={onDeactivate}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        canEdit={canEdit}
        canDelete={canDelete}
        canActivate={canActivate}
        canDeactivate={canDeactivate}
      />
    </div>
  );
}
