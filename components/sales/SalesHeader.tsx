/* eslint-disable */
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

interface SalesHeaderProps {
  loading: boolean;
  onRefresh: () => void;
}

export function SalesHeader({ loading, onRefresh }: SalesHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Ventas</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Panel de control de ventas y transacciones
        </p>
      </div>
      <PermissionGuard module="sales" action="create" fallback={null}>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={() => router.push("/sales/new")}
            size="sm"
            variant="outline"
            className="w-full sm:w-auto rounded-full px-4 sm:px-6 py-2 bg-black text-white hover:scale-105 transition-all duration-200 text-sm sm:text-base"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Nuevo
          </Button>
        </div>
      </PermissionGuard>
    </div>
  );
}
