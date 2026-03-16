'use client'

import { useMemo } from 'react'
import { useCurrentUser } from '../auth/useCurrentUser'
import { useGenericFetch } from '../shared/useGenericFetch'

export interface Anticipo {
  id_anticipo: number | string;
  usuario_id: number | string;
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

  const endpoint = useMemo(() => 
    user?.role?.toLowerCase() === 'cajero' ? '/api/anticipos/user' : '/api/anticipos',
    [user?.role]
  )
  
  const { data, isLoading, error, refetch } = useGenericFetch<Anticipo>(
    endpoint,
    {
      transform: (result) => result.data || result
    }
  )

  const fetchAnticipos = async () => {
    await refetch()
  }

  return {
    data: data || [],
    loading: isLoading,
    error,
    fetchAnticipos
  }
}
