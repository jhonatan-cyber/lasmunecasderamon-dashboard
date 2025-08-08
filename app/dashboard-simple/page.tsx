'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardSimplePage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar token en localStorage
    const debugToken = localStorage.getItem('debug_token');
    console.log('🔍 Debug token found:', debugToken ? 'Yes' : 'No');

    // Simular datos de usuario para debugging
    setUserData({
      id: 1,
      email: 'admin@lasmuñecasderamon.com',
      role: 'Administrador',
      name: 'Admin'
    });
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('debug_token');
    window.location.href = '/login-simple';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard Simple (Test)
          </h1>
          <p className="text-gray-600">
            Página de prueba para verificar redirección después del login
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Usuario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>ID:</strong> {userData?.id}</p>
                <p><strong>Email:</strong> {userData?.email}</p>
                <p><strong>Rol:</strong> {userData?.role}</p>
                <p><strong>Nombre:</strong> {userData?.name}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Token Debug</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Token en localStorage:</strong></p>
                <p className="text-xs bg-gray-100 p-2 rounded break-all">
                  {localStorage.getItem('debug_token') || 'No token found'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  onClick={handleLogout}
                  variant="destructive"
                  className="w-full"
                >
                  Cerrar Sesión
                </Button>
                <Button 
                  onClick={() => window.location.href = '/login-simple'}
                  variant="outline"
                  className="w-full"
                >
                  Volver al Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Información de Debug</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>URL actual:</strong> {window.location.href}</p>
                <p><strong>User Agent:</strong> {navigator.userAgent}</p>
                <p><strong>Cookies disponibles:</strong> {document.cookie ? 'Sí' : 'No'}</p>
                <p><strong>Token en localStorage:</strong> {localStorage.getItem('debug_token') ? 'Sí' : 'No'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
