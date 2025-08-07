"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCreditCard,
  faCoins,
  faMoneyBill1Wave,
  faHotel,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import SearchInput from "@/components/ui/SearchInput";
import { toast } from "sonner";

import { formatCurrencyNoDecimals } from "@/lib/formatters";

function formatFecha(fechaStr?: string) {
  if (!fechaStr) return "-";
  if (fechaStr.includes("T")) {
    const date = new Date(fechaStr);
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  }
  const [fecha] = fechaStr.split(" ");
  if (!fecha) return "-";
  const [y, m, d] = fecha.split("-");
  return `${d}-${m}-${y}`;
}

function formatHora(fechaStr?: string) {
  if (!fechaStr) return "-";
  if (fechaStr.includes("T")) {
    const date = new Date(fechaStr);
    const h = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${h}:${min}`;
  }
  const parts = fechaStr.split(" ");
  if (parts[1]) {
    const [h, m] = parts[1].split(":");
    return `${h}:${m}`;
  }
  return "-";
}

interface CobrarCuentaModalProps {
  open: boolean;
  onClose: () => void;
  cuenta: any;
  onCuentaCobrada?: () => void;
}

export default function CobrarCuentaModal({
  open,
  onClose,
  cuenta,
  onCuentaCobrada,
}: CobrarCuentaModalProps) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [searchRoom, setSearchRoom] = useState("");
  const [isCobrando, setIsCobrando] = useState(false);
  const [metodoPago, setMetodoPago] = useState("");
  const [propina, setPropina] = useState(0);
  const [habitacionId, setHabitacionId] = useState("");
  const [isPropinaFocused, setIsPropinaFocused] = useState(false);
  const [propinaInputValue, setPropinaInputValue] = useState("");
  const [showMetodoPagoError, setShowMetodoPagoError] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/rooms")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setRooms(data.data);
      });
  }, [open]);

  useEffect(() => {
    if (!open) {
      setMetodoPago("");
      setPropina(0);
      setHabitacionId("");
      setIsPropinaFocused(false);
      setPropinaInputValue("");
      setShowMetodoPagoError(false);
      setIsCobrando(false);
    }
  }, [open]);

  useEffect(() => {
    if (metodoPago && showMetodoPagoError) {
      setShowMetodoPagoError(false);
    }
  }, [metodoPago, showMetodoPagoError]);

  const isChampagneProduct = (producto: any) => {
    const categoria = (producto?.categoria || "").toLowerCase();
    return (
      categoria.includes("champaña") ||
      categoria.includes("shampaña") ||
      categoria.includes("champagne")
    );
  };

  // Procesar anfitrionas desde la cuenta
  const anfitrionasDeLaCuenta = cuenta?.anfitrionas_generales || "";
  const anfitrionasArray = anfitrionasDeLaCuenta
    ? anfitrionasDeLaCuenta.split(", ").filter((a: string) => a.trim() !== "")
    : [];

  // Debug: Mostrar datos reales de la cuenta
  console.log("=== DATOS REALES DE LA CUENTA ===");
  console.log("Cuenta completa:", cuenta);
  console.log("ID:", cuenta?.id_cuenta);
  console.log("Código:", cuenta?.codigo);
  console.log("Cliente:", cuenta?.cliente_nombre);
  console.log("Sub Total:", cuenta?.sub_total);
  console.log("Total:", cuenta?.total);
  console.log("Total Comisión:", cuenta?.total_comision);
  console.log("Anfitrionas IDs:", cuenta?.anfitrionas_ids);
  console.log("Anfitrionas Generales:", cuenta?.anfitrionas_generales);
  console.log("Habitación:", cuenta?.habitacion_numero);
  console.log("Fecha:", cuenta?.fecha_crea);
  console.log("Detalles:", cuenta?.detalles);
  console.log("==================================");
  const extra = cuenta?.total - cuenta?.sub_total;
  const handleCobrarCuenta = async () => {
    setShowMetodoPagoError(true);

    if (!metodoPago) {
      toast.error("Selecciona un método de pago");
      return;
    }

    if (!cuenta) {
      toast.error("No hay datos de la cuenta");
      return;
    }

    setIsCobrando(true);
    try {
      const totalFinal = (cuenta?.total || 0) + propina;

      const cobroData = {
        cuenta_id: cuenta?.id_cuenta,
        metodo_pago: metodoPago as "efectivo" | "tarjeta" | "transferencia",
        propina: propina,
        total_cobrado: totalFinal,
        habitacion_id: habitacionId ? parseInt(habitacionId) : null,
      };

      console.log("=== DATOS PARA COBRO ===");
      console.log("Cuenta ID:", cuenta?.id_cuenta);
      console.log("Sub Total de la cuenta:", cuenta?.sub_total);
      console.log("Total de la cuenta:", cuenta?.total);
      console.log("Propina agregada:", propina);
      console.log("Total Final calculado:", totalFinal);
      console.log("Método de pago:", metodoPago);
      console.log("Habitación seleccionada:", habitacionId);
      console.log("Datos completos para cobro:", cobroData);
      console.log("==========================");

      const response = await fetch(`/api/cuentas/${cuenta?.id_cuenta}/cobrar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cobroData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al cobrar la cuenta");
      }

             const result = await response.json();

       // Registrar la venta usando el endpoint de ventas
       try {
         const ventaData = {
           total: totalFinal,
           sub_total: cuenta?.sub_total || 0,
           total_comision: cuenta?.total_comision || 0,
           cliente_id: cuenta?.cliente_id,
           habitacion_id: habitacionId ? parseInt(habitacionId) : null,
           metodo_pago: metodoPago as "efectivo" | "tarjeta" | "transferencia",
           propina: propina,
           detalles: cuenta?.detalles?.map((detalle: any) => ({
             producto_id: detalle.id_producto,
             precio: detalle.precio,
             cantidad: detalle.cantidad,
             sub_total: detalle.sub_total,
             comision: detalle.comision
           })) || [],
           usuarios: cuenta?.usuarios?.map((usuario: any) => usuario.usuario_id) || []
         };

         console.log("=== DATOS PARA REGISTRAR VENTA ===");
         console.log("ventaData:", ventaData);
         console.log("================================");

         const ventaResponse = await fetch("/api/sales", {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
           },
           body: JSON.stringify(ventaData),
         });

         if (!ventaResponse.ok) {
           const ventaErrorData = await ventaResponse.json();
           console.error("Error al registrar venta:", ventaErrorData);
           // No lanzar error aquí, solo log para debugging
                   } else {
            const ventaResult = await ventaResponse.json();
            console.log("Venta registrada exitosamente:", ventaResult);
            toast.success("Venta registrada en el sistema");
            
            // Registrar propina usando el ID de la venta
            if (propina > 0) {
              try {
                const resPropina = await fetch("/api/tips", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                                     body: JSON.stringify({
                     venta_id: ventaResult?.id_venta || ventaResult?.id,
                     monto: propina,
                   }),
                });

                const dataPropina = await resPropina.json();

                if (dataPropina.success) {
                  toast.success(
                    `Propina de ${formatCurrencyNoDecimals(
                      propina
                    )} registrada y distribuida entre ${
                      dataPropina.data.usuarios_distribucion
                    } usuarios`
                  );
                } else {
                  toast.error(
                    "Error al registrar la propina: " + dataPropina.message
                  );
                }
              } catch (error) {
                console.error("Error al registrar propina:", error);
                toast.error("Error al registrar la propina");
              }
            }
          }
               } catch (ventaError) {
          console.error("Error al registrar venta:", ventaError);
          // No lanzar error aquí, solo log para debugging
        }

             // Nota: No se activa el temporizador al cobrar cuenta
       // El temporizador solo se activa al crear una nueva cuenta

      toast.success("Cuenta cobrada exitosamente");
      onClose();
      onCuentaCobrada?.();
    } catch (error) {
      console.error("Error al cobrar cuenta:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al cobrar la cuenta"
      );
    } finally {
      setIsCobrando(false);
    }
  };

  const habitacionesActivas = rooms.filter((room) => room.status === 1);
  const habitacionesFiltradas = habitacionesActivas.filter((room) =>
    room.name.toLowerCase().includes(searchRoom.toLowerCase())
  );

  const hasChampagne = cuenta?.detalles?.some((item: any) => {
    const cat = (item.categoria || "").toLowerCase();
    return (
      cat.includes("champaña") ||
      cat.includes("shampaña") ||
      cat.includes("champagne")
    );
  });

  if (!cuenta || !open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl p-6 bg-white rounded-xl shadow-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold mb-4 tracking-tight">
            Cobrar Cuenta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 p-6 rounded-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-b pb-6 rounded-xl">
            <div className="space-y-2 text-sm text-gray-700">
              <div>
                <span className="font-medium">
                  <b>Código:</b>
                </span>{" "}
                <span className="font-normal">{cuenta?.codigo || "-"}</span>
              </div>
              <div>
                <span className="font-medium">
                  <b>Cliente:</b>
                </span>{" "}
                <span className="font-normal">
                  {cuenta?.cliente_nombre || "-"}
                </span>
              </div>
              <div>
                <span className="font-medium">
                  <b>Fecha:</b>
                </span>{" "}
                <span className="font-normal">
                  {formatFecha(cuenta?.fecha_crea)}
                </span>
              </div>
              <div>
                <span className="font-medium">
                  <b>Hora:</b>
                </span>{" "}
                <span className="font-normal">
                  {formatHora(cuenta?.fecha_crea)}
                </span>
              </div>
              <div>
                <span className="font-medium">
                  <b>Anfitriona(s):</b>
                </span>{" "}
                <span className="font-normal">
                  {cuenta?.anfitrionas_generales || "Sin anfitrionas"}
                </span>
              </div>
              <div>
                <span className="font-medium">
                  <b>Habitación:</b>
                </span>{" "}
                <span className="font-normal">
                  {cuenta?.habitacion_numero || "Sin habitación"}
                </span>
              </div>
            </div>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <Label className="block text-xs font-medium text-gray-500 mb-1">
                  Método de pago <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <FontAwesomeIcon
                    icon={faCreditCard}
                    className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                  <Select value={metodoPago} onValueChange={setMetodoPago}>
                    <SelectTrigger
                      className={`w-full pl-8 border focus:ring-0 focus:border-black bg-transparent py-1 text-center text-sm text-gray-500 rounded-full ${
                        showMetodoPagoError && !metodoPago
                          ? "border-red-300"
                          : "border-gray-300"
                      }`}
                    >
                      <SelectValue placeholder="Seleccione un método de pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">Efectivo</SelectItem>
                      <SelectItem value="tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="transferencia">
                        Transferencia
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {showMetodoPagoError && !metodoPago && (
                  <div className="text-xs text-red-500 mt-1">
                    ⚠️ El método de pago es obligatorio
                  </div>
                )}
              </div>
              {hasChampagne && (
                <div>
                  <Label className="block text-xs font-medium text-gray-500 mb-1">
                    Habitación
                  </Label>
                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faHotel}
                      className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
                    />
                    <Select
                      value={habitacionId}
                      onValueChange={setHabitacionId}
                    >
                      <SelectTrigger className="w-full pl-8 border border-gray-300 focus:ring-0 focus:border-black bg-transparent py-1">
                        <SelectValue placeholder="Seleccione una opción" />
                      </SelectTrigger>
                      <SelectContent
                        style={{ maxHeight: 220, overflowY: "auto" }}
                      >
                        <div className="px-2 py-1">
                          <SearchInput
                            value={searchRoom}
                            onChange={setSearchRoom}
                            placeholder="Buscar habitación..."
                            className="w-full mb-2"
                          />
                        </div>
                        {habitacionesFiltradas.length > 0 &&
                          habitacionesFiltradas.map((room) => (
                            <SelectItem key={room.id} value={String(room.id)}>
                              {room.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                      {habitacionesFiltradas.length === 0 && (
                        <div className="text-xs text-gray-400 mt-2">
                          No hay habitaciones activas
                        </div>
                      )}
                    </Select>
                  </div>
                </div>
              )}

              <div>
                <Label className="block text-xs font-medium text-gray-500 mb-1">
                  Propina
                </Label>
                <div className="relative">
                  <FontAwesomeIcon
                    icon={faCoins}
                    className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                  <Input
                    className="w-full  pl-8 border border-gray-300 focus:ring-0 focus:border-gray-300 bg-transparent py-1"
                    placeholder="Propina"
                    type="number"
                    value={isPropinaFocused ? propinaInputValue : propina || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPropinaInputValue(value);
                      if (value === "") {
                        setPropina(0);
                      } else {
                        setPropina(Number(value) || 0);
                      }
                    }}
                    onFocus={() => {
                      setIsPropinaFocused(true);
                      setPropinaInputValue("");
                    }}
                    onBlur={() => {
                      setIsPropinaFocused(false);
                      setPropinaInputValue("");
                    }}
                  />
                </div>
              </div>
              <div>
                <Label className="block text-xs font-medium text-gray-500 mb-1">
                  Total Comisión
                </Label>
                <div className="relative ">
                  <FontAwesomeIcon
                    icon={faMoneyBill1Wave}
                    className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                  <Input
                    className="w-full pl-8 border border-gray-300 focus:ring-0 focus:border-gray-300 bg-transparent py-1 font-semibold text-black"
                    value={formatCurrencyNoDecimals(
                      cuenta?.total_comision || 0
                    )}
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-separate border-spacing-y-3">
              <thead>
                <tr>
                  <th className="text-center font-medium text-gray-500 pb-3">
                    Producto
                  </th>
                  <th className="text-center font-medium text-gray-500 pb-3">
                    Cantidad
                  </th>
                  <th className="text-center font-medium text-gray-500 pb-3">
                    Precio
                  </th>
                  <th className="text-center font-medium text-gray-500 pb-3">
                    Comisión
                  </th>
                  <th className="text-center font-medium text-gray-500 pb-3">
                    Sub Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {cuenta?.detalles?.map((item: any, idx: number) => (
                  <tr key={`${item.id_producto}-${idx}`} className="bg-white">
                    <td className="py-2 pr-4 text-center">{item.producto}</td>
                    <td className="py-2 pr-4 text-center">{item.cantidad}</td>
                    <td className="py-2 pr-4 text-center">
                      {formatCurrencyNoDecimals(item.precio)}
                    </td>
                    <td className="py-2 pr-4 text-center">
                      {formatCurrencyNoDecimals(item.comision)}
                    </td>
                    <td className="py-2 pr-4 text-center">
                      {formatCurrencyNoDecimals(item.sub_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex justify-end">
              <div className="text-sm font-semibold text-gray-800">
                SUBTOTAL: {formatCurrencyNoDecimals(cuenta?.sub_total || 0)}
                {extra > 0 && (
                  <div className="text-sm text-orange-600 font-normal">
                    + Recargo anfitrionas: {formatCurrencyNoDecimals(extra)}
                  </div>
                )}
                {propina > 0 && (
                  <div className="text-sm text-blue-600 font-normal">
                    + Propina: {formatCurrencyNoDecimals(propina)}
                  </div>
                )}
                <div className="text-md font-bold text-black">
                  TOTAL FINAL:{" "}
                  {formatCurrencyNoDecimals((cuenta?.total || 0) + propina)}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-8">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full bg-black text-white hover:scale-105 transition-all duration-200"
              onClick={handleCobrarCuenta}
              disabled={isCobrando}
            >
              {isCobrando ? "Cobrando..." : "Cobrar Cuenta"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="rounded-full  hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white"
              onClick={onClose}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
