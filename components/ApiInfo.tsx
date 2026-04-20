import React from 'react';

interface ApiInfoProps {
  className?: string;
}

export const ApiInfo: React.FC<ApiInfoProps> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h2 className='text-2xl font-bold text-gray-900 mb-4'>Información de la API</h2>

      <div className='space-y-6'>
        <div>
          <h3 className='text-lg font-semibold text-blue-600 mb-3'>🔐 Autenticación</h3>
          <div className='bg-blue-50 p-4 rounded-lg'>
            <p className='text-sm text-blue-800 mb-2'>
              La API utiliza autenticación JWT. Puedes autenticarte de dos formas:
            </p>
            <ul className='text-sm text-blue-800 space-y-1'>
              <li>
                • <strong>Bearer Token:</strong> Incluye el token en el header Authorization
              </li>
              <li>
                • <strong>Cookie:</strong> El token se almacena automáticamente en las cookies
              </li>
            </ul>
            <div className='mt-3 p-3 bg-blue-100 rounded text-xs font-mono'>
              Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
            </div>
          </div>
        </div>
        <div>
          <h3 className='text-lg font-semibold text-green-600 mb-3'>📋 Formato de Respuesta</h3>
          <div className='bg-green-50 p-4 rounded-lg'>
            <p className='text-sm text-green-800 mb-2'>
              Todas las respuestas siguen este formato estándar:
            </p>
            <div className='bg-green-100 p-3 rounded text-xs font-mono'>
              {`{
  "success": true,
  "data": {...},
  "message": "Operación exitosa"
}`}
            </div>
          </div>
        </div>
        <div>
          <h3 className='text-lg font-semibold text-purple-600 mb-3'>🚦 Códigos de Estado HTTP</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            <div className='bg-purple-50 p-3 rounded'>
              <div className='flex items-center space-x-2'>
                <span className='w-3 h-3 bg-green-500 rounded-full'></span>
                <span className='text-sm font-semibold text-purple-800'>200/201</span>
                <span className='text-sm text-purple-700'>Éxito</span>
              </div>
            </div>
            <div className='bg-purple-50 p-3 rounded'>
              <div className='flex items-center space-x-2'>
                <span className='w-3 h-3 bg-red-500 rounded-full'></span>
                <span className='text-sm font-semibold text-purple-800'>400</span>
                <span className='text-sm text-purple-700'>Error de cliente</span>
              </div>
            </div>
            <div className='bg-purple-50 p-3 rounded'>
              <div className='flex items-center space-x-2'>
                <span className='w-3 h-3 bg-yellow-500 rounded-full'></span>
                <span className='text-sm font-semibold text-purple-800'>401</span>
                <span className='text-sm text-purple-700'>No autenticado</span>
              </div>
            </div>
            <div className='bg-purple-50 p-3 rounded'>
              <div className='flex items-center space-x-2'>
                <span className='w-3 h-3 bg-red-600 rounded-full'></span>
                <span className='text-sm font-semibold text-purple-800'>500</span>
                <span className='text-sm text-purple-700'>Error del servidor</span>
              </div>
            </div>
          </div>
        </div>
        <div>
          <h3 className='text-lg font-semibold text-orange-600 mb-3'>Endpoints Principales</h3>
          <div className='space-y-2'>
            <div className='flex items-center space-x-3 p-2 bg-orange-50 rounded'>
              <span className='px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded'>
                POST
              </span>
              <span className='text-sm font-mono text-orange-800'>/auth/login</span>
              <span className='text-sm text-orange-700'>Iniciar sesión</span>
            </div>
            <div className='flex items-center space-x-3 p-2 bg-orange-50 rounded'>
              <span className='px-2 py-1 bg-green-500 text-white text-xs font-bold rounded'>
                GET
              </span>
              <span className='text-sm font-mono text-orange-800'>/users</span>
              <span className='text-sm text-orange-700'>Listar usuarios</span>
            </div>
            <div className='flex items-center space-x-3 p-2 bg-orange-50 rounded'>
              <span className='px-2 py-1 bg-green-500 text-white text-xs font-bold rounded'>
                GET
              </span>
              <span className='text-sm font-mono text-orange-800'>/products</span>
              <span className='text-sm text-orange-700'>Listar productos</span>
            </div>
            <div className='flex items-center space-x-3 p-2 bg-orange-50 rounded'>
              <span className='px-2 py-1 bg-green-500 text-white text-xs font-bold rounded'>
                GET
              </span>
              <span className='text-sm font-mono text-orange-800'>/servicios</span>
              <span className='text-sm text-orange-700'>Listar servicios</span>
            </div>
          </div>
        </div>
        <div>
          <h3 className='text-lg font-semibold text-red-600 mb-3'>Límites de Uso</h3>
          <div className='bg-red-50 p-4 rounded-lg'>
            <p className='text-sm text-red-800 mb-2'>Para mantener la estabilidad del servicio:</p>
            <ul className='text-sm text-red-800 space-y-1'>
              <li>• Máximo 100 requests por minuto por IP</li>
              <li>• Máximo 1000 requests por hora por usuario</li>
              <li>• Tamaño máximo de payload: 10MB</li>
              <li>• Timeout de request: 30 segundos</li>
            </ul>
          </div>
        </div>
        <div>
          <h3 className='text-lg font-semibold text-gray-600 mb-3'>Soporte Técnico</h3>
          <div className='bg-gray-50 p-4 rounded-lg'>
            <p className='text-sm text-gray-800 mb-2'>Si necesitas ayuda con la API:</p>
            <ul className='text-sm text-gray-800 space-y-1'>
              <li>• Email: [EMAIL_ADDRESS]</li>
              <li>• Documentación: /api-docs</li>
              <li>• Estado del servicio: /api/health</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
