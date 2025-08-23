// hooks/useAsistencias.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { AsistenciaResumen, AsistenciaResponse } from '@/types/asistencia'
import { useCurrentUser } from './useCurrentUser'

interface UseAsistenciasReturn {
  data: AsistenciaResumen[]
  loading: boolean
  error: string | null
  fetchAsistencias: () => Promise<void>
  registrarAsistencia: (usuarioId: number) => Promise<boolean>
}

export default function useAsistencias(): UseAsistenciasReturn {
  const { user } = useCurrentUser()
  const [data, setData] = useState<AsistenciaResumen[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAsistencias = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Determinar qué endpoint usar basado en el rol del usuario
      const endpoint = user?.role?.toLowerCase() === 'cajero' 
        ? '/api/asistencias/user' 
        : '/api/asistencias'
      
      const response = await fetch(endpoint)
      
      if (!response.ok) {
        throw new Error('Error al obtener las asistencias')
      }
      
      const result: AsistenciaResponse = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al obtener las asistencias')
      }
      
      setData(result.data || [])
    } catch (err) {
      console.error('Error en useAsistencias:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [user])

  const registrarAsistencia = useCallback(async (usuarioId: number): Promise<boolean> => {
    try {
      const response = await fetch('/api/asistencias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          usuario_id: usuarioId,
          fecha: new Date().toISOString().split('T')[0],
          hora: new Date().toTimeString().slice(0, 8),
          estado: 'presente'
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al registrar asistencia')
      }
      
      // Actualizar la lista de asistencias después de registrar una nueva
      await fetchAsistencias()
      return true
    } catch (error) {
      console.error('Error al registrar asistencia:', error)
      setError(error instanceof Error ? error.message : 'Error al registrar asistencia')
      return false
    }
  }, [fetchAsistencias])

  // Cargar datos al montar el componente
  useEffect(() => {
    if (user) {
      fetchAsistencias()
    }
  }, [fetchAsistencias, user])

  return {
    data,
    loading,
    error,
    fetchAsistencias,
    registrarAsistencia
  }
}