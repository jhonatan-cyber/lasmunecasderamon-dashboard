'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCurrentUser } from './useCurrentUser'

interface UseTipsReturn {
  data: any[]
  loading: boolean
  error: string | null
  fetchTips: () => Promise<void>
}

interface UseTipsResumenReturn {
  data: any[]
  loading: boolean
  error: string | null
  fetchTipsResumen: () => Promise<void>
}

interface UseTipsDetalleReturn {
  detalles: any[]
  loading: boolean
  error: string | null
  fetchDetalles: (usuarioId: number) => Promise<void>
}

export default function useTips(): UseTipsReturn {
  const { user } = useCurrentUser()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTips = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Determinar qué endpoint usar basado en el rol del usuario
      const endpoint = user?.role?.toLowerCase() === 'cajero' 
        ? '/api/tips/user' 
        : '/api/tips?tipo=resumen'
      
      const response = await fetch(endpoint)
      
      if (!response.ok) {
        throw new Error('Error al obtener las propinas')
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al obtener las propinas')
      }
      
      setData(result.data || [])
    } catch (err) {
      console.error('Error en useTips:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [user])

  // Cargar datos al montar el componente
  useEffect(() => {
    if (user) {
      fetchTips()
    }
  }, [fetchTips, user])

  return {
    data,
    loading,
    error,
    fetchTips
  }
}

export function useTipsResumen(): UseTipsResumenReturn {
  const { user } = useCurrentUser()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTipsResumen = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Determinar qué endpoint usar basado en el rol del usuario
      const endpoint = user?.role?.toLowerCase() === 'cajero' 
        ? '/api/tips/user-resumen' 
        : '/api/tips?tipo=resumen'
      
      const response = await fetch(endpoint)
      
      if (!response.ok) {
        throw new Error('Error al obtener el resumen de propinas')
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al obtener el resumen de propinas')
      }
      
      setData(result.data || [])
    } catch (err) {
      console.error('Error en useTipsResumen:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [user])

  // Cargar datos al montar el componente
  useEffect(() => {
    if (user) {
      fetchTipsResumen()
    }
  }, [fetchTipsResumen, user])

  return {
    data,
    loading,
    error,
    fetchTipsResumen
  }
}

export function useTipsDetalle(usuarioId?: number): UseTipsDetalleReturn {
  const { user } = useCurrentUser()
  const [detalles, setDetalles] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDetalles = useCallback(async (userId: number) => {
    try {
      setLoading(true)
      setError(null)
      
      // Determinar qué endpoint usar basado en el rol del usuario
      const endpoint = user?.role?.toLowerCase() === 'cajero' 
        ? `/api/tips/user?tipo=detalle` 
        : `/api/tips?tipo=detalle&usuario_id=${userId}`
      
      const response = await fetch(endpoint)
      
      if (!response.ok) {
        throw new Error('Error al obtener los detalles de propinas')
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al obtener los detalles de propinas')
      }
      
      setDetalles(result.data || [])
    } catch (err) {
      console.error('Error en useTipsDetalle:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setDetalles([])
    } finally {
      setLoading(false)
    }
  }, [user])

  return {
    detalles,
    loading,
    error,
    fetchDetalles
  }
} 