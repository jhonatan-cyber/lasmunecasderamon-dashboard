import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle,  CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCashRegister } from "@/hooks/useCashRegister";
import { useEffect } from "react";

interface CajaStatusCheckProps {
  onStatusChange?: (hasOpenCaja: boolean) => void;
}

export function CajaStatusCheck({ onStatusChange }: CajaStatusCheckProps) {
  const { hasOpenCaja, loading, error } = useCashRegister();
  const router = useRouter();

  useEffect(() => {
    if (hasOpenCaja !== null) {
      onStatusChange?.(hasOpenCaja);
    }
  }, [hasOpenCaja, onStatusChange]);

  if (loading) {
    return (
      <Alert className="mb-4">
        <CreditCard className="h-4 w-4" />
        <AlertDescription>
          Verificando estado de caja...
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert className="mb-4 border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <div className="flex items-center justify-between">
            <span>
              <strong>Error al verificar caja.</strong> {error}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="ml-4 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
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
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <div className="flex items-center justify-between">
            <span>
              <strong>No hay caja abierta.</strong> No se pueden realizar ventas sin una caja abierta.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/cash-register")}
              className="ml-4 border-red-300 text-red-700 hover:bg-red-100"
            >
              Abrir Caja
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

} 