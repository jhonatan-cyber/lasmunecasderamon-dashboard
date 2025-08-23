'use client';

import { PermissionsManager } from '@/components/permissions/PermissionsManager';
import { Button } from '@/components/ui/button';
import { Shield, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function PermissionsPage() {
  const setupPermissions = async () => {
    try {
      const response = await fetch('/api/permissions/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Permisos del sistema configurados correctamente');
        // Recargar la página para mostrar los nuevos permisos
        window.location.reload();
      } else {
        toast.error(result.message || 'Error al configurar permisos');
      }
    } catch (error) {
      toast.error('Error al configurar los permisos del sistema');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Permisos</h1>
          <p className="text-gray-600">Administra los permisos del sistema</p>
        </div>
        <Button
          onClick={setupPermissions}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Settings className="h-4 w-4 mr-2" />
          Configurar Permisos del Sistema
        </Button>
      </div>

      <PermissionsManager />
    </div>
  );
} 