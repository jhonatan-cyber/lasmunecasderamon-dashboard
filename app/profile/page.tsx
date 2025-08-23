'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { user: currentUser, loading: userLoading } = useCurrentUser();
  
  // Detectar automáticamente si el usuario es administrador
  const isAdmin = currentUser?.role?.toLowerCase() === 'administrador' || 
                  currentUser?.role?.toLowerCase() === 'admin';
  
  // Lista de usuarios para administradores
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Lista de roles disponibles
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Debug: Log cuando cambia rolesList
  useEffect(() => {
    console.log('🔵 rolesList actualizado:', rolesList);
  }, [rolesList]);
  
  // Datos del usuario actual
  const [userData, setUserData] = useState<any>(null);
  const [loadingUserData, setLoadingUserData] = useState(false);

  const [originalData, setOriginalData] = useState<any>(null);

  // Función para cargar lista de usuarios (solo para administradores)
  const loadUsersList = async () => {
    if (!isAdmin) return;
    
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (data.success) {
        setUsersList(data.data || []);
      }
    } catch (error) {
      console.error('Error al cargar lista de usuarios:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Función para cargar lista de roles
  const loadRolesList = async () => {
    try {
      console.log('🔵 Iniciando carga de roles...');
      setLoadingRoles(true);
      const res = await fetch('/api/roles', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('🔵 Respuesta del endpoint de roles:', res.status);
      const data = await res.json();
      console.log('🔵 Datos recibidos de roles:', data);
      
      if (data.success) {
        console.log('🔵 Roles cargados exitosamente:', data.roles);
        setRolesList(data.roles || []);
      } else {
        console.error('🔵 Error en la respuesta de roles:', data.message);
      }
    } catch (error) {
      console.error('🔵 Error al cargar lista de roles:', error);
    } finally {
      setLoadingRoles(false);
    }
  };

  // Función para cargar datos de un usuario específico
  const loadUserData = async (userId: string) => {
    try {
      setLoadingUserData(true);
      const res = await fetch(`/api/users/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

             const data = await res.json();
       if (data.success && data.user) {
         console.log('🔵 Datos del usuario cargados:', data.user);
         console.log('🔵 Foto del usuario:', data.user.foto);
         setUserData(data.user);
         setOriginalData(data.user);
         setSelectedUserId(userId);
       } else {
         console.error('Error al cargar datos del usuario:', data.message);
       }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
    } finally {
      setLoadingUserData(false);
    }
  };

  // Load initial user data
  useEffect(() => {
    if (userLoading) return; // Esperar a que se cargue el usuario actual
    
    // Cargar lista de roles primero para todos los usuarios
    loadRolesList();
    
    if (isAdmin && !selectedUserId) {
      // Para administradores, cargar su propio perfil por defecto
      if (currentUser) {
        loadUserData(currentUser.id.toString());
      }
      // Cargar lista de usuarios para el selector
      loadUsersList();
    } else if (!isAdmin && currentUser) {
      // Para usuarios no admin, cargar su propio perfil
      loadUserData(currentUser.id.toString());
    }
  }, [isAdmin, selectedUserId, userLoading, currentUser]);

  const handleUserChange = (userId: string) => {
    if (isEditing) {
      // Confirm before changing user if editing
      if (confirm('¿Estás seguro de que quieres cambiar de usuario? Se perderán los cambios no guardados.')) {
        setIsEditing(false);
        loadUserData(userId);
      }
    } else {
      loadUserData(userId);
    }
  };

  // Función para actualizar email automáticamente cuando cambia el nick
  const handleNickChange = (newNick: string) => {
    const newEmail = `${newNick}@lasmuñecasderamon.com`;
    setUserData({
      ...userData,
      nick: newNick,
      email: newEmail
    });
  };

  // Función para manejar cambios en el nickname (para administradores)
  const handleAdminNickChange = (newNick: string) => {
    const newEmail = `${newNick}@lasmuñecasderamon.com`;
    setUserData({
      ...userData,
      nick: newNick,
      email: newEmail
    });
  };

  const handleSave = async () => {
    if (!userData) return;
    
    try {
      const res = await fetch(`/api/users/${userData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          run: userData.run,
          nick: userData.nick,
          nombre: userData.nombre,
          apellido: userData.apellido,
          direccion: userData.direccion,
          telefono: userData.telefono,
          estado_civil: userData.estado_civil,
          afp: userData.afp,
          aporte: userData.aporte,
          sueldo: userData.sueldo,
          descuento: userData.descuento,
          email: userData.email,
          password: userData.password || undefined,
          rol_id: userData.rol_id
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOriginalData({ ...userData });
        setIsEditing(false);
        console.log('Perfil actualizado exitosamente');
        // Recargar datos del usuario para asegurar sincronización
        await loadUserData(userData.id.toString());
      } else {
        throw new Error(data.message || 'Error al actualizar perfil');
      }
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      // Revertir cambios en caso de error
      if (originalData) {
        setUserData({ ...originalData });
      }
    }
  };

  const handleCancel = () => {
    if (originalData) {
      setUserData({ ...originalData });
    }
    setIsEditing(false);
    setIsChangingPassword(false);
  };

  const handleChangePassword = () => {
    setIsChangingPassword(true);
  };

  const handleSavePassword = async () => {
    if (!userData || !userData.password) {
      alert('Por favor ingresa una nueva contraseña');
      return;
    }
    
    try {
      const res = await fetch(`/api/users/${userData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: userData.password
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsChangingPassword(false);
        setUserData({ ...userData, password: '' });
        alert('Contraseña actualizada exitosamente');
      } else {
        throw new Error(data.message || 'Error al actualizar contraseña');
      }
    } catch (error) {
      console.error('Error al actualizar contraseña:', error);
      alert('Error al actualizar la contraseña');
    }
  };

  // Mostrar loading mientras se carga el usuario
  if (userLoading || loadingUserData || loadingRoles) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Cargando perfil...</p>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar error si no hay datos de usuario
  if (!userData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600">Error al cargar los datos del usuario</p>
            <Button 
              onClick={() => currentUser && loadUserData(currentUser.id.toString())}
              className="mt-4"
            >
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Perfil de Usuario</h1>
          {currentUser && (
            <p className="text-sm text-muted-foreground mt-1">
              Conectado como: <span className="font-medium">{currentUser.name} {currentUser.lastName}</span> 
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                {currentUser.role}
              </span>
            </p>
          )}
        </div>
        {!isEditing ? (
          <Button 
            onClick={() => setIsEditing(true)}
            variant="default"
          >
            Editar Perfil
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button 
              onClick={handleCancel}
              variant="outline"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              variant="default"
            >
              Guardar Cambios
            </Button>
          </div>
        )}
      </div>

      {/* User Selector for Administrators */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Usuario</CardTitle>
            <CardDescription>
              Como administrador, puedes editar el perfil de cualquier usuario del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Label htmlFor="user-select">Usuario a editar</Label>
                <Select value={selectedUserId} onValueChange={handleUserChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingUsers ? (
                      <SelectItem value="" disabled>
                        Cargando usuarios...
                      </SelectItem>
                    ) : (
                      usersList.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          <div className="flex items-center space-x-2">
                            <span>{`${user.name} ${user.lastName}`}</span>
                            <span className="text-muted-foreground">({user.role})</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              {loadingUserData ? (
                <div className="text-sm text-muted-foreground">
                  Cargando datos...
                </div>
              ) : selectedUserId && (
                <div className="text-sm text-muted-foreground">
                  Editando: <span className="font-medium">{`${userData.nombre} ${userData.apellido}`}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              Información Personal
              {isAdmin && selectedUserId !== currentUser?.id?.toString() && (
                <span className="ml-2 text-sm font-normal text-orange-600 bg-orange-100 px-2 py-1 rounded">
                  Editando perfil de otro usuario
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {isAdmin && selectedUserId !== currentUser?.id?.toString() 
                ? `Editando información de ${userData.nombre} ${userData.apellido}`
                : 'Gestiona tu información personal y preferencias'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
                         <div className="flex items-center space-x-4">
               <Avatar className="h-20 w-20">
                 <AvatarImage 
                   src={userData.foto ? `/img/users/${userData.foto}` : '/placeholder-user.jpg'} 
                   alt={`${userData.nombre} ${userData.apellido}`}
                   onError={(e) => {
                     console.log('🔵 Error cargando imagen:', userData.foto);
                     e.currentTarget.src = '/placeholder-user.jpg';
                   }}
                 />
                 <AvatarFallback>{userData.nombre.charAt(0)}</AvatarFallback>
               </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{`${userData.nombre} ${userData.apellido}`}</h3>
                <p className="text-sm text-muted-foreground">{userData.role}</p>
                <p className="text-xs text-muted-foreground">RUN: {userData.run}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Campos para Administradores */}
              {isAdmin ? (
                <>
                  <div>
                    <Label htmlFor="run">RUN *</Label>
                    <Input
                      id="run"
                      value={userData.run}
                      onChange={(e) => setUserData({...userData, run: e.target.value})}
                      disabled={!isEditing}
                      placeholder="12.345.678-9"
                    />
                  </div>

                  <div>
                    <Label htmlFor="nick">Nickname</Label>
                    <Input
                      id="nick"
                      value={userData.nick}
                      onChange={(e) => handleAdminNickChange(e.target.value)}
                      disabled={!isEditing}
                      placeholder="usuario123"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      El email se actualizará automáticamente: {userData.nick}@lasmuñecasderamon.com
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input
                      id="nombre"
                      value={userData.nombre}
                      onChange={(e) => setUserData({...userData, nombre: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Juan"
                    />
                  </div>

                  <div>
                    <Label htmlFor="apellido">Apellido *</Label>
                    <Input
                      id="apellido"
                      value={userData.apellido}
                      onChange={(e) => setUserData({...userData, apellido: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Pérez"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="direccion">Dirección</Label>
                    <Input
                      id="direccion"
                      value={userData.direccion}
                      onChange={(e) => setUserData({...userData, direccion: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Av. Principal 123, Santiago"
                    />
                  </div>

                  <div>
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      type="tel"
                      value={userData.telefono}
                      onChange={(e) => setUserData({...userData, telefono: e.target.value})}
                      disabled={!isEditing}
                      placeholder="+56 9 1234 5678"
                    />
                  </div>

                  <div>
                    <Label htmlFor="estado_civil">Estado Civil</Label>
                    <Input
                      id="estado_civil"
                      value={userData.estado_civil}
                      onChange={(e) => setUserData({...userData, estado_civil: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Soltero"
                    />
                  </div>

                  <div>
                    <Label htmlFor="afp">AFP</Label>
                    <Input
                      id="afp"
                      value={userData.afp}
                      onChange={(e) => setUserData({...userData, afp: e.target.value})}
                      disabled={!isEditing}
                      placeholder="AFP Capital"
                    />
                  </div>

                  <div>
                    <Label htmlFor="aporte">Aporte (%)</Label>
                    <Input
                      id="aporte"
                      value={userData.aporte}
                      onChange={(e) => setUserData({...userData, aporte: e.target.value})}
                      disabled={!isEditing}
                      placeholder="10%"
                    />
                  </div>

                  <div>
                    <Label htmlFor="sueldo">Sueldo Base</Label>
                    <Input
                      id="sueldo"
                      type="number"
                      value={userData.sueldo}
                      onChange={(e) => setUserData({...userData, sueldo: parseInt(e.target.value) || 0})}
                      disabled={!isEditing}
                      placeholder="1500000"
                    />
                  </div>

                  <div>
                    <Label htmlFor="descuento">Descuento</Label>
                    <Input
                      id="descuento"
                      type="number"
                      value={userData.descuento}
                      onChange={(e) => setUserData({...userData, descuento: parseInt(e.target.value) || 0})}
                      disabled={!isEditing}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userData.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Se actualiza automáticamente con el nickname: {userData.nick}@lasmuñecasderamon.com
                    </p>
                  </div>

                                     <div>
                     <Label htmlFor="rol_id">Rol</Label>
                     <Select 
                       value={userData.rol_id?.toString()} 
                       onValueChange={(value) => setUserData({...userData, rol_id: parseInt(value)})}
                       disabled={!isEditing}
                     >
                       <SelectTrigger>
                         <SelectValue placeholder="Selecciona un rol">
                           {loadingRoles ? (
                             "Cargando roles..."
                           ) : (
                             (() => {
                               const currentRole = rolesList.find(role => role.id_rol === userData.rol_id);
                               console.log('🔵 Rol actual encontrado:', currentRole);
                               console.log('🔵 userData.rol_id:', userData.rol_id);
                               console.log('🔵 rolesList:', rolesList);
                               return currentRole?.nombre || "Selecciona un rol";
                             })()
                           )}
                         </SelectValue>
                       </SelectTrigger>
                       <SelectContent>
                         {loadingRoles ? (
                           <SelectItem value="" disabled>
                             Cargando roles...
                           </SelectItem>
                         ) : (
                           rolesList.map((role) => (
                             <SelectItem key={role.id_rol} value={role.id_rol.toString()}>
                               {role.nombre}
                             </SelectItem>
                           ))
                         )}
                       </SelectContent>
                     </Select>
                     <p className="text-xs text-muted-foreground mt-1">
                       Selecciona el rol del usuario (Roles disponibles: {rolesList.length})
                     </p>
                   </div>
                </>
              ) : (
                /* Campos para Usuarios No Administradores */
                <>
                  <div>
                    <Label htmlFor="nick">Nickname *</Label>
                    <Input
                      id="nick"
                      value={userData.nick}
                      onChange={(e) => handleNickChange(e.target.value)}
                      disabled={!isEditing}
                      placeholder="usuario123"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      El email se actualizará automáticamente: {userData.nick}@lasmuñecasderamon.com
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userData.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Se actualiza automáticamente con el nickname
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="direccion">Dirección</Label>
                    <Input
                      id="direccion"
                      value={userData.direccion}
                      onChange={(e) => setUserData({...userData, direccion: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Av. Principal 123, Santiago"
                    />
                  </div>

                  <div>
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      type="tel"
                      value={userData.telefono}
                      onChange={(e) => setUserData({...userData, telefono: e.target.value})}
                      disabled={!isEditing}
                      placeholder="+56 9 1234 5678"
                    />
                  </div>

                  <div>
                    <Label htmlFor="estado_civil">Estado Civil</Label>
                    <Input
                      id="estado_civil"
                      value={userData.estado_civil}
                      onChange={(e) => setUserData({...userData, estado_civil: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Soltero"
                    />
                  </div>
                </>
              )}

                             {/* Campo de foto para todos los usuarios */}
               <div className="md:col-span-2">
                 <Label htmlFor="foto">Foto de Perfil</Label>
                 
                 {/* Vista previa de la imagen actual */}
                 <div className="mb-3">
                   <p className="text-sm text-muted-foreground mb-2">
                     {userData.foto ? 'Imagen actual:' : 'Sin imagen de perfil'}
                   </p>
                   <div className="flex items-center space-x-3">
                     <img 
                       src={userData.foto ? `/img/users/${userData.foto}` : '/placeholder-user.jpg'} 
                       alt="Imagen actual" 
                       className="w-16 h-16 rounded-full object-cover border"
                       onError={(e) => {
                         console.log('🔵 Error cargando imagen en vista previa:', userData.foto);
                         e.currentTarget.src = '/placeholder-user.jpg';
                       }}
                     />
                     <div>
                       {userData.foto ? (
                         <>
                           <p className="text-xs text-muted-foreground">Archivo: {userData.foto}</p>
                           <p className="text-xs text-muted-foreground">Ruta: /img/users/{userData.foto}</p>
                         </>
                       ) : (
                         <p className="text-xs text-muted-foreground">Usando imagen por defecto</p>
                       )}
                     </div>
                   </div>
                 </div>
                 
                 <Input
                   id="foto"
                   type="file"
                   accept="image/*"
                   disabled={!isEditing}
                   onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (file) {
                       // Aquí iría la lógica para subir la imagen
                       const reader = new FileReader();
                       reader.onload = (event) => {
                         setUserData({...userData, foto: event.target?.result as string});
                       };
                       reader.readAsDataURL(file);
                     }
                   }}
                 />
                 <p className="text-xs text-muted-foreground mt-1">
                   Formatos permitidos: JPG, PNG, GIF. Máximo 5MB.
                 </p>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card>
          <CardHeader>
            <CardTitle>Seguridad</CardTitle>
            <CardDescription>
              Gestiona tu contraseña y configuraciones de seguridad
            </CardDescription>
          </CardHeader>
                     <CardContent className="space-y-4">
             {!isChangingPassword ? (
               <>
                 <div className="space-y-3">
                   <div>
                     <Label htmlFor="password">Contraseña</Label>
                     <Input
                       id="password"
                       type="password"
                       value="••••••••"
                       disabled
                       className="bg-muted"
                     />
                     <p className="text-xs text-muted-foreground mt-1">
                       Tu contraseña está segura
                     </p>
                   </div>
                 </div>
                 
                 <Button 
                   variant="outline" 
                   className="w-full"
                   onClick={handleChangePassword}
                 >
                   Cambiar Contraseña
                 </Button>
               </>
             ) : (
               <>
                 <div className="space-y-3">
                   <div>
                     <Label htmlFor="new-password">Nueva Contraseña</Label>
                     <Input
                       id="new-password"
                       type="password"
                       value={userData.password}
                       onChange={(e) => setUserData({...userData, password: e.target.value})}
                       placeholder="Ingresa tu nueva contraseña"
                     />
                   </div>
                   
                   <div>
                     <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                     <Input
                       id="confirm-password"
                       type="password"
                       placeholder="Confirma tu nueva contraseña"
                     />
                   </div>
                 </div>
                 
                 <div className="flex gap-2">
                   <Button 
                     variant="outline" 
                     className="flex-1"
                     onClick={() => {
                       setIsChangingPassword(false);
                       setUserData({ ...userData, password: '' });
                     }}
                   >
                     Cancelar
                   </Button>
                   <Button 
                     variant="default" 
                     className="flex-1"
                     onClick={handleSavePassword}
                   >
                     Guardar Contraseña
                   </Button>
                 </div>
               </>
             )}
            
            {/* Activity Section */}
            <Separator className="my-4" />
            <div>
              <h4 className="text-sm font-medium mb-3">Actividad Reciente</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Inicio de sesión</p>
                    <p className="text-xs text-muted-foreground">Hace 2 horas</p>
                  </div>
                  <span className="text-xs text-green-600">Exitoso</span>
                </div>
                
                <div className="flex items-center justify-between p-2 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Actualización de perfil</p>
                    <p className="text-xs text-muted-foreground">Hace 1 día</p>
                  </div>
                  <span className="text-xs text-blue-600">Completado</span>
                </div>
                
                <div className="flex items-center justify-between p-2 border rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Cambio de contraseña</p>
                    <p className="text-xs text-muted-foreground">Hace 1 semana</p>
                  </div>
                  <span className="text-xs text-green-600">Exitoso</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
