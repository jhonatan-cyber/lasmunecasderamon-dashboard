"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faSearch,
  faGlassCheers,
  faUsers,
  faCoins,
  faShoppingCart,
  faTrash,
  faPlus,
  faMinus,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

import { useSales } from "@/hooks/useSales";
import { toast } from "sonner";
import { formatCurrencyNoDecimals } from "@/lib/formatters";
import SaleProductModal from "@/components/sales/SaleProductModal";
import { useRef } from "react";
import CustomerSelect from "@/components/ui/CustomerSelect";
import HostessSelect from "@/components/ui/HostessSelect";
import CategoryCardList from "@/components/ui/CategoryCardList";
import RoomSelect from "@/components/ui/RoomSelect";
import PaymentMethodSelect from "@/components/ui/PaymentMethodSelect";
import { CajaStatusCheck } from "@/components/sales/CajaStatusCheck";
import { useTimer } from "@/contexts/TimerContext";

export default function NewSale() {
  const router = useRouter();
  const { createVenta } = useSales();
  const { startTimer, getTimerByRoomId } = useTimer();

  // Estados del formulario
  const [selectedCliente, setSelectedCliente] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedCliente") || "";
    }
    return "";
  });
  const [selectedAnfitrionas, setSelectedAnfitrionas] = useState<string[]>(
    () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("selectedAnfitrionas");
        return saved ? JSON.parse(saved) : [];
      }
      return [];
    }
  );
  const [selectedHabitacion, setSelectedHabitacion] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("selectedHabitacion") || "";
    }
    return "";
  });
  const [metodoPago, setMetodoPago] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("metodoPago") || "";
    }
    return "";
  });
  const [propina, setPropina] = useState(() => {
    if (typeof window !== "undefined") {
      return Number(localStorage.getItem("propina")) || 0;
    }
    return 0;
  });
  const [productos, setProductos] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("productos");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Estado para almacenar información de la habitación seleccionada
  const [selectedRoomInfo, setSelectedRoomInfo] = useState<any>(null);

  // Efecto para persistir cambios en localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedCliente", selectedCliente);
      localStorage.setItem(
        "selectedAnfitrionas",
        JSON.stringify(selectedAnfitrionas)
      );
      localStorage.setItem("selectedHabitacion", selectedHabitacion);
      localStorage.setItem("metodoPago", metodoPago);
      localStorage.setItem("propina", propina.toString());
      localStorage.setItem("productos", JSON.stringify(productos));
    }
  }, [
    selectedCliente,
    selectedAnfitrionas,
    selectedHabitacion,
    metodoPago,
    propina,
    productos,
  ]);

  // Efecto para limpiar localStorage al montar el componente
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("selectedCliente");
        localStorage.removeItem("selectedAnfitrionas");
        localStorage.removeItem("selectedHabitacion");
        localStorage.removeItem("metodoPago");
        localStorage.removeItem("propina");
        localStorage.removeItem("productos");
      }
    };
  }, []);

  // Función para manejar el cambio de habitación
  const handleHabitacionChange = async (habitacionId: string) => {
    if (!habitacionId) {
      setSelectedHabitacion("");
      setSelectedRoomInfo(null);
      return;
    }

    try {
      // Obtener información de la habitación
      const res = await fetch(`/api/rooms/${habitacionId}`);
      const data = await res.json();

      if (data.success) {
        const roomInfo = data.data;
        setSelectedRoomInfo(roomInfo);
        setSelectedHabitacion(habitacionId);
        toast.success(`Habitación ${roomInfo.name} seleccionada`);
      } else {
        toast.error("Error al obtener información de la habitación");
      }
    } catch (error) {
      console.error("Error al manejar cambio de habitación:", error);
      toast.error("Error al procesar la selección de habitación");
    }
  };

  // Estados de búsqueda
  const [searchProducto, setSearchProducto] = useState("");

  // Estados de datos
  const [clientes, setClientes] = useState<any[]>([]);
  const [anfitrionas, setAnfitrionas] = useState<any[]>([]);
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [categoriasConProductos, setCategoriasConProductos] = useState<any[]>(
    []
  );
  const [productosDisponibles, setProductosDisponibles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasOpenCaja, setHasOpenCaja] = useState<boolean | null>(null);

  // Estados del modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategoria, setModalCategoria] = useState<any>(null);
  const [productosCategoria, setProductosCategoria] = useState<any[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [cantidades, setCantidades] = useState<{ [key: string]: number }>({});

  // Estados de búsqueda en tiempo real
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Función para verificar si un producto es de champaña
  const isChampagneProduct = (producto: any) => {
    const categoria = (
      producto?.categoria ||
      producto?.category ||
      ""
    ).toLowerCase();
    return (
      categoria.includes("champaña") ||
      categoria.includes("shampaña") ||
      categoria.includes("champagne")
    );
  };

  // Buscar si hay algún producto de champaña (sin importar el precio)
  const hasChampagneProducts = Array.isArray(productos)
    ? productos.some(isChampagneProduct)
    : false;

  // Obtener el precio más alto de productos de champaña
  const maxChampagnePrice = Array.isArray(productos)
    ? Math.max(
        ...productos
          .filter(isChampagneProduct)
          .map((p) => Number(p.precio ?? p.price ?? 0))
      )
    : 0;

  // Determinar el máximo de anfitrionas permitidas según las reglas
  let maxAnfitrionas = 1; // Por defecto, máximo 1 anfitriona
  let anfitrionasIncluidas = 0; // Anfitrionas sin recargo
  let anfitrionasConRecargo = 0; // Anfitrionas con recargo de $40,000

  if (hasChampagneProducts) {
    if (maxChampagnePrice >= 240000) {
      // $240,000: 7 anfitrionas (5 incluidas + 2 con recargo)
      maxAnfitrionas = 7;
      anfitrionasIncluidas = 5;
      anfitrionasConRecargo = 2;
    } else if (maxChampagnePrice >= 200000) {
      // $200,000: 6 anfitrionas (4 incluidas + 2 con recargo)
      maxAnfitrionas = 6;
      anfitrionasIncluidas = 4;
      anfitrionasConRecargo = 2;
    } else if (maxChampagnePrice >= 160000) {
      // $160,000: 5 anfitrionas (3 incluidas + 2 con recargo)
      maxAnfitrionas = 5;
      anfitrionasIncluidas = 3;
      anfitrionasConRecargo = 2;
    } else if (maxChampagnePrice >= 120000) {
      // $120,000: 4 anfitrionas (2 incluidas + 2 con recargo)
      maxAnfitrionas = 4;
      anfitrionasIncluidas = 2;
      anfitrionasConRecargo = 2;
    } else {
      // Champaña con precio menor a $120,000: máximo 5 anfitrionas (sin recargo)
      maxAnfitrionas = 5;
      anfitrionasIncluidas = 5;
      anfitrionasConRecargo = 0;
    }
  }
  // Si no hay productos de champaña, se mantiene en 1

  // Calcular recargo por anfitrionas extra según el precio de champaña
  let anfitrionasExtra = 0;
  let recargoAnfitrionas = 0;
  if (
    hasChampagneProducts &&
    selectedAnfitrionas.length > anfitrionasIncluidas
  ) {
    anfitrionasExtra = selectedAnfitrionas.length - anfitrionasIncluidas;
    recargoAnfitrionas = anfitrionasExtra * 40000;
  }

  // Limpiar anfitrionas cuando se cambia la regla de champaña
  useEffect(() => {
    // Validar y ajustar la selección de anfitrionas según las reglas
    if (selectedAnfitrionas.length > maxAnfitrionas) {
      setSelectedAnfitrionas(selectedAnfitrionas.slice(0, maxAnfitrionas));

      // Mostrar mensaje específico según la regla aplicada
      if (!hasChampagneProducts) {
        toast.info(
          "Se ha limitado la selección a 1 anfitriona por productos sin champaña"
        );
      } else if (maxChampagnePrice >= 240000) {
        toast.info(
          "Se ha limitado la selección a 7 anfitrionas para champaña de $240,000+"
        );
      } else if (maxChampagnePrice >= 200000) {
        toast.info(
          "Se ha limitado la selección a 6 anfitrionas para champaña de $200,000+"
        );
      } else if (maxChampagnePrice >= 160000) {
        toast.info(
          "Se ha limitado la selección a 5 anfitrionas para champaña de $160,000+"
        );
      } else if (maxChampagnePrice >= 120000) {
        toast.info(
          "Se ha limitado la selección a 4 anfitrionas para champaña de $120,000+"
        );
      } else {
        toast.info(
          "Se ha limitado la selección a 5 anfitrionas para productos de champaña"
        );
      }
    }
  }, [
    hasChampagneProducts,
    maxChampagnePrice,
    selectedAnfitrionas.length,
    maxAnfitrionas,
  ]);

  // Limpiar habitación si deja de haber productos de champaña
  useEffect(() => {
    if (!hasChampagneProducts && selectedHabitacion) {
      setSelectedHabitacion("");
    }
  }, [hasChampagneProducts]);

  // Función para limpiar el filtro de búsqueda
  const handleClearSearch = () => {
    setSearchProducto("");
    setSearchResults([]);
    setSearchLoading(false);
  };

  // Función para obtener el conteo de productos por categoría
  const getProductCountByCategory = async (categoryId: number) => {
    try {
      const res = await fetch(`/api/products?category_id=${categoryId}`);
      const data = await res.json();
      return data.success ? data.data.length : 0;
    } catch {
      return 0;
    }
  };

  // Función para cargar categorías con conteo de productos
  const loadCategoriasConProductos = async (categoriasData: any[]) => {
    const categoriasConConteo = categoriasData.map((cat) => {
      // Usar total_products del endpoint o 0 si no existe
      const productCount = cat.total_products || 0;
      return {
        ...cat,
        productCount,
        // Asegurar que tenga los campos esperados por el componente
        id_categoria: cat.id,
        nombre: cat.name || cat.nombre,
        estado: cat.status,
      };
    });
    setCategoriasConProductos(categoriasConConteo);
  };

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar clientes
        const resClientes = await fetch("/api/clients");
        const dataClientes = await resClientes.json();
        setClientes(dataClientes);

        // Cargar anfitrionas
        const resAnfitrionas = await fetch("/api/users?anfitrionas=1");
        const dataAnfitrionas = await resAnfitrionas.json();
        if (dataAnfitrionas.success) {
          setAnfitrionas(dataAnfitrionas.data);
        }

        // Cargar habitaciones
        const resHabitaciones = await fetch("/api/rooms");
        const dataHabitaciones = await resHabitaciones.json();
        if (dataHabitaciones.success) {
          setHabitaciones(dataHabitaciones.data);
        }

        // Cargar categorías
        const resCategorias = await fetch("/api/categories");
        const dataCategorias = await resCategorias.json();
        if (dataCategorias.success) {
          setCategorias(dataCategorias.data);
          // Cargar categorías con conteo de productos
          await loadCategoriasConProductos(dataCategorias.data);
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
        toast.error("Error al cargar los datos iniciales");
      }
    };

    fetchData();
  }, []);

  // Búsqueda en tiempo real de productos
  useEffect(() => {
    if (!searchProducto) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/products/search?name=${encodeURIComponent(searchProducto)}`
        );
        const data = await res.json();
        if (data.success) setSearchResults(data.data);
        else setSearchResults([]);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchProducto]);

  // Filtrar datos
  const categoriasFiltradas = Array.isArray(categoriasConProductos)
    ? categoriasConProductos.filter(
        (cat) => cat?.estado === 1 && cat?.productCount > 1
      )
    : [];

  // Funciones para manejar productos
  const handleOpenCategoria = async (cat: any) => {
    setModalCategoria(cat);
    setModalOpen(true);
    setLoadingProductos(true);
    try {
      const res = await fetch(
        `/api/products?category_id=${cat.id_categoria || cat.id}`
      );
      const data = await res.json();
      if (data.success) setProductosCategoria(data.data);
      else setProductosCategoria([]);
    } catch {
      setProductosCategoria([]);
    } finally {
      setLoadingProductos(false);
    }
  };

  const handleCantidadChange = (id: string, value: string) => {
    const num = parseInt(value, 10);
    setCantidades((prev) => ({ ...prev, [id]: isNaN(num) ? 1 : num }));
  };

  const handleAddProducto = (producto: any) => {
    const cantidad = cantidades[producto?.id || producto?.id_producto] || 1;
    const nombre = producto.nombre || producto.name || "Sin nombre";
    const precio = producto.precio ?? producto.price ?? 0;
    // Normaliza la categoría para todos los casos posibles
    const categoria =
      producto.categoria && typeof producto.categoria === "string"
        ? producto.categoria
        : producto.categoria && producto.categoria.nombre
        ? producto.categoria.nombre
        : producto.category && typeof producto.category === "string"
        ? producto.category
        : producto.category && producto.category.nombre
        ? producto.category.nombre
        : "";
    const subtotal = precio * cantidad;

    const productoNormalizado = {
      ...producto,
      id: producto.id || producto.id_producto, // Asegura que siempre haya 'id'
      nombre,
      precio,
      categoria,
      comision: producto.comision ?? producto.commission ?? 0, // Normaliza la comisión
      cantidad,
      subtotal,
    };

    const productoExistente = Array.isArray(productos)
      ? productos.find((p) => p?.id === productoNormalizado.id)
      : null;

    if (productoExistente) {
      setProductos((prev) =>
        Array.isArray(prev)
          ? prev.map((p) =>
              p?.id === productoNormalizado.id
                ? {
                    ...p,
                    cantidad: (p?.cantidad || 0) + cantidad,
                    subtotal: precio * ((p?.cantidad || 0) + cantidad),
                  }
                : p
            )
          : []
      );
    } else {
      setProductos((prev) =>
        Array.isArray(prev)
          ? [...prev, productoNormalizado]
          : [productoNormalizado]
      );
    }
    setCantidades((prev) => ({
      ...prev,
      [productoNormalizado.id]: 1,
    }));
  };

  const handleRemoveProducto = (index: number) => {
    setProductos((prev) => {
      const newProductos = Array.isArray(prev)
        ? prev.filter((_, i) => i !== index)
        : [];

      // Si no quedan productos, limpiar selectores y propina
      if (newProductos.length === 0) {
        setSelectedCliente("");
        setSelectedAnfitrionas([]);
        setMetodoPago("");
        setPropina(0);
      }

      return newProductos;
    });
  };

  const handleCantidadChangeTable = (index: number, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      handleRemoveProducto(index);
      return;
    }

    setProductos((prev) => {
      const newProductos = Array.isArray(prev)
        ? prev.map((p, i) =>
            i === index
              ? {
                  ...p,
                  cantidad: nuevaCantidad,
                  subtotal: (p?.precio || p?.price || 0) * nuevaCantidad,
                }
              : p
          )
        : [];

      // Si no quedan productos, limpiar selectores y propina
      if (newProductos.length === 0) {
        setSelectedCliente("");
        setSelectedAnfitrionas([]);
        setMetodoPago("");
        setPropina(0);
      }

      return newProductos;
    });
  };

  // Calcular totales
  const subtotal = Array.isArray(productos)
    ? productos.reduce((acc, p) => acc + (p?.subtotal || 0), 0)
    : 0;
  const total = subtotal + propina + recargoAnfitrionas;

  // Generar venta
  const handleSubmit = async () => {
    if (!metodoPago || productos.length === 0) {
      toast.info("Completa todos los campos requeridos");
      return;
    }

    // Validar que si hay productos de champaña, las anfitrionas sean obligatorias
    if (
      hasChampagneProducts &&
      (!selectedAnfitrionas || selectedAnfitrionas.length === 0)
    ) {
      toast.info(
        "Para productos de champaña es obligatorio seleccionar al menos una anfitriona"
      );
      return;
    }

    // Validar regla de anfitrionas
    if (selectedAnfitrionas.length > maxAnfitrionas) {
      if (!hasChampagneProducts) {
        toast.info(
          "Para productos sin champaña solo puedes seleccionar 1 anfitriona máximo"
        );
      } else if (maxChampagnePrice >= 240000) {
        toast.info(
          "Para champaña de $240,000+ solo puedes seleccionar hasta 7 anfitrionas"
        );
      } else if (maxChampagnePrice >= 200000) {
        toast.info(
          "Para champaña de $200,000+ solo puedes seleccionar hasta 6 anfitrionas"
        );
      } else if (maxChampagnePrice >= 160000) {
        toast.info(
          "Para champaña de $160,000+ solo puedes seleccionar hasta 5 anfitrionas"
        );
      } else if (maxChampagnePrice >= 120000) {
        toast.info(
          "Para champaña de $120,000+ solo puedes seleccionar hasta 4 anfitrionas"
        );
      } else {
        toast.info(
          "Para productos de champaña solo puedes seleccionar hasta 5 anfitrionas"
        );
      }
      return;
    }

    setLoading(true);
    try {
      // Calcular el total de comisiones
      const total_comision = Array.isArray(productos)
        ? productos.reduce(
            (acc, p) => acc + ((p?.comision || 0) * (p?.cantidad || 1) + anfitrionasExtra * 20000),
            0
          )
        : 0;

      const ventaData = {
        cliente_id: selectedCliente ? parseInt(selectedCliente) : 1,
        ...(selectedHabitacion && {
          habitacion_id: parseInt(selectedHabitacion),
        }),
        metodo_pago: metodoPago as "efectivo" | "tarjeta" | "transferencia",
        propina: propina,
        sub_total: subtotal,
        total: total,
        total_comision: total_comision,
        detalles: Array.isArray(productos)
          ? productos.map((p) => ({
              producto_id: p?.id,
              precio: p?.precio || 0,
              comision: (p?.comision || 0) * (p?.cantidad || 1) + anfitrionasExtra * 20000,
              cantidad: p?.cantidad || 0,
              sub_total: p?.subtotal || 0,
            }))
          : [],
        usuarios: Array.isArray(selectedAnfitrionas)
          ? selectedAnfitrionas.map((id) => parseInt(id))
          : [],
      };

      const resultado = await createVenta(ventaData);
      console.log("=== RESULTADO CREATEVENTA ===");
      console.log("resultado:", resultado);
      console.log("resultado.id_venta:", resultado?.id_venta);
      console.log("resultado type:", typeof resultado);
      console.log("=============================");
      
             if (resultado && resultado.data) {
         // Registrar propina si hay un monto
         if (propina > 0) {
           if (!resultado.data.id_venta) {
             console.error("No se pudo obtener el ID de la venta");
             toast.error("Error: No se pudo obtener el ID de la venta para registrar la propina");
             return;
           }
           
           try {
             const resPropina = await fetch("/api/tips", {
               method: "POST",
               headers: {
                 "Content-Type": "application/json",
               },
               body: JSON.stringify({
                 venta_id: resultado.data.id_venta,
                 monto: propina,
               }),
             });

             const dataPropina = await resPropina.json();

             if (dataPropina.success) {
               toast.success(
                 `Propina de $${propina.toLocaleString()} registrada y distribuida entre ${
                   dataPropina.data.usuarios_distribucion
                 } usuarios`
               );
             } else {
               toast.error("Error al registrar la propina");
             }
           } catch (error) {
             console.error("Error al registrar propina:", error);
             toast.error("Error al registrar la propina.");
           }
         }

         // Cambiar estado de la habitación a ocupada (estado 2) si hay una habitación seleccionada
         if (selectedHabitacion && selectedRoomInfo) {
           try {
             const updateRes = await fetch(`/api/rooms/${selectedHabitacion}`, {
               method: "PATCH",
               headers: {
                 "Content-Type": "application/json",
               },
               body: JSON.stringify({ action: "occupy" }),
             });

             if (!updateRes.ok) {
               console.error("Error al actualizar estado de la habitación");
             }
           } catch (error) {
             console.error("Error al actualizar estado de la habitación:", error);
           }
         }

         // Iniciar temporizador si hay una habitación seleccionada
         if (selectedHabitacion && selectedRoomInfo) {
           // Verificar si ya existe un temporizador para esta habitación
           const existingTimer = getTimerByRoomId(Number(selectedHabitacion));
           if (existingTimer) {
             toast.info(
               `Ya existe un temporizador activo para ${selectedRoomInfo.name}`
             );
           } else {
             // Iniciar temporizador con la duración de la habitación
             startTimer(
               resultado.data?.id_venta || 0, // servicioId (usar id_venta para ventas)
               Number(selectedHabitacion), // roomId
               selectedRoomInfo.name, // roomName
               selectedRoomInfo.time || 60, // duration
               `VENTA_${resultado.data?.id_venta || Date.now()}`, // servicioCode (ID de venta único)
               'Cliente Venta' // clienteNombre (placeholder para ventas)
             );
             toast.success(
               `Temporizador iniciado para ${selectedRoomInfo.name}`
             );
           }
         }

        toast.success("Venta generada exitosamente");
        router.push("/sales");
      }
    } catch (error) {
      console.error("Error al crear venta:", error);
      toast.error("Error al generar la venta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Datos Ticket Venta
          </h2>
          <div className="uppercase text-xs tracking-widest text-gray-400 font-semibold mb-1">
            Las muñecas de Ramón
          </div>
        </div>

        <Button
          variant="outline"
          className="rounded-full px-4 sm:px-6 bg-black text-white hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto"
          onClick={() => router.back()}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          Atrás
        </Button>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 bg-white mx-4 sm:mx-6 lg:mx-8 space-y-4 sm:space-y-6 shadow-md rounded-xl">
        {/* Verificación de estado de caja */}
        <CajaStatusCheck onStatusChange={setHasOpenCaja} />

        {/* Búsqueda de productos */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-4">
          <div className="relative w-full max-w-xs">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4"
            />
            <Input
              placeholder="Buscar Producto"
              value={searchProducto}
              onChange={(e) => setSearchProducto(e.target.value)}
              className="pl-10 pr-20 py-2 text-sm sm:text-base rounded-full"
              style={{ minWidth: 0 }}
            />
            <Button
              variant="outline"
              className="absolute bg-black text-white right-0 top-1/2 -translate-y-1/2 text-xs sm:text-sm rounded-full"
              style={{ zIndex: 2 }}
            >
              Buscar
            </Button>
          </div>
          {searchProducto && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-4 bg-black text-white hover:scale-105 transition-all duration-200 text-sm sm:text-base"
              onClick={handleClearSearch}
            >
              <FontAwesomeIcon icon={faTimes} className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Tabla de resultados de búsqueda en tiempo real */}
        {searchProducto && (
          <div className="mb-4 sm:mb-6">
            <div className="overflow-x-auto">
              <table className="w-full border rounded-lg overflow-hidden text-xs sm:text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-left">PRODUCTO</th>
                    <th className="px-2 sm:px-4 py-2 text-left">PRECIO</th>
                    <th className="px-2 sm:px-4 py-2 text-left">COMISIÓN</th>
                    <th className="px-2 sm:px-4 py-2 text-left">CATEGORÍA</th>
                    <th className="px-2 sm:px-4 py-2 text-center">AGREGAR</th>
                  </tr>
                </thead>
                <tbody>
                  {searchLoading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4">
                        Buscando...
                      </td>
                    </tr>
                  ) : searchResults.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-gray-400">
                        No hay resultados
                      </td>
                    </tr>
                  ) : (
                    searchResults.map((producto, idx) => (
                      <tr
                        key={producto.id_producto || `search-prod-${idx}`}
                        className="border-t hover:bg-gray-50"
                      >
                        <td className="px-4 py-2">{producto.nombre}</td>
                        <td className="px-4 py-2">
                          {formatCurrencyNoDecimals(producto.precio)}
                        </td>
                        <td className="px-4 py-2">
                          {formatCurrencyNoDecimals(producto.comision || 0)}
                        </td>
                        <td className="px-4 py-2">{producto.categoria}</td>
                        <td className="px-4 py-2 text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="bg-black text-white rounded-full hover:scale-105 transition-all duration-200"
                            onClick={() => handleAddProducto(producto)}
                          >
                            <FontAwesomeIcon icon={faPlus} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Categorías de productos */}
        <CategoryCardList
          categorias={categoriasConProductos}
          onSelect={handleOpenCategoria}
          center={true}
          filter={(cat) => cat?.estado === 1 && (cat?.productCount ?? 0) > 0}
        />

        {/* Formulario de datos */}
        <div className="grid grid-cols-4 gap-6">
          {/* Cliente */}
          <CustomerSelect
            clientes={clientes}
            value={selectedCliente}
            onChange={setSelectedCliente}
            required
            disabled={!Array.isArray(productos) || productos.length === 0}
          />

          {/* Anfitriona */}
          <HostessSelect
            anfitrionas={anfitrionas}
            value={selectedAnfitrionas}
            onChange={setSelectedAnfitrionas}
            maxSelection={maxAnfitrionas}
            disabled={!Array.isArray(productos) || productos.length === 0}
          />

          {/* Mostrar selector de habitaciones solo si hay champaña */}
          {hasChampagneProducts && (
            <RoomSelect
              habitaciones={habitaciones}
              value={selectedHabitacion}
              onChange={handleHabitacionChange}
              disabled={loading}
              placeholder="Seleccione una habitación"
              label="Habitación"
              showPrice={false}
              showTime={true}
            />
          )}

          {/* Método de pago */}
          <PaymentMethodSelect
            value={metodoPago}
            onChange={setMetodoPago}
            label="Método de pago"
            placeholder="Seleccione un método de pago"
            disabled={!Array.isArray(productos) || productos.length === 0}
            className="w-full"
          />

          {/* Propina */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <FontAwesomeIcon icon={faCoins} />
              Propina
            </Label>
            <Input
              type="number"
              placeholder="Propina"
              value={propina === 0 ? "" : propina}
              onChange={(e) => {
                const val = e.target.value;
                setPropina(val === "" ? 0 : parseFloat(val) || 0);
              }}
              min="0"
              step="0.01"
              disabled={!Array.isArray(productos) || productos.length === 0}
              onFocus={(e) => setPropina(0)}
              onBlur={(e) => {
                if (e.target.value === "") setPropina(0);
              }}
            />
          </div>
        </div>

        {/* Mensaje informativo sobre la regla de anfitrionas */}
        {Array.isArray(productos) && productos.length > 0 && (
          <div className="w-full flex justify-center mt-2 mb-2">
            <div
              className={`text-xs p-2 rounded-md max-w-xl w-full text-center ${
                hasChampagneProducts && maxChampagnePrice >= 120000
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : hasChampagneProducts
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-orange-50 text-orange-700 border border-orange-200"
              }`}
            >
              <FontAwesomeIcon
                icon={hasChampagneProducts ? faGlassCheers : faUsers}
                className="mr-1"
              />
              {hasChampagneProducts && maxChampagnePrice >= 240000
                ? `Champaña de $${maxChampagnePrice.toLocaleString()}: Puedes seleccionar hasta 7 anfitrionas. Las primeras 5 incluidas, la 6ta y 7ma suman $40,000 cada una.`
                : hasChampagneProducts && maxChampagnePrice >= 200000
                ? `Champaña de $${maxChampagnePrice.toLocaleString()}: Puedes seleccionar hasta 6 anfitrionas. Las primeras 4 incluidas, la 5ta y 6ta suman $40,000 cada una.`
                : hasChampagneProducts && maxChampagnePrice >= 160000
                ? `Champaña de $${maxChampagnePrice.toLocaleString()}: Puedes seleccionar hasta 5 anfitrionas. Las primeras 3 incluidas, la 4ta y 5ta suman $40,000 cada una.`
                : hasChampagneProducts && maxChampagnePrice >= 120000
                ? `Champaña de $${maxChampagnePrice.toLocaleString()}: Puedes seleccionar hasta 4 anfitrionas. Las primeras 2 incluidas, la 3ra y 4ta suman $40,000 cada una.`
                : hasChampagneProducts
                ? "Productos de champaña detectados: Puedes seleccionar hasta 5 anfitrionas"
                : "Productos sin champaña: Solo puedes seleccionar 1 anfitriona máximo"}
            </div>
          </div>
        )}

        {/* Total y botón generar */}
        <div className="flex flex-col items-center justify-center">
          <div className="text-xs text-gray-400 font-semibold mb-1">TOTAL</div>
          <div className="text-2xl font-bold text-gray-900 mb-2 text-center justify-center items-center">
            {formatCurrencyNoDecimals(total)}
            {recargoAnfitrionas > 0 && (
              <span className="block text-xs text-blue-600 font-normal mt-1">
                Incluye recargo por anfitrionas extra:{" "}
                {formatCurrencyNoDecimals(recargoAnfitrionas)}
              </span>
            )}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={
              loading ||
              !Array.isArray(productos) ||
              productos.length === 0 ||
              !metodoPago ||
              (hasChampagneProducts &&
                (!selectedAnfitrionas || selectedAnfitrionas.length === 0)) ||
              hasOpenCaja === false
            }
            className="rounded-full px-6 bg-black text-white hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FontAwesomeIcon icon={faShoppingCart} className="mr-2" />
            {loading ? "Generando..." : "Generar Venta"}
          </Button>
        </div>

        {/* Tabla de productos */}
        <div className="mt-8">
          <div className="text-center text-gray-400 text-sm mb-2">
            Detalles Producto
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
                             <thead className="bg-gray-50">
                 <tr>
                   <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">
                     PRODUCTO
                   </th>
                   <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">
                     CANTIDAD
                   </th>
                   <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">
                     PRECIO
                   </th>
                   <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">
                     COMISIÓN
                   </th>
                   <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">
                     SUB TOTAL
                   </th>
                   <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">
                     ELIMINAR
                   </th>
                 </tr>
               </thead>
              <tbody>
                {Array.isArray(productos) &&
                  productos.map((producto, index) => (
                                         <tr key={index} className="border-t">
                       <td className="px-4 py-2 text-center">
                         {producto.nombre}{" "}
                         <span className="text-xs text-gray-400 ml-2">
                           [{producto.categoria}]
                         </span>
                       </td>
                       <td className="px-4 py-2 text-center">
                         <div className="flex items-center justify-center gap-2">
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => {
                               if (producto.cantidad > 1) {
                                 handleCantidadChangeTable(index, producto.cantidad - 1);
                               }
                             }}
                             className="w-6 h-6 p-0 rounded-full hover:scale-105 transition-all duration-200"
                             disabled={producto.cantidad <= 1}
                           >
                             <FontAwesomeIcon icon={faMinus} />
                           </Button>
                           <span className="w-8 text-center font-medium">
                             {producto.cantidad}
                           </span>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => {
                               handleCantidadChangeTable(index, producto.cantidad + 1);
                             }}
                             className="w-6 h-6 p-0 rounded-full hover:scale-105 transition-all duration-200"
                           >
                             <FontAwesomeIcon icon={faPlus} />
                           </Button>
                         </div>
                       </td>
                       <td className="px-4 py-2 text-center">
                         {formatCurrencyNoDecimals(producto.precio)}
                       </td>
                       <td className="px-4 py-2 text-center">
                         {formatCurrencyNoDecimals(
                           (producto.comision || producto.commission || 0) +
                             anfitrionasExtra * 20000
                         )}
                       </td>
                       <td className="px-4 py-2 text-center">
                         {formatCurrencyNoDecimals(producto.subtotal)}
                       </td>
                       <td className="px-4 py-2 text-center">
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleRemoveProducto(index)}
                           className="text-red-500 hover:text-red-700"
                         >
                           <FontAwesomeIcon icon={faTrash} />
                         </Button>
                       </td>
                     </tr>
                  ))}
                {(!Array.isArray(productos) || productos.length === 0) && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No hay productos agregados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de productos por categoría */}
      <SaleProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        loading={loadingProductos}
        productos={productosCategoria}
        cantidades={cantidades}
        handleCantidadChange={handleCantidadChange}
        handleAgregarProducto={handleAddProducto}
        categoria={modalCategoria}
      />
    </>
  );
}
