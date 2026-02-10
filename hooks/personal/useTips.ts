'use client'

import { useMemo, useCallback, useState } from 'react'
import { useCurrentUser } from '../auth/useCurrentUser'
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
  fetchDetalles: (usuarioId: number) => Promise<void>
}

export default function useTips(): UseTipsReturn {
  const { user } = useCurrentUser()
  
  const endpoint = useMemo(() => 
    user?.role?.toLowerCase() === 'cajero' ? '/api/tips/user' : '/api/tips?tipo=resumen',
    [user?.role]
  )
  
  const { data, isLoading, error, refetch } = useGenericFetch<any>(
    endpoint,
    {
      transform: (result) => result.data || result
    }
  )

  return {
    data: data || [],
    loading: isLoading,
    error,
    fetchTips: refetch
  }
}

export function useTipsResumen(): UseTipsResumenReturn {
  const { user } = useCurrentUser()
  
  const endpoint = useMemo(() => 
    user?.role?.toLowerCase() === 'cajero' ? '/api/tips/user-resumen' : '/api/tips?tipo=resumen',
    [user?.role]
  )
  
  const { data, isLoading, error, refetch } = useGenericFetch<any>(
    endpoint,
    {
      transform: (result) => result.data || result
    }
  )

  return {
    data: data || [],
    loading: isLoading,
    error,
    fetchTipsResumen: refetch
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