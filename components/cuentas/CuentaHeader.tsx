import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faRotate } from "@fortawesome/free-solid-svg-icons";

interface CuentaHeaderProps {
  loading: boolean;
  onRefresh: () => void;
}

export function CuentaHeader({ loading, onRefresh }: CuentaHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Cuentas</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Gestiona las cuentas de clientes y sus consumos
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <Button
          onClick={() => router.push("/accounts/new")}
          size="sm"
          variant="outline"
          className="w-full sm:w-auto rounded-full px-4 sm:px-6 py-2 bg-black text-white hover:scale-105 transition-all duration-200 text-sm sm:text-base"
        >
          <FontAwesomeIcon icon={faPlus} className='mr-2' />
          Nuevo
        </Button>
        <Button
          onClick={onRefresh}
          disabled={loading}
          size="sm"
          variant="outline"
          className="w-full sm:w-auto rounded-full px-4 sm:px-6 py-2 hover:scale-105 transition-all duration-200 text-sm sm:text-base"
        >
          <FontAwesomeIcon
            icon={faRotate}
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Actualizar
        </Button>
      </div>
    </div>
  );
}
