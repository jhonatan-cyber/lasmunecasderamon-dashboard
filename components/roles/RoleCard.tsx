import React from "react";
import { Shield, Edit, Trash2, CheckCircle, Users as UsersIcon } from "lucide-react";
import { ActionButtonWithTooltip } from "@/components/ui/ActionButtonWithTooltip";

export function RoleCard({
  role,
  selected,
  onSelect,
  onEdit,
  onDeactivate,
  onActivate,
}: {
  role: any;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${
        selected ? "ring-2 ring-black" : ""
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex items-center">
          <div className={`${role.color} rounded-lg p-2 sm:p-3 mr-2 sm:mr-3`}>
            <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h3 className="text-sm sm:text-lg font-semibold text-black">
              {role.name || 'Sin nombre'} 
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600">
              {role.description || 'Sin descripción'}
            </p>
          </div>
        </div>
        <div className="flex space-x-1">
          {role.status === 1 && (
            <ActionButtonWithTooltip
              onClick={() => {
                // Detener propagación manualmente
                window.event?.stopPropagation?.();
                onEdit();
              }}
              tooltip="Editar rol"
              className="text-yellow-600 hover:text-yellow-800 p-1 rounded"
            >
              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
            </ActionButtonWithTooltip>
          )}
          {role.status === 0 ? (
            <ActionButtonWithTooltip
              onClick={() => {
                window.event?.stopPropagation?.();
                onActivate();
              }}
              tooltip="Activar rol"
              className="text-green-600 hover:text-green-800 p-1 rounded"
            >
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
            </ActionButtonWithTooltip>
          ) : (
            <ActionButtonWithTooltip
              onClick={() => {
                window.event?.stopPropagation?.();
                onDeactivate();
              }}
              tooltip="Desactivar rol"
              className="text-red-600 hover:text-red-800 p-1 rounded"
            >
              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </ActionButtonWithTooltip>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center text-xs sm:text-sm text-zinc-500">
          <UsersIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
          {role.userCount} usuarios
        </div>
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            role.status === 1
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {role.status === 1 ? "Activo" : "Inactivo"}
        </span>
      </div>
    </div>
  );
} 