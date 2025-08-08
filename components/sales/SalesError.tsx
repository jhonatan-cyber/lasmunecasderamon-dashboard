import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface SalesErrorProps {
  error: string;
  onRetry: () => void;
}

export function SalesError({ error, onRetry }: SalesErrorProps) {
  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-center h-48 sm:h-64">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 sm:h-12 sm:w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
            Error al cargar datos
          </h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">{error}</p>
          <Button
            onClick={onRetry}
            size="sm"
            variant="outline"
            className="rounded-full px-4 sm:px-6 hover:scale-105 transition-all duration-200 text-sm sm:text-base"
          >
            <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  );
}
