'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { SwaggerUIWrapper } from '@/components/SwaggerUIWrapper';
import { useSwaggerWarnings } from '@/hooks/docs/useSwaggerWarnings';
import './swagger-styles.css';

// Importar SwaggerUI dinámicamente para evitar problemas de SSR
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-blue-400 rounded-full animate-spin animate-reverse"></div>
        </div>
        <p className="text-slate-600 font-medium">Cargando documentación...</p>
      </div>
    </div>
  ),
});

export default function ApiDocsPage() {
  const [mounted, setMounted] = useState(false);
  
  useSwaggerWarnings();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-blue-400 rounded-full animate-spin animate-reverse"></div>
          </div>
          <p className="text-slate-600 font-medium">Inicializando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Minimalista */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center space-y-6">
            {/* Logo y título */}
            <div className="flex items-center justify-center space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-slate-900">
                API Documentation
              </h1>
            </div>
            
            {/* Descripción */}
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Documentación completa e interactiva del sistema de administración de
              <span className="font-semibold text-slate-900"> Las Muñecas de Ramón</span>
            </p>
            
            {/* Status badges */}
            <div className="flex flex-wrap justify-center gap-3">
              <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">API Activa</span>
              </div>
              <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full border border-blue-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium">OpenAPI 3.0</span>
              </div>
              <div className="flex items-center space-x-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-full border border-purple-200">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span className="text-sm font-medium">JWT Auth</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Información rápida - Grid minimalista */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Autenticación */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Autenticación</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Utiliza JWT mediante Bearer Token o cookies para acceder a los endpoints protegidos.
                </p>
                <code className="block bg-slate-100 text-slate-700 text-xs p-3 rounded-lg font-mono">
                  Authorization: Bearer [token]
                </code>
              </div>
            </div>
          </div>

          {/* Formato de respuesta */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Respuestas</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Todas las respuestas siguen un formato JSON estándar y consistente.
                </p>
                <code className="block bg-slate-100 text-slate-700 text-xs p-3 rounded-lg font-mono">
                  {`{
  "success": boolean,
  "data": any,
  "message": string
}`}
                </code>
              </div>
            </div>
          </div>

          {/* Códigos HTTP */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Códigos HTTP</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Los códigos de estado indican el resultado de cada operación.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-lg">200</span>
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-lg">400</span>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-lg">401</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Swagger UI Container - Diseño limpio */}
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-slate-900">Documentación Interactiva</h2>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-slate-600">En línea</span>
              </div>
            </div>
          </div>
          
          <SwaggerUIWrapper url="/api/swagger" />
        </section>

        {/* Endpoints principales - Grid minimalista */}
        <section className="mt-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Endpoints Principales</h2>
            <p className="text-slate-600">Acceso rápido a las funcionalidades más importantes del sistema</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Autenticación */}
            <div className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900">Autenticación</h3>
              </div>
              <div className="space-y-2">
                {['POST /auth/login', 'GET /auth/me', 'POST /auth/logout'].map((endpoint, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <code className="font-mono">{endpoint}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Gestión */}
            <div className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-green-300 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900">Gestión</h3>
              </div>
              <div className="space-y-2">
                {['GET/POST /users', 'GET/POST /products', 'GET/POST /clients'].map((endpoint, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <code className="font-mono">{endpoint}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Operaciones */}
            <div className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900">Operaciones</h3>
              </div>
              <div className="space-y-2">
                {['GET /sales', 'GET /commissions', 'GET /tips'].map((endpoint, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                    <code className="font-mono">{endpoint}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Configuración */}
            <div className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-orange-300 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900">Configuración</h3>
              </div>
              <div className="space-y-2">
                {['GET /categories', 'GET /rooms', 'GET /payroll'].map((endpoint, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                    <code className="font-mono">{endpoint}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Footer minimalista */}
        <footer className="mt-16">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">¿Necesitas ayuda?</h3>
                <p className="text-slate-600">Consulta nuestra documentación o contacta soporte</p>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4">
              <a 
                href="/api/health" 
                className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Estado del Sistema</span>
              </a>
              
              <a 
                href="mailto:soporte@lasmuñecasderamon.com" 
                className="inline-flex items-center space-x-2 px-6 py-3 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Contactar Soporte</span>
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}