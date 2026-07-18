'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useUserImage } from '@/contexts/UserImageContext';
import { toast } from 'sonner';
import { EMAIL_DOMAIN } from '@/lib/constants/email';
import { formatDateLabel } from '@/lib/utils/calendarUtils';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileUserSelector } from '@/components/profile/ProfileUserSelector';
import { ProfilePersonalInfoCard } from '@/components/profile/ProfilePersonalInfoCard';
import { ProfileSecurityCard } from '@/components/profile/ProfileSecurityCard';
import logger from '@/lib/utils/logger';

import {
  normalizeProfileUserData,
  type ProfileCurrentUser,
  type ProfileRoleOption,
  type ProfileUserData,
  type ProfileUserOption
} from '@/components/profile/profile-types';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const {
    user: currentUserRaw,
    loading: userLoading,
    refetch: refetchCurrentUser
  } = useCurrentUser();
  const { updateImage } = useUserImage();
  const currentUser = (currentUserRaw as ProfileCurrentUser | null) ?? null;

  const [usersList, setUsersList] = useState<ProfileUserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [rolesList, setRolesList] = useState<ProfileRoleOption[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [userData, setUserData] = useState<ProfileUserData | null>(null);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [originalData, setOriginalData] = useState<ProfileUserData | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);

  const isAdmin = useMemo(
    () =>
      currentUser?.role?.toLowerCase() === 'administrador' ||
      currentUser?.role?.toLowerCase() === 'admin',
    [currentUser]
  );

  const loadUsersList = useCallback(async () => {
    if (!isAdmin) return;

    try {
      setLoadingUsers(true);
      const res = await fetch('/api/users', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      if (data.success) {
        setUsersList(data.data || []);
      }
    } catch (error) {
      logger.captureException(error, { context: 'Profile:fetchProfile' });
      toast.error('Error al cargar lista de usuarios');
    } finally {
      setLoadingUsers(false);
    }
  }, [isAdmin]);

  const loadRolesList = useCallback(async () => {
    try {
      setLoadingRoles(true);
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
        toast.error(`Error al cargar roles: ${data.message}`);
      }
    } catch (error) {
      logger.captureException(error, { context: 'Profile:loadProfileData' });
      toast.error('Error al cargar lista de roles');
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      setLoadingUserData(true);
      const res = await fetch(`/api/users/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await res.json();
      if (data.success && data.user) {
        const normalizedUser = normalizeProfileUserData(data.user);
        setUserData(normalizedUser);
        setOriginalData(normalizedUser);
        setSelectedUserId(userId);
      } else {
        logger.error('Error al cargar datos del usuario:', data.message);
        toast.error(`Error al cargar datos del usuario: ${data.message}`);
      }
    } catch (error) {
      logger.captureException(error, { context: 'Profile:updateProfile' });
      toast.error('Error al cargar datos del usuario');
    } finally {
      setLoadingUserData(false);
    }
  }, []);

  useEffect(() => {
    if (userLoading) return;

    if (currentUser && !sessionStorage.getItem('loginTime')) {
      sessionStorage.setItem('loginTime', new Date().toISOString());
    }

    loadRolesList();

    if (isAdmin && !selectedUserId) {
      if (currentUser) {
        loadUserData(currentUser.id.toString());
      }
      loadUsersList();
    } else if (!isAdmin && currentUser) {
      loadUserData(currentUser.id.toString());
    }
  }, [
    isAdmin,
    selectedUserId,
    userLoading,
    currentUser,
    loadRolesList,
    loadUserData,
    loadUsersList
  ]);

  const handleUserChange = (userId: string) => {
    if (isEditing) {
      if (
        confirm(
          '¿Estás seguro de que querés cambiar de usuario? Se perderán los cambios no guardados.'
        )
      ) {
        setIsEditing(false);
        loadUserData(userId);
      }
    } else {
      loadUserData(userId);
    }
  };

  const handleNickChange = (newNick: string) => {
    if (!userData) return;

    setUserData({
      ...userData,
      nick: newNick,
      email: `${newNick}${EMAIL_DOMAIN}`
    });
  };

  const handleAdminNickChange = (newNick: string) => {
    if (!userData) return;

    setUserData({
      ...userData,
      nick: newNick,
      email: `${newNick}${EMAIL_DOMAIN}`
    });
  };

  const handleSave = async () => {
    if (!userData) return;

    try {
      const fileInput = document.getElementById('foto') as HTMLInputElement | null;
      const hasNewImage = !!(fileInput?.files && fileInput.files.length > 0);

      let res: Response;

      if (hasNewImage && fileInput?.files?.[0]) {
        const formData = new FormData();
        formData.append('run', userData.run);
        formData.append('nick', userData.nick);
        formData.append('nombre', userData.nombre);
        formData.append('apellido', userData.apellido);
        formData.append('direccion', userData.direccion);
        formData.append('telefono', userData.telefono);
        formData.append('estado_civil', userData.estado_civil);
        formData.append('rol_id', userData.rol_id.toString());
        formData.append('foto', fileInput.files[0]);

        res = await fetch(`/api/users/${userData.id}`, {
          method: 'PUT',
          body: formData
        });
      } else {
        res = await fetch(`/api/users/${userData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
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
        setNewImagePreview(null);

        let message = 'Perfil actualizado exitosamente';
        if (data.changes) {
          const changes: string[] = [];
          if (data.changes.passwordUpdated) changes.push('contraseña actualizada');
          if (data.changes.emailUpdated) changes.push('email actualizado');
          if (data.changes.photoUpdated) changes.push('foto actualizada');

          if (changes.length > 0) {
            message += ` (${changes.join(', ')})`;
          }
        }

        toast.success(message);
        await loadUserData(userData.id.toString());
        await refetchCurrentUser();
        updateImage();
      } else {
        throw new Error(data.message || 'Error al actualizar perfil');
      }
    } catch (error) {
      logger.captureException(error, { context: 'Profile:changePassword' });
      toast.error('Error al actualizar perfil');
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
    setNewImagePreview(null);
  };

  const decodeToken = (token: string) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

      const jsonPayload = decodeURIComponent(
        atob(padded)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonPayload);
    } catch (error) {
      logger.captureException(error, { context: 'Profile:updatePreferences' });
      return null;
    }
  };

  const getLoginTime = () => {
    try {
      const sessionLoginTime = sessionStorage.getItem('loginTime');
      if (sessionLoginTime) {
        return new Date(sessionLoginTime);
      }

      const token = localStorage.getItem('token');
      if (!token) return null;

      let decoded: { iat?: number; exp?: number } | null = null;

      try {
        if (typeof window !== 'undefined' && 'jwt_decode' in window) {
          decoded =
            (
              window as Window & { jwt_decode?: (jwt: string) => { iat?: number; exp?: number } }
            ).jwt_decode?.(token) || null;
        } else {
          decoded = decodeToken(token);
        }
      } catch {
        decoded = decodeToken(token);
      }

      if (decoded?.iat) {
        const loginDate = new Date(decoded.iat * 1000);
        sessionStorage.setItem('loginTime', loginDate.toISOString());
        return loginDate;
      }

      if (decoded?.exp) {
        const loginDate = new Date((decoded.exp - 24 * 60 * 60) * 1000);
        sessionStorage.setItem('loginTime', loginDate.toISOString());
        return loginDate;
      }

      return null;
    } catch (error) {
      logger.captureException(error, { context: 'Profile:fetchHistory' });
      return null;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';

    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) return 'Hace menos de 1 hora';
    if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    if (diffInDays < 7) return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
    return formatDateLabel(date);
  };

  const handleSavePassword = async () => {
    if (!userData || !userData.password) {
      toast.error('Por favor ingresá una nueva contraseña');
      return;
    }

    if (userData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (userData.password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    try {
      const res = await fetch(`/api/users/${userData.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: userData.password })
      });

      const data = await res.json();
      if (data.success) {
        setIsChangingPassword(false);
        setUserData({ ...userData, password: '' });
        setConfirmPassword('');
        toast.success('Contraseña actualizada exitosamente');
        await loadUserData(userData.id.toString());
        await refetchCurrentUser();
        updateImage();
      } else {
        throw new Error(data.message || 'Error al actualizar contraseña');
      }
    } catch (error) {
      logger.captureException(error, { context: 'Profile:updateAvatar' });
      toast.error('Error al actualizar la contraseña');
    }
  };

  useEffect(() => {
    if (!userData?.qr_token || isAdmin) return;

    const checkQR = async () => {
      try {
        const res = await fetch(`/api/users/${userData.id}`);
        const data = await res.json();
        if (data.success && data.user && data.user.qr_token !== userData.qr_token) {
          setUserData(data.user);
        }
      } catch (error) {
        logger.captureException(error, { context: 'Profile:checkQR' });
      }
    };

    const es = new EventSource('/api/notifications/sse');
    es.onmessage = event => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'qr_token_updated' && payload.data?.userId == userData.id) {
          checkQR();
        }
      } catch {}
    };

    return () => {
      es.close();
    };
  }, [userData?.id, userData?.qr_token, isAdmin]);

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

  const loginTimeLabel = (() => {
    const loginDate = getLoginTime();
    return loginDate ? formatDate(loginDate.toISOString()) : 'No disponible';
  })();

  return (
    <BoneyardSkeleton name="profile-main" loading={userLoading || loadingUserData || loadingRoles}>
    <div className='flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 lg:p-10 mt-4 sm:mt-6 lg:mt-10'>
      <ProfileHeader
        currentUser={currentUser}
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onCancel={handleCancel}
        onSave={handleSave}
      />

      {isAdmin && (
        <ProfileUserSelector
          selectedUserId={selectedUserId}
          loadingUsers={loadingUsers}
          loadingUserData={loadingUserData}
          usersList={usersList}
          userData={userData}
          onUserChange={handleUserChange}
          onRefreshQr={() => loadUserData(userData.id.toString())}
        />
      )}

      <div className='grid gap-6 md:grid-cols-2'>
        <ProfilePersonalInfoCard
          currentUser={currentUser}
          userData={userData}
          isAdmin={isAdmin}
          isEditing={isEditing}
          loadingRoles={loadingRoles}
          rolesList={rolesList}
          newImagePreview={newImagePreview}
          onUserDataChange={setUserData}
          onNickChange={handleNickChange}
          onAdminNickChange={handleAdminNickChange}
          onImagePreviewChange={setNewImagePreview}
        />

        <ProfileSecurityCard
          userData={userData}
          isChangingPassword={isChangingPassword}
          confirmPassword={confirmPassword}
          onChangePasswordMode={() => setIsChangingPassword(true)}
          onCancelPasswordChange={() => {
            setIsChangingPassword(false);
            setUserData({ ...userData, password: '' });
            setConfirmPassword('');
          }}
          onPasswordChange={password => setUserData({ ...userData, password })}
          onConfirmPasswordChange={setConfirmPassword}
          onSavePassword={handleSavePassword}
          getLoginTimeLabel={() => loginTimeLabel}
          formatDate={formatDate}
        />
      </div>
    </div>
    </BoneyardSkeleton>
  );
}
