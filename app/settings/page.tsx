"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Home, Check, AlertCircle, Key, Plus, Search, Filter, ArrowLeft, Edit, Trash2 } from "lucide-react"
import { Room } from "@/types/room"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Permission {
  id: number
  name: string
  module: string
  action: string
  description: string
}

// Create a simple modal wrapper to match our interface
const SimplePermissionModal = ({ isOpen, onClose, permission, onSave }: {
  isOpen: boolean
  onClose: () => void
  permission?: Permission | null
  onSave: (permissionData: Omit<Permission, 'id'>) => Promise<void>
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">
          {permission ? 'Editar Permiso' : 'Crear Nuevo Permiso'}
        </h2>
        <p className="text-gray-600 mb-4">
          Esta funcionalidad está en desarrollo. Por favor, usa la API directamente.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Settings() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<Room[]>([])
  const [updatingRooms, setUpdatingRooms] = useState<Set<number>>(new Set())
  const [errors, setErrors] = useState<Record<number, string>>({})

  // Permissions state
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [permissionsLoading, setPermissionsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [moduleFilter, setModuleFilter] = useState("all")
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false)
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null)

  // Ensure rooms is always an array - prevents "rooms.map is not a function" error
  const safeRooms = useMemo(() => {
    if (!rooms) return []
    if (!Array.isArray(rooms)) return []
    return rooms
  }, [rooms])

  // Load rooms
  useEffect(() => {
    fetchRooms()
  }, [])

  // Load permissions
  useEffect(() => {
    fetchPermissions()
  }, [])

  const fetchRooms = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/rooms')
      if (!response.ok) throw new Error('Error al cargar habitaciones')
      const result = await response.json()

      console.log('Rooms API response:', result)

      // Handle the API response format { success: true, data: rooms }
      const data = result.success ? result.data : result

      // Ensure data is an array with strict type checking
      if (Array.isArray(data)) {
        console.log('Setting rooms to array with', data.length, 'items')
        setRooms(data)
      } else {
        console.warn('API returned non-array data, setting empty array:', data)
        setRooms([])
      }
    } catch (error) {
      console.error('Error fetching rooms:', error)
      toast.error('Error al cargar las habitaciones')
      setRooms([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissions = async () => {
    try {
      setPermissionsLoading(true)
      const response = await fetch('/api/permissions')
      if (!response.ok) throw new Error('Error al cargar permisos')
      const result = await response.json()
      // Handle the API response format { success: true, data: permissions }
      const data = result.success ? result.data : result
      // Ensure data is an array
      setPermissions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching permissions:', error)
      toast.error('Error al cargar los permisos')
      setPermissions([]) // Set empty array on error
    } finally {
      setPermissionsLoading(false)
    }
  }

  const handlePriceChange = async (roomId: number, newPrice: string) => {
    const price = parseFloat(newPrice)
    if (isNaN(price) || price < 0) {
      setErrors(prev => ({ ...prev, [roomId]: 'El precio debe ser un número válido mayor o igual a 0' }))
      return
    }

    try {
      setUpdatingRooms(prev => new Set(prev).add(roomId))
      setErrors(prev => ({ ...prev, [roomId]: '' }))

      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price })
      })

      if (!response.ok) throw new Error('Error al actualizar precio')

      const result = await response.json()

      if (result.success) {
        setRooms(prev => Array.isArray(prev) ? prev.map(room =>
          room.id === roomId ? { ...room, price } : room
        ) : [])
        toast.success('Precio actualizado correctamente')
      } else {
        throw new Error(result.message || 'Error al actualizar precio')
      }
    } catch (error) {
      console.error('Error updating price:', error)
      setErrors(prev => ({ ...prev, [roomId]: 'Error al actualizar el precio' }))
      toast.error('Error al actualizar el precio')
    } finally {
      setUpdatingRooms(prev => {
        const newSet = new Set(prev)
        newSet.delete(roomId)
        return newSet
      })
    }
  }

  const handleTimeChange = async (roomId: number, newTime: string) => {
    const time = parseInt(newTime)
    if (isNaN(time) || time < 1) {
      setErrors(prev => ({ ...prev, [roomId]: 'El tiempo debe ser un número válido mayor a 0' }))
      return
    }

    try {
      setUpdatingRooms(prev => new Set(prev).add(roomId))
      setErrors(prev => ({ ...prev, [roomId]: '' }))

      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time })
      })

      if (!response.ok) throw new Error('Error al actualizar tiempo')

      const result = await response.json()

      if (result.success) {
        setRooms(prev => Array.isArray(prev) ? prev.map(room =>
          room.id === roomId ? { ...room, time } : room
        ) : [])
        toast.success('Tiempo actualizado correctamente')
      } else {
        throw new Error(result.message || 'Error al actualizar tiempo')
      }
    } catch (error) {
      console.error('Error updating time:', error)
      setErrors(prev => ({ ...prev, [roomId]: 'Error al actualizar el tiempo' }))
      toast.error('Error al actualizar el tiempo')
    } finally {
      setUpdatingRooms(prev => {
        const newSet = new Set(prev)
        newSet.delete(roomId)
        return newSet
      })
    }
  }

  const handleComisionChange = async (roomId: number, newComision: string) => {
    const comision = newComision === '' ? null : parseFloat(newComision)
    if (comision !== null && (isNaN(comision) || comision < 0)) {
      setErrors(prev => ({ ...prev, [roomId]: 'La comisión debe ser un número válido mayor o igual a 0' }))
      return
    }

    try {
      setUpdatingRooms(prev => new Set(prev).add(roomId))
      setErrors(prev => ({ ...prev, [roomId]: '' }))

      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comision_anfitriona: comision })
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      const result = await response.json()
      console.log('Commission update response:', result) // Debug log

      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}: Error al actualizar comisión`)
      }

      if (result.success) {
        setRooms(prev => Array.isArray(prev) ? prev.map(room =>
          room.id === roomId ? { ...room, comision_anfitriona: comision ?? undefined } : room
        ) : [])
        toast.success('Comisión actualizada correctamente')
      } else {
        throw new Error(result.message || 'Error al actualizar comisión')
      }
    } catch (error) {
      console.error('Error updating comision:', error)
      console.error('Error details:', error instanceof Error ? error.message : error)
      setErrors(prev => ({ ...prev, [roomId]: 'Error al actualizar la comisión' }))
      toast.error('Error al actualizar la comisión')
    } finally {
      setUpdatingRooms(prev => {
        const newSet = new Set(prev)
        newSet.delete(roomId)
        return newSet
      })
    }
  }

  const handleCreatePermission = () => {
    setEditingPermission(null)
    setIsPermissionModalOpen(true)
  }

  const handleEditPermission = (permission: Permission) => {
    setEditingPermission(permission)
    setIsPermissionModalOpen(true)
  }

  const handleDeletePermission = async (permissionId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este permiso?')) return

    try {
      const response = await fetch(`/api/permissions/${permissionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Error al eliminar permiso')

      const result = await response.json()

      if (result.success) {
        setPermissions(prev => prev.filter(p => p.id !== permissionId))
        toast.success('Permiso eliminado correctamente')
      } else {
        throw new Error(result.message || 'Error al eliminar permiso')
      }
    } catch (error) {
      console.error('Error deleting permission:', error)
      toast.error('Error al eliminar el permiso')
    }
  }

  const handlePermissionSave = async (permissionData: Omit<Permission, 'id'>) => {
    try {
      const url = editingPermission
        ? `/api/permissions/${editingPermission.id}`
        : '/api/permissions'

      const method = editingPermission ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissionData)
      })

      if (!response.ok) throw new Error('Error al guardar permiso')

      const result = await response.json()

      if (result.success) {
        if (editingPermission) {
          // For updates, we need to refetch the data since the API might not return the full object
          await fetchPermissions()
          toast.success('Permiso actualizado correctamente')
        } else {
          // For new permissions, we can add it to the list
          const newPermission = { ...permissionData, id: result.data.id }
          setPermissions(prev => [...prev, newPermission])
          toast.success('Permiso creado correctamente')
        }

        setIsPermissionModalOpen(false)
        setEditingPermission(null)
      } else {
        throw new Error(result.message || 'Error al guardar permiso')
      }
    } catch (error) {
      console.error('Error saving permission:', error)
      toast.error('Error al guardar el permiso')
    }
  }

  const filteredPermissions = Array.isArray(permissions) ? permissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.action.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesModule = moduleFilter === 'all' || permission.module === moduleFilter

    return matchesSearch && matchesModule
  }) : []

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
      <Tabs defaultValue="rooms" className="space-y-3 sm:space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-auto sm:h-10">
          <TabsTrigger value="rooms" className="text-sm sm:text-base py-2 sm:py-0">Habitaciones</TabsTrigger>
          <TabsTrigger value="permissions" className="text-sm sm:text-base py-2 sm:py-0">Permisos</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Configuración de Habitaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Cargando habitaciones...</p>
                </div>
              ) : safeRooms.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay habitaciones disponibles</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {safeRooms.map((room) => {
                    const isUpdating = updatingRooms.has(room.id)
                    const error = errors[room.id]

                    return (
                      <div key={room.id} className="p-3 sm:p-4 border border-gray-200 rounded-lg relative">
                        {isUpdating && (
                          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg z-10">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                          <h3 className="font-medium text-base sm:text-lg">{room.name}</h3>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={room.status === 1 ? "default" : "secondary"}
                              className={room.status === 1 ? "bg-green-400 hover:bg-green-500" : ""}
                            >
                              {room.status === 1 ? "Activa" : "Inactiva"}
                            </Badge>
                            {isUpdating && <Check className="h-4 w-4 text-green-600" />}
                          </div>
                        </div>

                        {error && (
                          <div className="flex items-center gap-2 text-red-600 text-sm mb-3">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span className="break-words">{error}</span>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-end">
                          <div className="flex-1">
                            <Label htmlFor={`price-${room.id}`} className="text-sm sm:text-base">
                              Precio (€)
                            </Label>
                            <Input
                              id={`price-${room.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              defaultValue={room.price}
                              disabled={isUpdating}
                              className={`text-sm sm:text-base ${error ? "border-red-500" : ""}`}
                              onBlur={(e) => handlePriceChange(room.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handlePriceChange(room.id, e.currentTarget.value)
                                }
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor={`time-${room.id}`} className="text-sm sm:text-base">
                              Tiempo (minutos)
                            </Label>
                            <Input
                              id={`time-${room.id}`}
                              type="number"
                              min="1"
                              defaultValue={room.time}
                              disabled={isUpdating}
                              className={`text-sm sm:text-base ${error ? "border-red-500" : ""}`}
                              onBlur={(e) => handleTimeChange(room.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleTimeChange(room.id, e.currentTarget.value)
                                }
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor={`comision-${room.id}`} className="text-sm sm:text-base">
                              Comisión para anfitrionas (€)
                            </Label>
                            <Input
                              id={`comision-${room.id}`}
                              type="number"
                              min="0"
                              step="1"
                              defaultValue={room.comision_anfitriona ?? 0}
                              disabled={isUpdating}
                              className="text-sm sm:text-base"
                              onBlur={(e) => handleComisionChange(room.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleComisionChange(room.id, e.currentTarget.value)
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="permissions" className="space-y-4">
          <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-black dark:text-neutral-100">
                  Gestión de Permisos
                </h2>
                <p className="text-sm sm:text-base text-zinc-600 dark:text-neutral-300 mt-1">
                  Crea, edita y elimina permisos del sistema
                </p>
              </div>
              <button
                className="whitespace-nowrap inline-flex items-center px-4 py-2 bg-black text-white rounded-full hover:bg-zinc-900 transition-colors hover:scale-110 duration-200 text-sm sm:text-base w-full sm:w-auto"
                onClick={handleCreatePermission}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Permiso
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{Array.isArray(permissions) ? permissions.length : 0}</p>
                    <p className="text-sm text-gray-600">Total Permisos</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {Array.isArray(permissions) ? permissions.filter(p => p.module).length : 0}
                    </p>
                    <p className="text-sm text-gray-600">Módulos Activos</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {Array.isArray(permissions) ? new Set(permissions.map(p => p.module)).size : 0}
                    </p>
                    <p className="text-sm text-gray-600">Módulos Únicos</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-neutral-500" />
                      <input
                        type="text"
                        placeholder="Buscar permisos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-zinc-300 dark:border-neutral-700 rounded-full focus:ring-2 focus:ring-black focus:border-transparent text-sm sm:text-base bg-white dark:bg-neutral-800 text-black dark:text-neutral-100 placeholder:text-zinc-400 dark:placeholder:text-neutral-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={moduleFilter}
                      onChange={(e) => setModuleFilter(e.target.value)}
                      className="px-3 py-2 border border-zinc-300 dark:border-neutral-700 rounded-full focus:ring-2 focus:ring-black focus:border-transparent text-sm sm:text-base bg-white dark:bg-neutral-800 text-black dark:text-neutral-100"
                    >
                      <option value="all">Todos los módulos</option>
                      {Array.isArray(permissions) && Array.from(new Set(permissions.map(p => p.module))).map(module => (
                        <option key={module} value={module}>
                          {module.replace('_', ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permissions List */}
            <Card>
              <CardHeader>
                <CardTitle>Permisos del Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                {permissionsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Cargando permisos...</p>
                  </div>
                ) : filteredPermissions.length === 0 ? (
                  <div className="text-center py-8">
                    <Key className="h-8 w-8 sm:h-12 sm:w-12 text-zinc-400 mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-medium text-zinc-600 dark:text-neutral-300 mb-2">
                      No hay permisos configurados
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-500 dark:text-neutral-400 mb-4">
                      Crea el primer permiso del sistema
                    </p>
                    <button
                      onClick={handleCreatePermission}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear Permiso
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPermissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-medium text-gray-900">{permission.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {permission.module.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {permission.action.toUpperCase()}
                            </Badge>
                          </div>
                          {permission.description && (
                            <p className="text-sm text-gray-600 mt-1">{permission.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditPermission(permission)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                            title="Editar permiso"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePermission(permission.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            title="Eliminar permiso"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Permission Modal */}
          <SimplePermissionModal
            isOpen={isPermissionModalOpen}
            onClose={() => setIsPermissionModalOpen(false)}
            permission={editingPermission}
            onSave={handlePermissionSave}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}