import { useState, useEffect } from "react";
import { Product } from "@/types/product";
import { toast } from "sonner";

export default function useProducts(categoryId?: number) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<number | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let url = "/api/products";
      if (categoryId) url += `?category_id=${categoryId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      } else {
        setError(data.message || "Error al obtener productos");
      }
    } catch (err) {
      setError("Error de red al obtener productos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line
  }, [categoryId]);

  const createProduct = async (product: Partial<Product> | FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      let body: BodyInit;
      let headers: Record<string, string> = {};
      if (product instanceof FormData) {
        body = product;
      } else {
        body = JSON.stringify(product);
        headers["Content-Type"] = "application/json";
      }
      const res = await fetch("/api/products", {
        method: "POST",
        headers,
        body,
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Producto creado correctamente");
        await fetchProducts();
      } else {
        toast.error(data.message || "Error al crear producto");
        setError(data.message || "Error al crear producto");
      }
    } catch (err) {
      toast.error("Error de red al crear producto");
      setError("Error de red al crear producto");
    } finally {
      setIsLoading(false);
    }
  };

  const updateProduct = async (product: Partial<Product> | FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      let body: BodyInit;
      let headers: Record<string, string> = {};
      let id: number | undefined;
      if (product instanceof FormData) {
        body = product;
        id = Number(product.get("id"));
      } else {
        body = JSON.stringify(product);
        headers["Content-Type"] = "application/json";
        id = product.id;
      }
      const res = await fetch(`/api/products?id=${id}`, {
        method: "PUT",
        headers,
        body,
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Producto actualizado correctamente");
        await fetchProducts();
      } else {
        toast.error(data.message || "Error al actualizar producto");
        setError(data.message || "Error al actualizar producto");
      }
    } catch (err) {
      toast.error("Error de red al actualizar producto");
      setError("Error de red al actualizar producto");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProduct = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Producto eliminado correctamente");
        await fetchProducts();
      } else {
        toast.error(data.message || "Error al eliminar producto");
        setError(data.message || "Error al eliminar producto");
      }
    } catch (err) {
      toast.error("Error de red al eliminar producto");
      setError("Error de red al eliminar producto");
    } finally {
      setIsLoading(false);
    }
  };

  const activateProduct = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products?id=${id}&action=activate`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Producto activado correctamente");
        await fetchProducts();
      } else {
        toast.error(data.message || "Error al activar producto");
        setError(data.message || "Error al activar producto");
      }
    } catch (err) {
      toast.error("Error de red al activar producto");
      setError("Error de red al activar producto");
    } finally {
      setIsLoading(false);
    }
  };

  const deactivateProduct = async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products?id=${id}&action=deactivate`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Producto desactivado correctamente");
        await fetchProducts();
      } else {
        toast.error(data.message || "Error al desactivar producto");
        setError(data.message || "Error al desactivar producto");
      }
    } catch (err) {
      toast.error("Error de red al desactivar producto");
      setError("Error de red al desactivar producto");
    } finally {
      setIsLoading(false);
    }
  };

  const reorderProducts = async (reorderedProducts: Product[]) => {
    if (!categoryId) {
      toast.error("No se puede reordenar sin una categoría");
      return;
    }

    try {
      const product_orders = reorderedProducts.map((product, index) => ({
        id: product.id,
        display_order: index + 1
      }));

      const res = await fetch("/api/products/reorder", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category_id: categoryId,
          product_orders
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Orden actualizado correctamente");
        // Actualizar el estado local inmediatamente
        setProducts(reorderedProducts);
      } else {
        toast.error(data.message || "Error al actualizar el orden");
        // Revertir al orden original
        await fetchProducts();
      }
    } catch (err) {
      toast.error("Error de red al actualizar el orden");
      // Revertir al orden original
      await fetchProducts();
    }
  };

  return {
    products,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    activateProduct,
    deactivateProduct,
    reorderProducts,
  };
} 