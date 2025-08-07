'use client'

import { useState, useEffect } from 'react'
import { PayrollSummary } from '@/types/asistencia'

export default function usePayrollSummary(month?: number, year?: number) {
  const [data, setData] = useState<PayrollSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totals, setTotals] = useState({
    sueldo: 0,
    descuento: 0,
    total: 0
  })

  useEffect(() => {
    const fetchPayrollSummary = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Construir URL con parámetros de consulta
        let url = '/api/asistencias?resumen=true'
        
        if (month !== undefined) {
          url += `&month=${month}`
        }
        
        if (year !== undefined) {
          url += `&year=${year}`
        }
        
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error('Error al obtener el resumen de planillas')
        }
        
        const result = await response.json()
        
        setData(result.data || [])
        setTotals(result.totals || {
          sueldo: 0,
          descuento: 0,
          total: 0
        })
      } catch (err) {
        console.error('Error en usePayrollSummary:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
        setData([])
        setTotals({
          sueldo: 0,
          descuento: 0,
          total: 0
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPayrollSummary()
  }, [month, year])

  return {
    data,
    totals,
    isLoading,
    error
  }
}