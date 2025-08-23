import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Permission {
  id?: number;
  name: string;
  description: string;
  module: string;
  action: string;
}

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  permission?: Permission | null;
  onSave: () => void;
}

const modules = [
  'usuarios', 'roles', 'pedidos', 'ventas', 'anticipos', 'comisiones', 
  'propinas', 'horas_extras', 'asistencias', 'habitaciones', 'productos', 
  'categorias', 'clientes', 'cuentas', 'devoluciones', 'servicios', 
  'reportes', 'configuraciones', 'caja', 'pagos_trabajadores', 'detalle_planillas', 'privados'
];

const actions = [
  'ver', 'crear', 'editar', 'eliminar', 'activar', 'desactivar', 'procesar', 'cerrar', 'detalles'
];

export default function PermissionModal({ isOpen, onClose, permission, onSave }: PermissionModalProps) {
  const [formData, setFormData] = useState<Permission>({
    name: '',
    description: '',
    module: '',
    action: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (permission) {
      setFormData(permission);
    } else {
      setFormData({
        name: '',
        description: '',
        module: '',
        action: ''
      });
    }
  }, [permission]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = permission?.id 
        ? `/api/permissions/${permission.id}`
        : '/api/permissions';
      
      const method = permission?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        onSave();
        onClose();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Error al guardar el permiso');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4 text-black dark:text-neutral-100">
            {permission ? 'Editar Permiso' : 'Crear Nuevo Permiso'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre del Permiso</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: ver_usuarios"
                required
                className="rounded-full"
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del permiso"
                className="rounded-lg"
              />
            </div>

            <div>
              <Label htmlFor="module">Módulo</Label>
              <Select value={formData.module} onValueChange={(value) => setFormData({ ...formData, module: value })}>
                <SelectTrigger className="rounded-full">
                  <SelectValue placeholder="Seleccionar módulo" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((module) => (
                    <SelectItem key={module} value={module}>
                      {module.replace('_', ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="action">Acción</Label>
              <Select value={formData.action} onValueChange={(value) => setFormData({ ...formData, action: value })}>
                <SelectTrigger className="rounded-full">
                  <SelectValue placeholder="Seleccionar acción" />
                </SelectTrigger>
                <SelectContent>
                  {actions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 rounded-full"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-full"
                disabled={loading}
              >
                {loading ? 'Guardando...' : (permission ? 'Actualizar' : 'Crear')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
