"use client"

import { useState, useEffect } from "react"
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
import PermissionModal from "@/components/permissions/PermissionModal"

export default function Settings() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [updatingRooms, setUpdatingRooms] = useState<Set<number>>(new Set())
  const [errors, setErrors] = useState<Record<number, string>>({})
  
  // Estados para permisos
  const [permissions, setPermissions] = useState<any[]>([])
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false)
  const [editingPermission, setEditingPermission] = useState<any>(null)

  useEffect(() => {
    fetchRooms()
  }, [])

  useEffect(() => {
    fetchPermissions()
  }, [])

  const fetchRooms = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/rooms")
      const data = await response.json()
      if (data.success) {
        setRooms(data.data)
      } else {
        toast.error(data.message || "Error al cargar habitaciones")
      }
    } catch (error) {
      console.error("Error al cargar habitaciones:", error)
      toast.error("Error de conexión al cargar habitaciones")
    } finally {
      setLoading(false)
    }
  }

  const updateRoom = async (roomId: number, updates: { price?: number; time?: number }) => {
    // Validación local
    if (updates.price !== undefined && updates.price < 0) {
      setErrors(prev => ({ ...prev, [roomId]: "El precio debe ser mayor o igual a 0" }))
      return
    }
    if (updates.time !== undefined && updates.time < 1) {
      setErrors(prev => ({ ...prev, [roomId]: "El tiempo debe ser mayor a 0" }))
      return
    }

    try {
      setUpdatingRooms(prev => new Set(prev).add(roomId))
      setErrors(prev => ({ ...prev, [roomId]: "" }))

      const response = await fetch(`/api/rooms/${roomId}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        // Actualizar el estado local
        setRooms(prev => prev.map(room => 
          room.id === roomId 
            ? { ...room, ...updates }
            : room
        ))
        
        // Obtener el nombre de la habitación para el mensaje
        const roomName = rooms.find(r => r.id === roomId)?.name || 'Habitación'
        
        // Crear mensaje específico según qué se actualizó
        let updateMessage = `${roomName} actualizada correctamente`
        if (updates.price !== undefined && updates.time !== undefined) {
          updateMessage = `${roomName}: Precio y tiempo actualizados`
        } else if (updates.price !== undefined) {
          updateMessage = `${roomName}: Precio actualizado a €${updates.price}`
        } else if (updates.time !== undefined) {
          updateMessage = `${roomName}: Tiempo actualizado a ${updates.time} minutos`
        }
        
        toast.success(updateMessage)
      } else {
        throw new Error(data.message || "Error al actualizar habitación")
      }
    } catch (error) {
      console.error("Error al actualizar habitación:", error)
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      setErrors(prev => ({ ...prev, [roomId]: errorMessage }))
      
      toast.error(errorMessage)
    } finally {
      setUpdatingRooms(prev => {
        const newSet = new Set(prev)
        newSet.delete(roomId)
        return newSet
      })
    }
  }

  const handlePriceChange = (roomId: number, newPrice: string) => {
    const price = parseFloat(newPrice)
    if (isNaN(price)) return
    
    const room = rooms.find(r => r.id === roomId)
    if (!room || price === room.price) return
    
    updateRoom(roomId, { price })
  }

  const handleTimeChange = (roomId: number, newTime: string) => {
    const time = parseInt(newTime)
    if (isNaN(time)) return
    
    const room = rooms.find(r => r.id === roomId)
    if (!room || time === room.time) return
    
    updateRoom(roomId, { time })
  }

  // Funciones para permisos
  const fetchPermissions = async () => {
    setPermissionsLoading(true)
    try {
      const response = await fetch('/api/permissions')
      const data = await response.json()
      if (data.success) {
        setPermissions(data.data)
      }
    } catch (error) {
      toast.error('Error al cargar los permisos')
    } finally {
      setPermissionsLoading(false)
    }
  }

  const handleDeletePermission = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este permiso?')) return

    try {
      const response = await fetch(`/api/permissions/${id}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success('Permiso eliminado correctamente')
        fetchPermissions()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error('Error al eliminar el permiso')
    }
  }

  const handleEditPermission = (permission: any) => {
    setEditingPermission(permission)
    setIsPermissionModalOpen(true)
  }

  const handleCreatePermission = () => {
    setEditingPermission(null)
    setIsPermissionModalOpen(true)
  }

  const handlePermissionSave = () => {
    fetchPermissions()
  }

  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesModule = moduleFilter === 'all' || permission.module === moduleFilter
    return matchesSearch && matchesModule
  })

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm sm:text-base text-gray-600">Gestiona la configuración de tu cuenta y preferencias</p>
      </div>

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
              ) : rooms.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay habitaciones disponibles</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {rooms.map((room) => {
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
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
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
                          <div>
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
                    <p className="text-2xl font-bold text-blue-600">{permissions.length}</p>
                    <p className="text-sm text-gray-600">Total Permisos</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {permissions.filter(p => p.module).length}
                    </p>
                    <p className="text-sm text-gray-600">Módulos Activos</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {new Set(permissions.map(p => p.module)).size}
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
                      {Array.from(new Set(permissions.map(p => p.module))).map(module => (
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
          <PermissionModal
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
