import { useState, useEffect, useCallback, useMemo } from "react";
import { Client } from "@/types/client";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Filtrar clientes basado en búsqueda y estado
  const filteredClients = useMemo(() => {
    let result = clients;

    // Filtrar por término de búsqueda
    if (searchTerm.trim()) {
      const lowercasedFilter = searchTerm.toLowerCase();
      result = result.filter(
        (client) =>
          (client.name?.toLowerCase().includes(lowercasedFilter) ||
            client.lastName?.toLowerCase().includes(lowercasedFilter) ||
            client.run?.toLowerCase().includes(lowercasedFilter) ||
            client.phone?.toLowerCase().includes(lowercasedFilter)) ?? false
      );
    }

    // Filtrar por estado
    if (filterStatus !== null) {
      result = result.filter((client) => client.status === filterStatus);
    }

    return result;
  }, [clients, searchTerm, filterStatus]);

  // Calcular clientes paginados
  const paginatedClients = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [filteredClients, page, pageSize]);

  // Calcular total de páginas
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterStatus, pageSize]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/clients", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Error al obtener los clientes");
      const data = await response.json();
      const mappedClients = data.map((c: any) => ({
        id: c.id,
        run: c.run,
        name: c.name,
        lastName: c.lastName,
        phone: c.phone,
        created_at: c.created_at,
        updated_at: c.updated_at,
        status: c.status,
      }));
      setClients(mappedClients);
    } catch (err) {
      setError(
        "No se pudieron cargar los clientes. Por favor, inténtalo de nuevo más tarde."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const createClient = async (newClient: {
    run?: string;
    name: string;
    lastName: string;
    phone?: string;
  }) => {
    const response = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newClient),
    });
    if (!response.ok) {
      let errorMsg = "Error al crear el cliente";
      try {
        const errorData = await response.json();
        if (errorData.message) errorMsg = errorData.message;
      } catch {}
      throw new Error(errorMsg);
    }
    await fetchClients();
  };

  const updateClient = async (client: {
    run?: string;
    name: string;
    lastName: string;
    phone?: string;
    id: number;
  }) => {
    const response = await fetch("/api/clients", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(client),
    });
    if (!response.ok) {
      let errorMsg = "Error al actualizar el cliente";
      try {
        const errorData = await response.json();
        if (errorData.message) errorMsg = errorData.message;
      } catch {}
      throw new Error(errorMsg);
    }
    await fetchClients();
  };

  const deleteClient = async (id: number) => {
    const response = await fetch(`/api/clients?id=${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Error al eliminar el cliente");
    await fetchClients();
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return {
    clients: paginatedClients,
    allClients: clients, // Para exportar todos los clientes
    filteredClients, // Para mostrar el total de resultados filtrados
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
  };
}
