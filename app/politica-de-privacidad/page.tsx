import Link from 'next/link';
import { ArrowLeft, Shield, Eye, Lock, Database, Users, Phone } from 'lucide-react';
import { formatDateLabel } from '@/lib/utils/calendarUtils';

export const metadata = {
  title: 'Política de Privacidad - Las Muñecas de Ramón',
  description: 'Política de privacidad y protección de datos'
};

export default function PoliticaPrivacidad() {
  return (
    <div className='min-h-screen bg-black text-white'>
      <a
        href='#privacy-content'
        className='sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-black'
      >
        Saltar al contenido principal
      </a>

      {/* Background Effects */}
      <div className='fixed inset-0 overflow-hidden pointer-events-none'>
        <div className='absolute top-0 left-0 w-full h-full bg-gradient-to-br from-amber-900/5 via-black to-slate-800/5'></div>
        <div className='absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse'></div>
        <div
          className='absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-400/5 rounded-full blur-3xl animate-pulse'
          style={{ animationDelay: '1s' }}
        ></div>
      </div>

      {/* Main Content */}
      <main id='privacy-content' className='relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-4xl mx-auto'>
          {/* Header */}
          <div className='text-center mb-12'>
            <div className='inline-block mb-4 px-4 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full'>
              <span className='text-amber-500 text-xs font-semibold tracking-wider'>
                PROTECCION DE DATOS
              </span>
            </div>
            <h1 className='text-4xl md:text-5xl font-bold mb-4'>
              <span className='bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent'>
                Politica de Privacidad
              </span>
            </h1>
            <p className='text-slate-300'>
              Ultima actualizacion: {formatDateLabel(new Date(), 'es-CL')}
            </p>
          </div>

          {/* Content */}
          <div className='bg-gradient-to-br from-gray-900 to-black border-2 border-amber-500/30 rounded-3xl p-6 md:p-10 mb-12'>
            <div className='space-y-10'>
              {/* Introduccion */}
              <section>
                <h2 className='text-2xl font-bold text-amber-400 mb-4 flex items-center gap-2'>
                  <Shield className='w-6 h-6' />
                  1. Introduccion
                </h2>
                <p className='text-slate-300 leading-relaxed mb-3'>
                  En <strong className='text-amber-400'>Las Muñecas de Ramon</strong>, respetamos y
                  protegemos la privacidad de nuestros clientes. Esta politica describe como
                  recopilamos, utilizamos y protegemos su informacion personal.
                </p>
                <p className='text-slate-300 leading-relaxed'>
                  Al utilizar nuestros servicios, usted acepta las practicas descritas en esta
                  politica de privacidad.
                </p>
              </section>

              {/* Informacion que Recopilamos */}
              <section>
                <h2 className='text-2xl font-bold text-amber-400 mb-4 flex items-center gap-2'>
                  <Database className='w-6 h-6' />
                  2. Informacion que Recopilamos
                </h2>
                <div className='space-y-3'>
                  <div className='bg-gray-800/50 border border-amber-500/20 rounded-lg p-4'>
                    <h3 className='text-lg font-semibold text-amber-300 mb-2'>
                      Informacion Personal
                    </h3>
                    <ul className='space-y-1 text-slate-300 text-sm'>
                      <li>• Nombre completo</li>
                      <li>• Numero de telefono</li>
                      <li>• Direccion de correo electronico</li>
                      <li>• Fecha de nacimiento (para verificar mayoria de edad)</li>
                      <li>• Informacion de identificacion</li>
                    </ul>
                  </div>
                  <div className='bg-gray-800/50 border border-amber-500/20 rounded-lg p-4'>
                    <h3 className='text-lg font-semibold text-amber-300 mb-2'>
                      Informacion de Uso
                    </h3>
                    <ul className='space-y-1 text-slate-300 text-sm'>
                      <li>• Fechas y horarios de visita</li>
                      <li>• Servicios utilizados</li>
                      <li>• Preferencias de servicio</li>
                      <li>• Comunicaciones con nuestro personal</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Como Utilizamos la Informacion */}
              <section>
                <h2 className='text-2xl font-bold text-amber-400 mb-4 flex items-center gap-2'>
                  <Eye className='w-6 h-6' />
                  3. Como Utilizamos su Informacion
                </h2>
                <div className='grid md:grid-cols-2 gap-4'>
                  <div className='bg-gray-800/50 border border-amber-500/20 rounded-lg p-4'>
                    <h3 className='text-lg font-semibold text-amber-300 mb-2'>
                      Servicios Principales
                    </h3>
                    <ul className='space-y-1 text-slate-300 text-sm'>
                      <li>• Proporcionar servicios de entretenimiento</li>
                      <li>• Gestionar reservas y citas</li>
                      <li>• Verificar identidad y edad</li>
                      <li>• Procesar pagos</li>
                    </ul>
                  </div>
                  <div className='bg-gray-800/50 border border-amber-500/20 rounded-lg p-4'>
                    <h3 className='text-lg font-semibold text-amber-300 mb-2'>
                      Mejora del Servicio
                    </h3>
                    <ul className='space-y-1 text-slate-300 text-sm'>
                      <li>• Personalizar la experiencia</li>
                      <li>• Mejorar nuestros servicios</li>
                      <li>• Comunicar ofertas especiales</li>
                      <li>• Resolver consultas y problemas</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Proteccion de Datos */}
              <section>
                <h2 className='text-2xl font-bold text-amber-400 mb-4 flex items-center gap-2'>
                  <Lock className='w-6 h-6' />
                  4. Proteccion de sus Datos
                </h2>
                <div className='space-y-3'>
                  <div className='bg-gray-800/50 border border-emerald-500/20 rounded-lg p-4'>
                    <h3 className='text-lg font-semibold text-emerald-300 mb-2'>
                      Medidas de Seguridad
                    </h3>
                    <ul className='space-y-1 text-slate-300 text-sm'>
                      <li>• Encriptacion de datos sensibles</li>
                      <li>• Acceso restringido a informacion personal</li>
                      <li>• Capacitacion del personal en privacidad</li>
                      <li>• Monitoreo regular de sistemas de seguridad</li>
                    </ul>
                  </div>
                  <p className='text-slate-300 leading-relaxed'>
                    Implementamos medidas tecnicas y organizativas apropiadas para proteger su
                    informacion personal contra acceso no autorizado, alteracion, divulgacion o
                    destruccion.
                  </p>
                </div>
              </section>

              {/* Compartir Informacion */}
              <section>
                <h2 className='text-2xl font-bold text-amber-400 mb-4'>5. Compartir Informacion</h2>
                <div className='space-y-3'>
                  <p className='text-slate-300 leading-relaxed'>
                    No vendemos, alquilamos ni compartimos su informacion personal con terceros,
                    excepto en las siguientes circunstancias:
                  </p>
                  <ul className='space-y-2 text-slate-300 ml-4'>
                    <li className='flex items-start gap-2'>
                      <div className='w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0'></div>
                      <span>Con su consentimiento explicito</span>
                    </li>
                    <li className='flex items-start gap-2'>
                      <div className='w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0'></div>
                      <span>Para cumplir con obligaciones legales</span>
                    </li>
                    <li className='flex items-start gap-2'>
                      <div className='w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0'></div>
                      <span>Para proteger nuestros derechos y seguridad</span>
                    </li>
                    <li className='flex items-start gap-2'>
                      <div className='w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0'></div>
                      <span>
                        Con proveedores de servicios confiables (bajo acuerdos de confidencialidad)
                      </span>
                    </li>
                  </ul>
                </div>
              </section>

              {/* Sus Derechos */}
              <section>
                <h2 className='text-2xl font-bold text-amber-400 mb-4 flex items-center gap-2'>
                  <Users className='w-6 h-6' />
                  6. Sus Derechos
                </h2>
                <div className='grid md:grid-cols-2 gap-4'>
                  <div className='bg-gray-800/50 border border-blue-500/20 rounded-lg p-4'>
                    <h3 className='text-lg font-semibold text-blue-300 mb-2'>Acceso y Control</h3>
                    <ul className='space-y-1 text-slate-300 text-sm'>
                      <li>• Solicitar acceso a sus datos</li>
                      <li>• Corregir informacion inexacta</li>
                      <li>• Solicitar eliminacion de datos</li>
                      <li>• Restringir el procesamiento</li>
                    </ul>
                  </div>
                  <div className='bg-gray-800/50 border border-purple-500/20 rounded-lg p-4'>
                    <h3 className='text-lg font-semibold text-purple-300 mb-2'>Comunicacion</h3>
                    <ul className='space-y-1 text-slate-300 text-sm'>
                      <li>• Retirar consentimiento</li>
                      <li>• Obtener copia de sus datos</li>
                      <li>• Presentar quejas</li>
                      <li>• Recibir notificaciones de cambios</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Cookies */}
              <section>
                <h2 className='text-2xl font-bold text-amber-400 mb-4'>
                  7. Cookies y Tecnologias de Seguimiento
                </h2>
                <div className='bg-gray-800/50 border border-amber-500/20 rounded-lg p-4'>
                  <p className='text-slate-300 text-sm leading-relaxed mb-3'>
                    Utilizamos tecnologias minimas de seguimiento para mejorar su experiencia. Puede
                    configurar su navegador para rechazar cookies, aunque esto puede afectar la
                    funcionalidad de algunos servicios.
                  </p>
                  <p className='text-slate-300 text-sm leading-relaxed'>
                    No utilizamos cookies de seguimiento de terceros ni tecnologias invasivas.
                  </p>
                </div>
              </section>

              {/* Retencion de Datos */}
              <section>
                <h2 className='text-2xl font-bold text-amber-400 mb-4'>8. Retencion de Datos</h2>
                <div className='space-y-3'>
                  <p className='text-slate-300 leading-relaxed'>
                    Conservamos su informacion personal solo durante el tiempo necesario para
                    cumplir con los propositos descritos en esta politica, a menos que la ley
                    requiera un periodo de retencion mas largo.
                  </p>
                  <div className='bg-gray-800/50 border border-amber-500/20 rounded-lg p-4'>
                    <h3 className='text-lg font-semibold text-amber-300 mb-2'>
                      Periodos de Retencion
                    </h3>
                    <ul className='space-y-1 text-slate-300 text-sm'>
                      <li>• Datos de clientes activos: Mientras mantenga relacion comercial</li>
                      <li>• Registros de visitas: 2 años</li>
                      <li>• Informacion de contacto: Hasta solicitud de eliminacion</li>
                      <li>• Datos legales requeridos: Segun normativa aplicable</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Contacto */}
              <section>
                <h2 className='text-2xl font-bold text-amber-400 mb-4 flex items-center gap-2'>
                  <Phone className='w-6 h-6' />
                  9. Contacto y Consultas
                </h2>
                <div className='bg-gray-800/50 border border-amber-500/20 rounded-lg p-4'>
                  <div className='grid md:grid-cols-2 gap-4'>
                    <div>
                      <h3 className='text-lg font-semibold text-amber-300 mb-2'>
                        Informacion de Contacto
                      </h3>
                      <div className='space-y-1 text-slate-300 text-sm'>
                        <p>
                          <strong>Telefono:</strong> +56 9 87904824
                        </p>
                        <p>
                          <strong>WhatsApp:</strong> Disponible 24/7
                        </p>
                        <p>
                          <strong>Ubicacion:</strong> Linares, Chile
                        </p>
                      </div>
                    </div>
                    <div>
                      <h3 className='text-lg font-semibold text-amber-300 mb-2'>
                        Para Consultas de Privacidad
                      </h3>
                      <p className='text-slate-300 text-sm leading-relaxed'>
                        Si tiene preguntas sobre esta politica de privacidad o desea ejercer sus
                        derechos, puede contactarnos a traves de:
                      </p>
                      <ul className='space-y-1 text-slate-300 text-sm mt-2'>
                        <li>• WhatsApp: +56 9 87904824</li>
                        <li>• Visita presencial en nuestro establecimiento</li>
                        <li>• Consulta con nuestro personal</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* Footer */}
          <div className='text-center'>
            <Link
              href='/'
              className='inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 font-bold text-black shadow-lg shadow-amber-500/30 transition-all duration-300 hover:scale-105 hover:from-amber-400 hover:to-amber-500'
            >
              <ArrowLeft className='w-4 h-4' />
              Volver al Inicio
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
