"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  ArrowLeft,
  DollarSign,
  Coins,
  ShoppingCart,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatCurrencyNoDecimals } from "@/lib/formatters";
import CustomersSelect from "@/components/ui/CustomersSelect";
import HostessSelect from "@/components/ui/HostessSelect";
import RoomSelect from "@/components/ui/RoomSelect";
import PaymentMethodSelect from "@/components/ui/PaymentMethodSelect";
import { useClientes } from "@/hooks/useClientes";
import { useAnfitrionas } from "@/hooks/useAnfitrionas";
import { useHabitaciones } from "@/hooks/useHabitaciones";
import { useTimer } from "@/contexts/TimerContext";

export default function NuevoServicioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { clientes, loading: loadingClientes } = useClientes();
  const { anfitrionas, loading: loadingAnfitrionas } = useAnfitrionas();
  const { habitaciones, loading: loadingHabitaciones } = useHabitaciones();

  // Log temporal para debug
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("Habitaciones cargadas:", habitaciones);
      console.log("Clientes cargados:", clientes?.length, "Loading:", loadingClientes);
    }
  }, [habitaciones, clientes, loadingClientes]);
  const { startTimer } = useTimer();

  // Form data
  const [formData, setFormData] = useState({
    clientes: [] as number[], // Cambiado a array para soportar múltiples clientes
    usuarios: [] as number[],
    habitacion_id: null as number | null,
    precio_habitacion: 0,
    tiempo_habitacion: 0,
    precio_servicio: 0,
    metodo_pago: "",
    iva: 0,
    tiempo: 0,
  });

  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [servicioDataToSubmit, setServicioDataToSubmit] = useState<any>(null);

  // Calculated values
  const [precioHabitacion, setPrecioHabitacion] = useState(0);
  const [tiempoHabitacion, setTiempoHabitacion] = useState(0);
  const [subTotal, setSubTotal] = useState(0);
  const [total, setTotal] = useState(0);

  // Dynamic limits calculation
  const selectedRoom = useMemo(() => {
    return habitaciones.find(h => (h.id_habitacion || h.id) === formData.habitacion_id);
  }, [formData.habitacion_id, habitaciones]);

  const hasComision = useMemo(() => {
    return selectedRoom && (selectedRoom.comision_anfitriona ?? 0) > 0;
  }, [selectedRoom]);

  const maxHostesses = useMemo(() => {
    if (!hasComision) return 10; // Default limit if no special room
    // Rule: Max 3 girls AND (Girls + Clients) <= 4
    return Math.min(3, 4 - formData.clientes.length);
  }, [hasComision, formData.clientes.length]);

  const maxClients = useMemo(() => {
    if (!hasComision) return 4;
    // Rule: (Girls + Clients) <= 4
    return 4 - formData.usuarios.length;
  }, [hasComision, formData.usuarios.length]);

  // Format number with thousand separators
  const formatNumberWithSeparators = (value: number): string => {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Generate random code function
  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Calculate totals when form data changes
  useEffect(() => {
    // Lógica: Si el número de clientes es mayor al de anfitrionas y la habitación NO tiene comisión,
    // el precio de la habitación y el servicio se multiplican por el número de clientes seleccionados.
    // En otros casos, se multiplica por el número de anfitrionas.
    const cantidadAnfitrionas = formData.usuarios.length || 1;
    const cantidadClientes = formData.clientes.length || 1;
    let multiplicadorServicio = cantidadAnfitrionas;
    let multiplicadorHabitacion = cantidadAnfitrionas;

    if (
      cantidadClientes > cantidadAnfitrionas &&
      selectedRoom && (selectedRoom.comision_anfitriona ?? 0) === 0
    ) {
      multiplicadorServicio = cantidadClientes;
      multiplicadorHabitacion = cantidadClientes;
    }

    // Si la habitación tiene comisión mayor a cero, NO multiplicar el precio de la habitación
    if (selectedRoom && (selectedRoom.comision_anfitriona ?? 0) > 0) {
      multiplicadorHabitacion = 1;
    }

    const nuevoSubTotal = formData.precio_servicio * multiplicadorServicio;
    const precioHabitacionTotal = precioHabitacion * multiplicadorHabitacion;

    // Calcular IVA sobre el precio de servicio ya multiplicado
    let nuevoIVA = 0;
    if (formData.metodo_pago === "tarjeta") {
      nuevoIVA = Math.floor(nuevoSubTotal * 0.20);
    }

    let nuevoTotal = nuevoSubTotal + precioHabitacionTotal + nuevoIVA;
    let totalFinal = nuevoTotal;

    if (formData.metodo_pago === "tarjeta") {
      const totalRedondeado = Math.ceil(nuevoTotal / 5000) * 5000;
      const excedente = totalRedondeado - nuevoTotal;
      totalFinal = totalRedondeado;
      nuevoIVA = nuevoIVA + excedente;
    }

    setSubTotal(nuevoSubTotal);
    setTotal(totalFinal);
    setFormData((prev) => ({ ...prev, iva: nuevoIVA }));
  }, [formData.precio_servicio, precioHabitacion, formData.iva, formData.usuarios.length, formData.clientes.length, formData.metodo_pago, selectedRoom]);

  // Update habitacion data when selected
  useEffect(() => {
    if (formData.habitacion_id) {
      if (selectedRoom) {
        const precio = selectedRoom.precio || selectedRoom.price || 0;
        const tiempo = selectedRoom.tiempo || selectedRoom.time || 0;
        setPrecioHabitacion(precio);
        setTiempoHabitacion(tiempo);
        setFormData((prev) => ({ ...prev, tiempo: tiempo }));
      }
    } else {
      setPrecioHabitacion(0);
      setTiempoHabitacion(0);
    }
  }, [formData.habitacion_id, selectedRoom]);

  // Calculate IVA (20%) when payment method is "tarjeta"
  useEffect(() => {
    if (formData.metodo_pago === "tarjeta") {
      const ivaCalculado = Math.floor(formData.precio_servicio * 0.20);
      setFormData((prev) => ({ ...prev, iva: ivaCalculado }));
    } else {
      setFormData((prev) => ({ ...prev, iva: 0 }));
    }
  }, [formData.metodo_pago, formData.precio_servicio]);

  const handleSubmit = async () => {
    if (formData.usuarios.length === 0) {
      toast.error("Selecciona al menos una anfitriona");
      return;
    }
    if (!formData.habitacion_id) {
      toast.error("Selecciona una habitación");
      return;
    }
    if (formData.precio_servicio < 0) {
      toast.error("El precio de servicio no puede ser negativo");
      return;
    }
    if (!formData.metodo_pago) {
      toast.error("Selecciona un método de pago");
      return;
    }

    // Preparar datos del servicio
    const servicioData = {
      codigo: generateCode(),
      cliente_id: formData.clientes.length > 0 ? formData.clientes[0] : null, // Enviamos el primero como principal
      clientes: formData.clientes, // Enviamos todos los clientes
      habitacion_id: formData.habitacion_id,
      precio_habitacion: precioHabitacion,
      precio_servicio: formData.precio_servicio,
      iva: formData.iva,
      sub_total: subTotal,
      total: total,
      tiempo: formData.tiempo,
      metodo_pago: formData.metodo_pago,
      usuarios: formData.usuarios,
    };

    setServicioDataToSubmit(servicioData);
    setShowConfirmModal(true);
  };

  // Función para enviar el servicio después de confirmar
  const confirmAndSubmit = async () => {
    if (!servicioDataToSubmit) return;

    setLoading(true);
    setShowConfirmModal(false);
    try {
      const response = await fetch("/api/servicios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(servicioDataToSubmit),
      });

      const data = await response.json();

      if (data.success) {
        if (selectedRoom) {
          startTimer(
            data.data.id_servicio,
            servicioDataToSubmit.habitacion_id,
            selectedRoom.nombre || selectedRoom.name || selectedRoom.numero || "N/A",
            servicioDataToSubmit.tiempo,
            servicioDataToSubmit.codigo,
            clientes.find((c) => c.id_cliente === servicioDataToSubmit.cliente_id)
              ?.nombre || ""
          );
        }

        toast.success(`Servicio creado exitosamente`);
        router.push("/private-rooms");
      } else {
        toast.error(data.message || "Error al crear servicio");
      }
    } catch (error) {
      console.error("Error al crear servicio:", error);
      toast.error("Error al crear servicio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 sm:mt-6 lg:mt-10 p-4 sm:p-6 lg:p-8 gap-4 sm:gap-6">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Datos Servicio</h2>
          <div className="uppercase text-xs tracking-widest text-gray-400 font-semibold mb-1">
            Las muñecas de Ramón
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="rounded-full px-4 sm:px-6 bg-black text-white hover:scale-110 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto"
          onClick={() => router.push("/private-rooms")}
          type="button"
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          Atrás
        </Button>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 bg-white mx-4 sm:mx-6 lg:mx-8 space-y-4 sm:space-y-6 shadow-md rounded-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Habitación - AHORA PRIMERO */}
          <RoomSelect
            habitaciones={habitaciones}
            value={formData.habitacion_id ? formData.habitacion_id.toString() : ""}
            onChange={(value) =>
              setFormData({ ...formData, habitacion_id: parseInt(value) })
            }
            label="Habitación"
            placeholder="Seleccionar habitación"
            required={true}
            showPrice={true}
            showTime={true}
            filterByStatus={1} // Solo habitaciones disponibles
            className="w-full"
          />

          {/* Anfitrionas */}
          <HostessSelect
            anfitrionas={anfitrionas}
            value={formData.usuarios.map((id) => id.toString())}
            onChange={(value) =>
              setFormData({
                ...formData,
                usuarios: value.map((id) => parseInt(id)),
              })
            }
            label="Anfitrionas"
            placeholder="Seleccionar anfitrionas"
            required={true}
            maxSelection={maxHostesses}
            className="w-full"
          />

          {/* Cliente - AHORA OPCIONAL Y MÚLTIPLE */}
          <CustomersSelect
            clientes={clientes}
            value={formData.clientes.map(id => id.toString())}
            onChange={(value) =>
              setFormData({
                ...formData,
                clientes: value.map(id => parseInt(id)),
              })
            }
            label="Clientes (Opcional)"
            placeholder="Seleccionar cliente(s)"
            maxSelection={maxClients}
            className="w-full"
          />

          {/* Precio de servicio */}
          <div>
            <Label className="block text-xs font-medium text-gray-500 mb-1">
              Precio de servicio
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <DollarSign className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={
                  formData.precio_servicio === 0 ? "" : formatNumberWithSeparators(formData.precio_servicio)
                }
                onBlur={(e) => {
                  if (e.target.value === "") {
                    setFormData({
                      ...formData,
                      precio_servicio: 0,
                    });
                  }
                }}
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/\./g, "");
                  setFormData({
                    ...formData,
                    precio_servicio: numericValue === "" ? 0 : Math.max(0, parseInt(numericValue) || 0),
                  });
                }}
                className="w-full bg-transparent py-1 pl-9 text-sm sm:text-base border border-gray-300 rounded-full h-[40px] focus:outline-none focus:border-black"
                placeholder="0"
              />
            </div>
          </div>

          {/* Método de pago */}
          <PaymentMethodSelect
            value={formData.metodo_pago}
            onChange={(value) =>
              setFormData({ ...formData, metodo_pago: value })
            }
            label="Método de pago"
            placeholder="Seleccionar método de pago"
            required={true}
            className="w-full"
          />

          {/* IVA */}
          <div>
            <Label className="block text-xs font-medium text-gray-500 mb-1">
              Impuesto IVA (20%)
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <Coins className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={formData.iva === 0 ? "" : formatNumberWithSeparators(formData.iva)}
                onChange={(e) => {
                  if (formData.metodo_pago === "tarjeta") {
                    const numericValue = e.target.value.replace(/\./g, "");
                    setFormData({ ...formData, iva: numericValue === "" ? 0 : Math.max(0, parseInt(numericValue) || 0) });
                  }
                }}
                className="w-full bg-transparent py-1 pl-9 text-sm sm:text-base border border-gray-300 rounded-full h-[40px] focus:outline-none focus:border-black"
                placeholder="0"
                disabled={formData.metodo_pago !== "tarjeta"}
              />
            </div>
          </div>
        </div>

        {/* Total y botón centrados */}
        <div className="flex flex-col items-center justify-center mt-6 sm:mt-8 mb-4">
          <span className="uppercase text-xs sm:text-sm text-gray-400 tracking-widest font-semibold mb-1">
            TOTAL
          </span>
          <span className="text-lg sm:text-xl lg:text-2xl font-extrabold text-gray-900 mb-4">
            <span className="ml-1">{formatCurrencyNoDecimals(total)}</span>
          </span>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={loading}
            className="gap-2 rounded-full bg-black text-white font-bold hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2 w-full sm:w-auto"
          >
            <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
            Generar Servicio
          </Button>
        </div>
      </div>


      {/* Modal de confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 sm:p-8 shadow-lg max-w-md mx-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
              Confirmar creación de servicio
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              ¿Deseas crear el servicio y comenzar el tiempo?
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
                className="px-4 sm:px-6 py-2 text-sm sm:text-base"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={confirmAndSubmit}
                disabled={loading}
                className="gap-2 bg-black text-white hover:bg-gray-800 px-4 sm:px-6 py-2 text-sm sm:text-base"
              >
                <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
