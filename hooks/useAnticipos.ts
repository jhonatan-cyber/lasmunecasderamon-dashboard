'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCurrentUser } from './useCurrentUser'

export interface Anticipo {
  id_anticipo: number;
  usuario_id: number;
  fecha_crea: string;
  fecha_mod: string;
  monto: number;
  estado: number;
  usuario: string;
  estado_texto: string;
}

interface UseAnticiposReturn {
  data: Anticipo[]
  loading: boolean
  error: string | null
  fetchAnticipos: () => Promise<void>
}

export default function useAnticipos(): UseAnticiposReturn {
  const { user } = useCurrentUser()
  const [data, setData] = useState<Anticipo[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnticipos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Determinar qué endpoint usar basado en el rol del usuario
      const endpoint = user?.role?.toLowerCase() === 'cajero' 
        ? '/api/anticipos/user' 
        : '/api/anticipos'
      
      const response = await fetch(endpoint)
      
      if (!response.ok) {
        throw new Error('Error al obtener los anticipos')
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al obtener los anticipos')
      }
      
      setData(result.data || [])
    } catch (err) {
  
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [user])

  // Cargar datos al montar el componente
  useEffect(() => {
    if (user) {
      fetchAnticipos()
    }
  }, [fetchAnticipos, user])

  return {
    data,
    loading,
    error,
    fetchAnticipos
  }
}
