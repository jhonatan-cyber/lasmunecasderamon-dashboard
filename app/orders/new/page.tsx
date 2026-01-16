"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import OrderForm from "@/components/orders/OrderForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useClientes } from "@/hooks/useClientes";
import { useAnfitrionas } from "@/hooks/useAnfitrionas";

export default function NewOrder() {
  const router = useRouter();
  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedAnfitrionas, setSelectedAnfitrionas] = useState<string[]>([]);
  const [productos, setProductos] = useState<any[]>([]); // productos agregados
  const { clientes, loading: loadingClientes } = useClientes();
  const { anfitrionas, loading: loadingAnfitrionas } = useAnfitrionas();
  const [searchCliente, setSearchCliente] = useState("");
  const [searchAnfitriona, setSearchAnfitriona] = useState("");
  const [categorias, setCategorias] = useState<any[]>([]);





  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCategorias(data.data);
      });
  }, []);

  const clientesFiltrados = searchCliente 
    ? clientes.filter((c) => {
        const texto = `${c.name || c.nombre || ""} ${c.lastName || ""} ${
          c.run || ""
        }`.toLowerCase();
        return texto.includes(searchCliente.toLowerCase());
      })
    : clientes; // Si no hay término de búsqueda, mostrar todos los clientes

  const anfitrionasFiltradas = anfitrionas.filter((a) => {
    const texto = `${a.nick || a.nombre || ""}`.toLowerCase();
    return texto.includes(searchAnfitriona.toLowerCase());
  });

  const categoriasFiltradas = categorias.filter(
    (cat) => cat.status === 1 && (cat.total_products || 0) > 0
  );

  // Handler para eliminar producto
  const handleRemoveProducto = (idx: number) => {
    setProductos((prev: any[]) => prev.filter((_, i) => i !== idx));
  };

  // Handler para agregar producto (mock)
  const handleAddProducto = (producto: any) => {
    setProductos((prev: any[]) => [...prev, producto]);
  };

  // Handler para actualizar cantidad de producto
  const handleUpdateCantidad = (index: number, nuevaCantidad: number) => {
    setProductos((prev: any[]) => 
      prev.map((producto, i) => 
        i === index 
          ? {
              ...producto,
              cantidad: nuevaCantidad,
              subtotal: (producto.precio || producto.price) * nuevaCantidad,
            }
          : producto
      )
    );
  };

  // Handler para toggle de comisión
  const handleToggleComision = (index: number) => {
    setProductos((prev: any[]) => 
      prev.map((producto, i) => 
        i === index 
          ? {
              ...producto,
              generaComision: producto.generaComision === 1 ? 0 : 1,
            }
          : producto
      )
    );
  };

  // Handler para submit (mock)
  const handleSubmit = () => {
    // Si no hay cliente seleccionado, usar cliente ID 1 por defecto
    const clienteId = selectedCliente || "1";
    
  };

  const hasChampagne = productos.some((item: any) => {
    const cat = (item.categoria || "").toLowerCase();
    return (
      cat.includes("champaña") ||
      cat.includes("shampaña") ||
      cat.includes("champagne")
    );
  });

  return (
    <>
      <div className="flex items-center justify-between mt-10 p-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Datos Ticket Pedido
          </h2>
          <div className="uppercase text-xs tracking-widest text-gray-400 font-semibold mb-1">
            Las muñecas de Ramón
          </div>
        </div>

        <Button
          variant="outline"
          className="rounded-full  bg-black text-white hover:scale-105 transition-all duration-200"
          onClick={() => router.back()}
          type="button"
        >
          <ArrowLeft />
          Atrás
        </Button>
      </div>
      <div className="p-8 bg-white ml-8 mr-8 space-y-6 shadow-md rounded-xl">
        <OrderForm
          clientes={clientesFiltrados}
          anfitrionas={anfitrionasFiltradas}
          categorias={categoriasFiltradas}
          productos={productos}
          selectedCliente={selectedCliente}
          setSelectedCliente={setSelectedCliente}
          selectedAnfitrionas={selectedAnfitrionas}
          setSelectedAnfitrionas={setSelectedAnfitrionas}
          onAddProducto={handleAddProducto}
          onRemoveProducto={handleRemoveProducto}
          onUpdateCantidad={handleUpdateCantidad}
          onToggleComision={handleToggleComision}
          onSubmit={handleSubmit}
          searchCliente={searchCliente}
          setSearchCliente={setSearchCliente}
          searchAnfitriona={searchAnfitriona}
          setSearchAnfitriona={setSearchAnfitriona}
        />
      </div>
    </>
  );
}
