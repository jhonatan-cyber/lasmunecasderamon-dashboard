"use client";

import { useState, useEffect } from "react";
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
import CustomerSelect from "@/components/ui/CustomerSelect";
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
    }
  }, [habitaciones]);
  const { startTimer } = useTimer();

  // Form data
  const [formData, setFormData] = useState({
    cliente_id: null as number | null,
    usuarios: [] as number[],
    habitacion_id: null as number | null,
    precio_habitacion: 0,
    tiempo_habitacion: 0,
    precio_servicio: 0,
    metodo_pago: "",
    iva: 0,
    tiempo: 0,
  });

  // Calculated values
  const [precioHabitacion, setPrecioHabitacion] = useState(0);
  const [tiempoHabitacion, setTiempoHabitacion] = useState(0);
  const [subTotal, setSubTotal] = useState(0);
  const [total, setTotal] = useState(0);

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
    const nuevoSubTotal = formData.precio_servicio; // Subtotal es igual al precio de servicio
    const nuevoTotal = nuevoSubTotal + precioHabitacion + formData.iva; // Total = subtotal + precio_habitacion + iva
    setSubTotal(nuevoSubTotal);
    setTotal(nuevoTotal);
  }, [formData.precio_servicio, precioHabitacion, formData.iva]);

  // Update habitacion data when selected
  useEffect(() => {
    if (formData.habitacion_id) {
      const habitacion = habitaciones.find(
        (h) => (h.id_habitacion || h.id) === formData.habitacion_id
      );
      if (habitacion) {
        const precio = habitacion.precio || habitacion.price || 0;
        const tiempo = habitacion.tiempo || habitacion.time || 0;
        // Log solo en desarrollo para debug
        if (process.env.NODE_ENV === "development") {
          console.log("Habitación seleccionada:", habitacion);
          console.log("Tiempo de habitación:", tiempo);
        }
        setPrecioHabitacion(precio);
        setTiempoHabitacion(tiempo);
        setFormData((prev) => ({ ...prev, tiempo: tiempo }));
      }
    } else {
      setPrecioHabitacion(0);
      setTiempoHabitacion(0);
    }
  }, [formData.habitacion_id, habitaciones]);

  // Reset IVA to 0 when payment method is not "tarjeta"
  useEffect(() => {
    if (formData.metodo_pago !== "tarjeta") {
      setFormData((prev) => ({ ...prev, iva: 0 }));
    }
  }, [formData.metodo_pago]);

  const handleSubmit = async () => {
    if (formData.usuarios.length === 0) {
      toast.error("Selecciona al menos una anfitriona");
      return;
    }
    if (!formData.habitacion_id) {
      toast.error("Selecciona una habitación");
      return;
    }
    if (formData.precio_servicio <= 0) {
      toast.error("El precio de servicio debe ser mayor a 0");
      return;
    }
    if (!formData.metodo_pago) {
      toast.error("Selecciona un método de pago");
      return;
    }

    setLoading(true);
    try {
      const servicioData = {
        codigo: generateCode(),
        cliente_id: formData.cliente_id || 1,
        habitacion_id: formData.habitacion_id,
        precio_habitacion: precioHabitacion,
        precio_servicio: formData.precio_servicio,
        iva: formData.iva,
        sub_total: subTotal, // Es igual al precio de servicio
        total: total, // Subtotal + precio_habitacion + iva
        tiempo: formData.tiempo,
        metodo_pago: formData.metodo_pago,
        usuarios: formData.usuarios, // Para la tabla detalle_servicios
      };

      // Log solo en desarrollo para debug
      if (process.env.NODE_ENV === "development") {
        console.log("Datos del servicio a enviar:", servicioData);
      }

      const response = await fetch("/api/servicios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(servicioData),
      });

      const data = await response.json();

      if (data.success) {
        // Iniciar el timer para el nuevo servicio
        const habitacion = habitaciones.find(
          (h) => (h.id_habitacion || h.id) === formData.habitacion_id
        );

        if (habitacion) {
          startTimer(
            data.data.id_servicio, // El backend devuelve el ID en data.id_servicio
            formData.habitacion_id!,
            habitacion.nombre || habitacion.name || habitacion.numero || "N/A",
            formData.tiempo,
            servicioData.codigo, // Usar el código que generamos
            clientes.find((c) => c.id_cliente === formData.cliente_id)
              ?.nombre || ""
          );
        } else {
          console.error(
            "No se encontró la habitación:",
            formData.habitacion_id
          );
        }

        // Mostrar información de comisiones creadas y caja
        const comisionesInfo =
          data.data.comisiones_creadas > 0
            ? ` y ${data.data.comisiones_creadas} comisión(es) registrada(s)`
            : "";

        const cajaInfo = data.data.caja_actualizada
          ? " - Caja actualizada"
          : "";

        toast.success(
          `Servicio creado exitosamente${comisionesInfo}${cajaInfo}`
        );
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
          onClick={() => router.back()}
          type="button"
        >
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          Atrás
        </Button>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 bg-white mx-4 sm:mx-6 lg:mx-8 space-y-4 sm:space-y-6 shadow-md rounded-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Cliente */}
          <CustomerSelect
            clientes={clientes}
            value={
              formData.cliente_id === null ? "" : formData.cliente_id.toString()
            }
            onChange={(value) =>
              setFormData({
                ...formData,
                cliente_id: value ? parseInt(value) : null,
              })
            }
            label="Cliente"
            placeholder="Seleccionar cliente"
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
            maxSelection={10}
            className="w-full"
          />

          {/* Habitación */}
          <RoomSelect
            habitaciones={habitaciones}
            value={formData.habitacion_id?.toString() || ""}
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

          {/* Precio de servicio */}
          <div>
            <Label className="block text-xs font-medium text-gray-500 mb-1">
              Precio de servicio
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <DollarSign className="w-4 h-4" />
              </span>
              <Input
                type="number"
                value={
                  formData.precio_servicio === 0 ? "" : formData.precio_servicio
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    precio_servicio: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full bg-transparent py-1 pl-9 text-sm sm:text-base"
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
              Impuesto IVA
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <Coins className="w-4 h-4" />
              </span>
              <Input
                type="number"
                value={formData.iva === 0 ? "" : formData.iva}
                onChange={(e) =>
                  setFormData({ ...formData, iva: parseInt(e.target.value) || 0 })
                }
                className="w-full bg-transparent py-1 pl-9 text-sm sm:text-base"
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
    </>
  );
}
