import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CategoryCard from './CategoryCard';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';

interface SortableCategoryCardProps {
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
  isLoading?: boolean;
}

export default function SortableCategoryCard({
  category,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  isLoading = false
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
  const canEdit = hasPermission('categories', 'edit');
  const canDelete = hasPermission('categories', 'delete');
  const canActivate = hasPermission('categories', 'activate');
  const canDeactivate = hasPermission('categories', 'deactivate');

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
        isLoading={isLoading}
      />
    </div>
  );
}
