'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useUserImage } from '@/contexts/UserImageContext';
import { toast } from 'sonner';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const { user: currentUser, loading: userLoading, refetch: refetchCurrentUser } = useCurrentUser();
  const { updateImage } = useUserImage();

  // Detectar automáticamente si el usuario es administrador
  const isAdmin =
    currentUser?.role?.toLowerCase() === 'administrador' ||
    currentUser?.role?.toLowerCase() === 'admin';

  // Lista de usuarios para administradores
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Lista de roles disponibles
  const [rolesList, setRolesList] = useState<any[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);



  // Datos del usuario actual
  const [userData, setUserData] = useState<any>(null);
  const [loadingUserData, setLoadingUserData] = useState(false);

  const [originalData, setOriginalData] = useState<any>(null);
  
  // Estado para la vista previa de la nueva imagen
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);

  // Función para cargar lista de usuarios (solo para administradores)
  const loadUsersList = async () => {
    if (!isAdmin) return;

    try {
      setLoadingUsers(true);
      const res = await fetch('/api/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();
      if (data.success) {
        setUsersList(data.data || []);
      }
    } catch (error) {
      console.error('Error al cargar lista de usuarios:', error);
      toast.error('Error al cargar lista de usuarios');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Función para cargar lista de roles
  const loadRolesList = async () => {
    try {
      setLoadingRoles(true);

      // Verificar si hay token en localStorage
      const token = localStorage.getItem('token');

      const res = await fetch('/api/roles', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });

      const data = await res.json();

      if (data.success) {
        setRolesList(data.data || []);
      } else {
        toast.error('Error al cargar roles: ' + data.message);
      }
    } catch (error) {
      console.error('Error al cargar lista de roles:', error);
      toast.error('Error al cargar lista de roles');
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
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();
      if (data.success && data.user) {
        setUserData(data.user);
        setOriginalData(data.user);
        setSelectedUserId(userId);
      } else {
        console.error('Error al cargar datos del usuario:', data.message);
        toast.error('Error al cargar datos del usuario: ' + data.message);
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
      toast.error('Error al cargar datos del usuario');
    } finally {
      setLoadingUserData(false);
    }
  };

  // Load initial user data
  useEffect(() => {
    if (userLoading) return; // Esperar a que se cargue el usuario actual

    // Si hay un usuario autenticado y no hay fecha de login en sessionStorage, establecerla
    if (currentUser && !sessionStorage.getItem('loginTime')) {
      sessionStorage.setItem('loginTime', new Date().toISOString());
    }

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
      if (
        confirm(
          '¿Estás seguro de que quieres cambiar de usuario? Se perderán los cambios no guardados.'
        )
      ) {
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
      // Verificar si hay una imagen para subir
      const fileInput = document.getElementById('foto') as HTMLInputElement;
      const hasNewImage = fileInput && fileInput.files && fileInput.files.length > 0;

      let res;

      if (hasNewImage) {
        // Si hay imagen, usar FormData
        const formData = new FormData();
        formData.append('run', userData.run);
        formData.append('nick', userData.nick);
        formData.append('nombre', userData.nombre);
        formData.append('apellido', userData.apellido);
        formData.append('direccion', userData.direccion);
        formData.append('telefono', userData.telefono);
        formData.append('estado_civil', userData.estado_civil);
        formData.append('rol_id', userData.rol_id.toString());

        // Agregar la imagen
        const selectedFile = fileInput.files?.[0];
        if (selectedFile) {
          formData.append('foto', selectedFile);
        }

        res = await fetch(`/api/users/${userData.id}`, {
          method: 'PUT',
          body: formData // No incluir Content-Type, se establece automáticamente
        });
      } else {
        // Si no hay imagen, usar JSON
        res = await fetch(`/api/users/${userData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            run: userData.run,
            nick: userData.nick,
            nombre: userData.nombre,
            apellido: userData.apellido,
            direccion: userData.direccion,
            telefono: userData.telefono,
            estado_civil: userData.estado_civil,
            rol_id: userData.rol_id
          })
        });
      }

            const data = await res.json();
      if (data.success) {
        setOriginalData({ ...userData });
        setIsEditing(false);
        setNewImagePreview(null); // Limpiar vista previa de nueva imagen
        
        // Mostrar información sobre los cambios realizados
        let message = 'Perfil actualizado exitosamente';
        if (data.changes) {
          const changes = [];
          if (data.changes.passwordUpdated) changes.push('contraseña actualizada');
          if (data.changes.emailUpdated) changes.push('email actualizado');
          if (data.changes.photoUpdated) changes.push('foto actualizada');
          
          if (changes.length > 0) {
            message += ` (${changes.join(', ')})`;
          }
        }
        
        toast.success(message);
        
        // Recargar datos del usuario para asegurar sincronización
        await loadUserData(userData.id.toString());
        
        // Actualizar el header con la nueva información del usuario
        await refetchCurrentUser();
        
        // Forzar actualización de la imagen en el header
        updateImage();
      } else {
        throw new Error(data.message || 'Error al actualizar perfil');
      }
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      toast.error('Error al actualizar perfil');
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
    setNewImagePreview(null); // Limpiar vista previa de nueva imagen
  };

  const handleChangePassword = () => {
    setIsChangingPassword(true);
  };

  // Función para decodificar token JWT (solo la parte del payload)
  const decodeToken = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

      // Agregar padding si es necesario
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

      const jsonPayload = decodeURIComponent(
        atob(padded)
          .split('')
          .map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );

      const decoded = JSON.parse(jsonPayload);
      return decoded;
    } catch (error) {
      console.error('Error decodificando token:', error);
      return null;
    }
  };

  // Función para obtener fecha de inicio de sesión
  const getLoginTime = () => {
    try {
      // Primero intentar obtener desde sessionStorage (más confiable)
      const sessionLoginTime = sessionStorage.getItem('loginTime');
      if (sessionLoginTime) {
        return new Date(sessionLoginTime);
      }

      // Si no hay en sessionStorage, intentar desde el token
      const token = localStorage.getItem('token');

      if (!token) return null;

      // Intentar usar jwt-decode si está disponible (más robusto)
      let decoded = null;
      try {
        // @ts-ignore
        if (typeof window !== 'undefined' && window.jwt_decode) {
          // @ts-ignore
          decoded = window.jwt_decode(token);
        } else {
          decoded = decodeToken(token);
        }
      } catch (decodeError) {
        decoded = decodeToken(token);
      }

      if (decoded && decoded.iat) {
        const loginDate = new Date(decoded.iat * 1000);
        // Guardar en sessionStorage para futuras consultas
        sessionStorage.setItem('loginTime', loginDate.toISOString());
        return loginDate;
      }

      // Si no hay iat, intentar con exp (expiration time) como fallback
      if (decoded && decoded.exp) {
        // Restar 24 horas del tiempo de expiración como aproximación
        const loginDate = new Date((decoded.exp - 24 * 60 * 60) * 1000);
        // Guardar en sessionStorage para futuras consultas
        sessionStorage.setItem('loginTime', loginDate.toISOString());
        return loginDate;
      }

      return null;
    } catch (error) {
      console.error('Error obteniendo fecha de login:', error);
      return null;
    }
  };

  // Función para formatear fechas de manera amigable
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';

    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      return 'Hace menos de 1 hora';
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    } else if (diffInDays < 7) {
      return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  };

  const handleSavePassword = async () => {
    if (!userData || !userData.password) {
      toast.error('Por favor ingresa una nueva contraseña');
      return;
    }

    // Validar que la contraseña tenga al menos 6 caracteres
    if (userData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // Validar que las contraseñas coincidan
    if (userData.password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    try {
      const res = await fetch(`/api/users/${userData.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: userData.password
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsChangingPassword(false);
        setUserData({ ...userData, password: '' });
        setConfirmPassword('');
        toast.success('Contraseña actualizada exitosamente');

        // Recargar datos del usuario para actualizar fecha_mod
        await loadUserData(userData.id.toString());
        
        // Actualizar el header con la nueva información del usuario
        await refetchCurrentUser();
        
        // Forzar actualización de la imagen en el header
        updateImage();
      } else {
        throw new Error(data.message || 'Error al actualizar contraseña');
      }
    } catch (error) {
      console.error('Error al actualizar contraseña:', error);
      toast.error('Error al actualizar la contraseña');
    }
  };

  // Mostrar loading mientras se carga el usuario
  if (userLoading || loadingUserData || loadingRoles) {
    return (
      <div className='container mx-auto p-6'>
        <div className='flex items-center justify-center h-64'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto'></div>
            <p className='mt-2 text-gray-600'>Cargando perfil...</p>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar error si no hay datos de usuario
  if (!userData) {
    return (
      <div className='container mx-auto p-6'>
        <div className='flex items-center justify-center h-64'>
          <div className='text-center'>
            <p className='text-red-600'>Error al cargar los datos del usuario</p>
            <Button
              onClick={() => currentUser && loadUserData(currentUser.id.toString())}
              className='mt-4 whitespace-nowrap inline-flex items-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3'
            >
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Perfil de Usuario</h1>
          {currentUser && (
            <p className='text-sm text-muted-foreground mt-1'>
              Conectado como:{' '}
              <span className='font-medium'>
                {currentUser.name} {currentUser.lastName}
              </span>
              <span className='ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded'>
                {currentUser.role}
              </span>
            </p>
          )}
        </div>
        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            variant='outline'
            className='whitespace-nowrap inline-flex items-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3'
          >
            Editar Perfil
          </Button>
        ) : (
          <div className='flex gap-2'>
            <Button
              onClick={handleCancel}
              variant='outline'
              className='whitespace-nowrap inline-flex items-center hover:bg-black hover:text-white   rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3'
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              variant='outline'
              className='whitespace-nowrap inline-flex items-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3'
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
            <div className='flex items-center space-x-4'>
              <div className='flex-1'>
                <Label htmlFor='user-select'>Usuario a editar</Label>
                <Select value={selectedUserId} onValueChange={handleUserChange}>
                  <SelectTrigger className='rounded-full'>
                    <SelectValue placeholder='Selecciona un usuario' />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingUsers ? (
                      <SelectItem value='loading-users' disabled>
                        Cargando usuarios...
                      </SelectItem>
                    ) : usersList.length === 0 ? (
                      <SelectItem value='no-users' disabled>
                        No hay usuarios disponibles
                      </SelectItem>
                    ) : (
                      usersList.map(user => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          <div className='flex items-center space-x-2'>
                            <span>{`${user.name} ${user.lastName}`}</span>
                            <span className='text-muted-foreground'>({user.role})</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              {loadingUserData ? (
                <div className='text-sm text-muted-foreground'>Cargando datos...</div>
              ) : (
                selectedUserId && (
                  <div className='text-sm text-muted-foreground'>
                    Editando:{' '}
                    <span className='font-medium'>{`${userData.nombre} ${userData.apellido}`}</span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className='grid gap-6 md:grid-cols-2'>
        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>
              Información Personal
              {isAdmin && selectedUserId !== currentUser?.id?.toString() && (
                <span className='ml-2 text-sm font-normal text-orange-600 bg-orange-100 px-2 py-1 rounded'>
                  Editando perfil de otro usuario
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {isAdmin && selectedUserId !== currentUser?.id?.toString()
                ? `Editando información de ${userData.nombre} ${userData.apellido}`
                : 'Gestiona tu información personal y preferencias'}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center space-x-4'>
              <Avatar className='h-20 w-20'>
                <AvatarImage
                  src={userData.foto ? `/img/users/${userData.foto}` : '/placeholder-user.jpg'}
                  alt={`${userData.nombre} ${userData.apellido}`}
                  onError={e => {
                    e.currentTarget.src = '/placeholder-user.jpg';
                  }}
                />
                <AvatarFallback>{userData.nombre.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className='text-lg font-semibold'>{`${userData.nombre} ${userData.apellido}`}</h3>
                <p className='text-sm text-muted-foreground'>{userData.role}</p>
                <p className='text-xs text-muted-foreground'>RUN: {userData.run}</p>
              </div>
            </div>

            <Separator />

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Campos para Administradores */}
              {isAdmin ? (
                <>
                  <div>
                    <Label htmlFor='run'>RUN *</Label>
                    <Input
                      id='run'
                      value={userData.run || ''}
                      onChange={e => setUserData({ ...userData, run: e.target.value })}
                      disabled={!isEditing}
                      placeholder='12.345.678-9'
                    />
                  </div>

                  <div>
                    <Label htmlFor='nick'>Nickname</Label>
                    <Input
                      id='nick'
                      value={userData.nick || ''}
                      onChange={e => handleAdminNickChange(e.target.value)}
                      disabled={!isEditing || userData.role?.toLowerCase() === 'anfitriona' || userData.role?.toLowerCase() === 'garzon'}
                      placeholder='usuario123'
                    />
                    <p className='text-xs text-muted-foreground mt-1'>
                      El email se actualizará automáticamente: {userData.nick}@lasmuñecasderamon.com
                      {(userData.role?.toLowerCase() === 'anfitriona' || userData.role?.toLowerCase() === 'garzon') && (
                        <span className='text-orange-600 font-medium'> - No editable para anfitrionas y garzones</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor='nombre'>Nombre *</Label>
                    <Input
                      id='nombre'
                      value={userData.nombre || ''}
                      onChange={e => setUserData({ ...userData, nombre: e.target.value })}
                      disabled={!isEditing}
                      placeholder='Juan'
                    />
                  </div>

                  <div>
                    <Label htmlFor='apellido'>Apellido *</Label>
                    <Input
                      id='apellido'
                      value={userData.apellido || ''}
                      onChange={e => setUserData({ ...userData, apellido: e.target.value })}
                      disabled={!isEditing}
                      placeholder='Pérez'
                    />
                  </div>

                  <div className='md:col-span-2'>
                    <Label htmlFor='direccion'>Dirección</Label>
                    <Input
                      id='direccion'
                      value={userData.direccion || ''}
                      onChange={e => setUserData({ ...userData, direccion: e.target.value })}
                      disabled={!isEditing}
                      placeholder='Av. Principal 123, Santiago'
                    />
                  </div>

                  <div>
                    <Label htmlFor='telefono'>Teléfono</Label>
                    <Input
                      id='telefono'
                      type='tel'
                      value={userData.telefono || ''}
                      onChange={e => setUserData({ ...userData, telefono: e.target.value })}
                      disabled={!isEditing}
                      placeholder='+56 9 1234 5678'
                    />
                  </div>

                  <div>
                    <Label htmlFor='estado_civil'>Estado Civil</Label>
                    <Select
                      value={userData.estado_civil || ''}
                      onValueChange={value => setUserData({ ...userData, estado_civil: value })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className='rounded-full'>
                        <SelectValue placeholder='Seleccione estado civil' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='Soltero'>Soltero/a</SelectItem>
                        <SelectItem value='Casado'>Casado/a</SelectItem>
                        <SelectItem value='Divorciado'>Divorciado/a</SelectItem>
                        <SelectItem value='Viudo'>Viudo/a</SelectItem>
                        <SelectItem value='Separado'>Separado/a</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor='email'>Email</Label>
                    <Input
                      id='email'
                      type='email'
                      value={userData.email || ''}
                      disabled
                      className='bg-muted'
                    />
                    <p className='text-xs text-muted-foreground mt-1'>
                      Se actualiza automáticamente con el nickname: {userData.nick || ''}
                      @lasmuñecasderamon.com
                    </p>
                  </div>

                  <div>
                    <Label htmlFor='rol_id'>Rol</Label>
                    <Select
                      value={userData.rol_id ? userData.rol_id.toString() : ''}
                      onValueChange={value => setUserData({ ...userData, rol_id: parseInt(value) })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className='rounded-full'>
                        <SelectValue placeholder='Selecciona un rol'>
                          {loadingRoles
                            ? 'Cargando roles...'
                            : (() => {
                                const currentRole = rolesList.find(
                                  role => role.id_rol === userData.rol_id
                                );
                                return currentRole?.nombre || 'Selecciona un rol';
                              })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {loadingRoles ? (
                          <SelectItem value='loading' disabled>
                            Cargando roles...
                          </SelectItem>
                        ) : rolesList.length === 0 ? (
                          <SelectItem value='no-roles' disabled>
                            No hay roles disponibles
                          </SelectItem>
                        ) : (
                          rolesList.map(role => (
                            <SelectItem key={role.id_rol} value={role.id_rol.toString()}>
                              {role.nombre}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className='text-xs text-muted-foreground mt-1'>
                      Selecciona el rol del usuario (Roles disponibles: {rolesList.length})
                    </p>
                  </div>
                </>
              ) : (
                /* Campos para Usuarios No Administradores */
                <>
                  <div>
                    <Label htmlFor='nick'>Nickname *</Label>
                    <Input
                      id='nick'
                      value={userData.nick || ''}
                      onChange={e => handleNickChange(e.target.value)}
                      disabled={!isEditing || userData.role?.toLowerCase() === 'anfitriona' || userData.role?.toLowerCase() === 'garzon'}
                      placeholder='usuario123'
                    />
                    <p className='text-xs text-muted-foreground mt-1'>
                      El email se actualizará automáticamente: {userData.nick || ''}
                      @lasmuñecasderamon.com
                      {(userData.role?.toLowerCase() === 'anfitriona' || userData.role?.toLowerCase() === 'garzon') && (
                        <span className='text-orange-600 font-medium'> - No editable para anfitrionas y garzones</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor='email'>Email</Label>
                    <Input
                      id='email'
                      type='email'
                      value={userData.email || ''}
                      disabled
                      className='bg-muted'
                    />
                    <p className='text-xs text-muted-foreground mt-1'>
                      Se actualiza automáticamente con el nickname
                    </p>
                  </div>

                  <div className='md:col-span-2'>
                    <Label htmlFor='direccion'>Dirección</Label>
                    <Input
                      id='direccion'
                      value={userData.direccion || ''}
                      onChange={e => setUserData({ ...userData, direccion: e.target.value })}
                      disabled={!isEditing}
                      placeholder='Av. Principal 123, Santiago'
                    />
                  </div>

                  <div>
                    <Label htmlFor='telefono'>Teléfono</Label>
                    <Input
                      id='telefono'
                      type='tel'
                      value={userData.telefono || ''}
                      onChange={e => setUserData({ ...userData, telefono: e.target.value })}
                      disabled={!isEditing}
                      placeholder='+56 9 1234 5678'
                    />
                  </div>

                  <div>
                    <Label htmlFor='estado_civil'>Estado Civil</Label>
                    <Select
                      value={userData.estado_civil || ''}
                      onValueChange={value => setUserData({ ...userData, estado_civil: value })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className='rounded-full'>
                        <SelectValue placeholder='Seleccione estado civil' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='Soltero'>Soltero/a</SelectItem>
                        <SelectItem value='Casado'>Casado/a</SelectItem>
                        <SelectItem value='Divorciado'>Divorciado/a</SelectItem>
                        <SelectItem value='Viudo'>Viudo/a</SelectItem>
                        <SelectItem value='Separado'>Separado/a</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Campo de foto para todos los usuarios */}
              <div className='md:col-span-2'>
                <Label htmlFor='foto'>Foto de Perfil</Label>

                {/* Vista previa de la imagen - solo cuando se selecciona una nueva */}
                {newImagePreview && (
                  <div className='mb-3'>
                    <p className='text-sm text-muted-foreground mb-2'>Nueva imagen seleccionada:</p>
                    <div className='flex items-center space-x-3'>
                      <img
                        src={newImagePreview}
                        alt='Nueva imagen'
                        className='w-16 h-16 rounded-full object-cover border'
                                                 onError={e => {
                           e.currentTarget.src = '/placeholder-user.jpg';
                         }}
                      />
                      <div>
                        <p className='text-xs text-muted-foreground'>Nueva imagen seleccionada</p>
                        <p className='text-xs text-muted-foreground'>Se guardará al actualizar el perfil</p>
                      </div>
                    </div>
                  </div>
                )}

                <Input
                  id='foto'
                  type='file'
                  accept='image/*'
                  disabled={!isEditing}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Crear vista previa de la nueva imagen
                      const reader = new FileReader();
                      reader.onload = event => {
                        setNewImagePreview(event.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    } else {
                      setNewImagePreview(null);
                    }
                  }}
                />
                <p className='text-xs text-muted-foreground mt-1'>
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
            <CardDescription>Gestiona tu contraseña y configuraciones de seguridad</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {!isChangingPassword ? (
              <>
                <div className='space-y-3'>
                  <div>
                    <Label htmlFor='password'>Contraseña</Label>
                    <Input
                      id='password'
                      type='password'
                      value='••••••••'
                      disabled
                      className='bg-muted'
                    />
                    <p className='text-xs text-muted-foreground mt-1'>Tu contraseña está segura</p>
                  </div>
                </div>

                <Button
                  variant='outline'
                  className='w-full whitespace-nowrap inline-flex items-center justify-center bg-black text-white rounded-full transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3'
                  onClick={handleChangePassword}
                >
                  Cambiar Contraseña
                </Button>
              </>
            ) : (
              <>
                <div className='space-y-3'>
                  <div>
                    <Label htmlFor='new-password'>Nueva Contraseña</Label>
                    <Input
                      id='new-password'
                      type='password'
                      value={userData.password || ''}
                      onChange={e => setUserData({ ...userData, password: e.target.value })}
                      placeholder='Ingresa tu nueva contraseña'
                    />
                    {userData.password && (
                      <div className='mt-1'>
                        <div className='flex space-x-1'>
                          <div
                            className={`h-1 flex-1 rounded ${
                              userData.password.length < 6
                                ? 'bg-red-500'
                                : userData.password.length < 8
                                  ? 'bg-yellow-500'
                                  : userData.password.length < 10
                                    ? 'bg-blue-500'
                                    : 'bg-green-500'
                            }`}
                          ></div>
                        </div>
                        <p
                          className={`text-xs mt-1 ${
                            userData.password.length < 6
                              ? 'text-red-600'
                              : userData.password.length < 8
                                ? 'text-yellow-600'
                                : userData.password.length < 10
                                  ? 'text-blue-600'
                                  : 'text-green-600'
                          }`}
                        >
                          {userData.password.length < 6
                            ? 'Débil'
                            : userData.password.length < 8
                              ? 'Media'
                              : userData.password.length < 10
                                ? 'Buena'
                                : 'Excelente'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor='confirm-password'>Confirmar Nueva Contraseña</Label>
                    <Input
                      id='confirm-password'
                      type='password'
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder='Confirma tu nueva contraseña'
                    />
                    {confirmPassword &&
                      userData.password &&
                      confirmPassword !== userData.password && (
                        <p className='text-xs text-red-600 mt-1'>Las contraseñas no coinciden</p>
                      )}
                  </div>
                </div>

                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    className='flex-1 whitespace-nowrap inline-flex items-center justify-center bg-gray-100 text-gray-700 border border-gray-300 rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3'
                    onClick={() => {
                      setIsChangingPassword(false);
                      setUserData({ ...userData, password: '' });
                      setConfirmPassword('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant='default'
                    className='flex-1 whitespace-nowrap inline-flex items-center justify-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3'
                    onClick={handleSavePassword}
                  >
                    Guardar Contraseña
                  </Button>
                </div>
              </>
            )}

            {/* Activity Section */}
            <Separator className='my-4' />
            <div>
              <h4 className='text-sm font-medium mb-3'>Actividad Reciente</h4>
              <div className='space-y-3'>
                <div className='flex items-center justify-between p-2 border rounded-lg'>
                  <div>
                    <p className='text-sm font-medium'>Inicio de sesión</p>
                    <p className='text-xs text-muted-foreground'>
                      {(() => {
                        const loginDate = getLoginTime();
                        return loginDate ? formatDate(loginDate.toISOString()) : 'No disponible';
                      })()}
                    </p>
                  </div>
                  <span className='text-xs text-green-600'>Exitoso</span>
                </div>

                <div className='flex items-center justify-between p-2 border rounded-lg'>
                  <div>
                    <p className='text-sm font-medium'>Actualización de perfil</p>
                    <p className='text-xs text-muted-foreground'>
                      {userData.fecha_mod ? formatDate(userData.fecha_mod) : 'Nunca'}
                    </p>
                  </div>
                  <span className='text-xs text-blue-600'>Completado</span>
                </div>

                <div className='flex items-center justify-between p-2 border rounded-lg'>
                  <div>
                    <p className='text-sm font-medium'>Cambio de contraseña</p>
                    <p className='text-xs text-muted-foreground'>
                      {userData.fecha_mod ? formatDate(userData.fecha_mod) : 'Nunca'}
                    </p>
                  </div>
                  <span className='text-xs text-green-600'>Exitoso</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
