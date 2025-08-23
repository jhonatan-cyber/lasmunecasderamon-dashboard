"use client";

import { Bell, User, ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { showSuccessToast, showErrorToast } from "@/lib/toastUtils";
import { useRouter } from "next/navigation";
import useOrders from "@/hooks/useOrders";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useEffect, useState, useRef } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useCashRegisterStatus } from "@/hooks/useCashRegisterStatus";
import { toast } from "sonner";

import OrderDetailModal from "@/components/orders/OrderDetailModal";
import { CodigoVerificacionHeader } from "@/components/dashboard/CodigoVerificacionHeader";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";

export function Header() {
  const router = useRouter();
  const { orders, refetch, orderDetail, fetchOrderDetail, isDetailLoading, detailError } = useOrders();
  const { user, loading: userLoading } = useCurrentUser();
  const { toggleSidebar } = useSidebar();
  const { hasPermission } = useUserPermissions();
  const { hasOpenCaja } = useCashRegisterStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedOrderCode, setSelectedOrderCode] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  // Verificar si el usuario es anfitriona
  const isAnfitriona = user?.role?.toLowerCase() === 'anfitriona';
  const isGarzon = user?.role?.toLowerCase() === 'garzon';
  


  // Habilitar audio cuando el usuario interactúe
  const enableAudio = () => {
    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          audioRef.current!.pause();
          audioRef.current!.currentTime = 0;
          setAudioEnabled(true);
          console.log("Audio habilitado");
        })
        .catch((error) => {
          console.log("No se pudo habilitar el audio:", error.message);
        });
    }
  };

  // Habilitar audio en la primera interacción del usuario
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!audioEnabled) {
        enableAudio();
        // Remover los event listeners después de la primera interacción
        document.removeEventListener("click", handleUserInteraction);
        document.removeEventListener("keydown", handleUserInteraction);
        document.removeEventListener("touchstart", handleUserInteraction);
      }
    };

    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("keydown", handleUserInteraction);
    document.addEventListener("touchstart", handleUserInteraction);

    return () => {
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
      document.removeEventListener("touchstart", handleUserInteraction);
    };
  }, [audioEnabled]);

  useEffect(() => {
    setPendingCount(orders.filter((o: any) => String(o.estado) === "1").length);
  }, [orders]);



  async function handleLogout() {
    try {
      const res = await fetch("/api/logout", { method: "POST" });
      if (res.ok) {
        showSuccessToast("Sesión cerrada exitosamente");
        setTimeout(() => {
          router.replace("/login");
        }, 3000);
      } else {
        showErrorToast("No se pudo cerrar la sesión");
      }
    } catch {
      showErrorToast("Error de red al cerrar sesión");
    }
  }



  const pendingOrders = orders.filter((o: any) => String(o.estado) === "1");

  const handleOrderClick = (orderId: number) => {
    // Verificar si tiene permiso para procesar pedidos
    if (!hasPermission('pedidos', 'procesar')) {
      toast.error('No tienes permisos para procesar pedidos');
      setShowDropdown(false);
      return;
    }

    // Verificar si hay caja abierta para procesar pedidos
    if (!hasOpenCaja) {
      toast.error('No se puede procesar pedidos sin caja abierta. Por favor, abra una caja primero.');
      setShowDropdown(false);
      return;
    }
    
    const order = orders.find((o: any) => o.id_pedido === orderId);
    setSelectedOrderId(orderId);
    setSelectedOrderCode(order?.codigo || "");
    setModalOpen(true);
    setShowDropdown(false);
    fetchOrderDetail(orderId);
  };

  // Escuchar evento para abrir modal desde notificación
  useEffect(() => {
    const handleOpenOrderModal = (event: CustomEvent) => {
      // Verificar si tiene permiso para procesar pedidos
      if (!hasPermission('orders', 'process')) {
        toast.error('No tienes permisos para procesar pedidos');
        return;
      }

      // Verificar si hay caja abierta para procesar pedidos
      if (!hasOpenCaja) {
        toast.error('No se puede procesar pedidos sin caja abierta. Por favor, abra una caja primero.');
        return;
      }
      
      const { orderId } = event.detail;
      const order = orders.find((o: any) => o.id_pedido === orderId);
      setSelectedOrderId(orderId);
      setSelectedOrderCode(order?.codigo || "");
      setModalOpen(true);
      fetchOrderDetail(orderId);
    };

    window.addEventListener('openOrderModal', handleOpenOrderModal as EventListener);
    
    return () => {
      window.removeEventListener('openOrderModal', handleOpenOrderModal as EventListener);
    };
  }, [fetchOrderDetail, orders, hasOpenCaja, hasPermission]);

  // Escuchar evento para actualizar contador de pedidos pendientes
  useEffect(() => {
            const handleUpdatePendingOrders = () => {
          refetch(); // Recargar los pedidos para obtener el contador actualizado
        };

    window.addEventListener('updatePendingOrders', handleUpdatePendingOrders);
    
    // También escuchar eventos de notificaciones SSE
            const handleSSENotification = () => {
          refetch();
        };

    window.addEventListener('updatePendingOrders', handleSSENotification);
    
    return () => {
      window.removeEventListener('updatePendingOrders', handleUpdatePendingOrders);
      window.removeEventListener('updatePendingOrders', handleSSENotification);
    };
  }, [refetch]);



  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedOrderId(null);
    setSelectedOrderCode("");
  };

  return (
    <header className="h-16 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-4 flex-1">
        {/* Botón hamburguesa para móviles */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-neutral-800"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        {/* Espacio para el logo o título */}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <ThemeSwitcher />
        <CodigoVerificacionHeader userRole={user?.role} />
        
        {/* Ocultar campanita de notificaciones para anfitrionas */}
        {!isAnfitriona && !isGarzon && (
          <DropdownMenu open={showDropdown} onOpenChange={setShowDropdown}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className={`h-5 w-5 bell-icon ${pendingCount > 0 ? 'bell-ring' : ''}`} />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center badge-blink">
                    {pendingCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-80 max-h-96 overflow-y-auto"
            >
              <DropdownMenuLabel>Pedidos Pendientes</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {pendingOrders.length === 0 ? (
                <div className="text-xs text-gray-400 px-4 py-2">
                  No hay pedidos pendientes
                </div>
              ) : (
                pendingOrders.map((order: any) => (
                  <DropdownMenuItem
                    key={order.id_pedido}
                    className="flex flex-col items-start gap-1 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleOrderClick(order.id_pedido)}
                  >
                    <div className="flex justify-between w-full">
                      <span className="font-semibold text-sm">
                        {order.codigo}
                      </span>
                      <span className="text-xs text-gray-500">
                        {order.fecha_crea ? order.fecha_crea.slice(11, 16) : ""}
                      </span>
                    </div>
                    <div className="text-xs text-gray-700">{order.cliente}</div>
                    <div className="text-xs text-gray-500">
                      Total: ${order.total}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <audio ref={audioRef} src="/notification.mp3" preload="auto" />

        {modalOpen && selectedOrderId && (
          <OrderDetailModal
            open={modalOpen}
            onClose={handleCloseModal}
            detail={orderDetail}
            isLoading={isDetailLoading}
            error={detailError}
            orderId={selectedOrderId}
            orderCode={selectedOrderCode}
            onOrderStatusChange={refetch}
          />
        )}

        {!userLoading && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 sm:px-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={user?.foto ? `/img/users/${user.foto}` : "/img/users/default.png"} 
                    alt={user ? `${user.name} ${user.lastName}` : "Usuario"}
                  />
                  <AvatarFallback>
                    {user ? `${user.name?.[0] || ''}${user.lastName?.[0] || ''}` : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium">
                    {user ? `${user.name} ${user.lastName}` : "Usuario"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.role || "Sin rol"}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem>Configuración</DropdownMenuItem>
              <DropdownMenuItem>Soporte</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
