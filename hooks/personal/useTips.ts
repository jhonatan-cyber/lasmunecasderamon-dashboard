 
'use client'

import { useCallback, useState } from 'react'
import { useGenericFetch } from '../shared/useGenericFetch'

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
  fetchDetalles: (usuarioId: string | number) => Promise<void>
}

export default function useTips(): UseTipsReturn {
  const endpoint = '/api/tips?tipo=resumen'
  
  const { data, isLoading, error, refetch } = useGenericFetch<any>(
    endpoint,
    {
      transform: (result) => result.data || result
    }
  )

  const fetchTips = useCallback(async () => {
    await refetch()
  }, [refetch])

  return {
    data: data || [],
    loading: isLoading,
    error,
    fetchTips
  }
}

export function useTipsResumen(): UseTipsResumenReturn {
  const endpoint = '/api/tips?tipo=resumen'
  
  const { data, isLoading, error, refetch } = useGenericFetch<any>(
    endpoint,
    {
      transform: (result) => result.data || result
    }
  )

  const fetchTipsResumen = useCallback(async () => {
    await refetch()
  }, [refetch])

  return {
    data: data || [],
    loading: isLoading,
    error,
    fetchTipsResumen
  }
}

export function useTipsDetalle(usuarioId?: string | number): UseTipsDetalleReturn {
  const [detalles, setDetalles] = useState<any[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDetalles = useCallback(async (userId: string | number) => {
    try {
      setLoading(true)
      setError(null)
      
      const endpoint = `/api/tips?tipo=detalle&usuario_id=${userId}`
      
      const response = await fetch(endpoint, {
        credentials: 'include',
        cache: 'no-store'
      })
      
      if (!response.ok) {
        throw new Error('Error al obtener los detalles de propinas')
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al obtener los detalles de propinas')
      }
      
      setDetalles(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setDetalles([])
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    detalles,
    loading,
    error,
    fetchDetalles
  }
} 
