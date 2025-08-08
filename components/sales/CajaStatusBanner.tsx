import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCashRegister } from "@/hooks/useCashRegister";

export function CajaStatusBanner() {
  const { hasOpenCaja, loading, error } = useCashRegister();
  const router = useRouter();

  if (loading) {
    return null; // No mostrar nada mientras carga
  }

  if (error) {
    return (
      <Alert className="mb-4 border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <span className="text-sm sm:text-base">
              <strong>Error al verificar caja.</strong> {error}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="w-full sm:w-auto border-yellow-300 text-yellow-700 hover:bg-yellow-100 text-sm sm:text-base"
            >
              Reintentar
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (!hasOpenCaja) {
    return (
      <Alert className="mb-4 border-red-200 bg-red-50">
        <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <span className="text-sm sm:text-base">
              <strong>No hay caja abierta.</strong> No se pueden realizar ventas
              sin una caja abierta.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/cash-register")}
              className="w-full sm:w-auto border-red-300 text-red-700 hover:bg-red-100 text-sm sm:text-base"
            >
              Abrir Caja
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
}
