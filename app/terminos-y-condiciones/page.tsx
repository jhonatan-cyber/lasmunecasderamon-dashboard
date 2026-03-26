import Link from 'next/link';
import { ArrowLeft, FileText, Shield, Users, Calendar, MapPin, Phone } from 'lucide-react';
import { formatDateLabel } from '@/lib/utils/calendarUtils';

export const metadata = {
  title: 'Términos y Condiciones - Las Muñecas de Ramón',
  description: 'Términos y condiciones de uso del servicio'
};

export default function TerminosCondiciones() {
  return (
    <div className='min-h-screen bg-black text-white'>
      <a
        href='#terms-content'
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
      <main id='terms-content' className='relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-4xl mx-auto'>
          {/* Header */}
          <div className='text-center mb-12'>
            <div className='inline-block mb-4 px-4 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full'>
              <span className='text-amber-500 text-xs font-semibold tracking-wider'>
                DOCUMENTO LEGAL
              </span>
            </div>
            <h1 className='text-4xl md:text-5xl font-bold mb-4'>
              <span className='bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent'>
                Términos y Condiciones
              </span>
            </h1>
            <p className='text-slate-300'>
              Última actualización: {formatDateLabel(new Date(), 'es-CL')}
            </p>
          </div>

          {/* Content */}
          <div className='bg-gradient-to-br from-gray-900 to-black border-2 border-amber-500/30 rounded-3xl p-6 md:p-10 mb-12'>
            <div className='space-y-10'>
              {/* Introducción */}
              <section>
                <h2 className='text-2xl font-bold text-amber-400 mb-4 flex items-center gap-2'>
                  <FileText className='w-6 h-6' />
                  1. Introducción
                </h2>
                <p className='text-slate-300 leading-relaxed mb-3'>
                  Bienvenido a <strong className='text-amber-400'>Las Muñecas de Ramón</strong>, el
                  club nocturno más exclusivo de Linares. Estos términos y condiciones rigen el uso
                  de nuestros servicios y la visita a nuestro establecimiento.
                </p>
                <p className='text-slate-300 leading-relaxed'>
                  Al acceder a nuestro establecimiento o utilizar nuestros servicios, usted acepta
                  cumplir con estos términos y condiciones. Si no está de acuerdo con alguna parte
                  de estos términos, no debe utilizar nuestros servicios.
                </p>
              </section>

              {/* Servicios */}
              <section>
                <h2 className='text-2xl font-bold text-amber-400 mb-4 flex items-center gap-2'>
                  <Users className='w-6 h-6' />
                  2. Servicios Ofrecidos
                </h2>
                <div className='space-y-3'>
                  <div className='bg-gray-800/50 border border-amber-500/20 rounded-lg p-4'>
                    <h3 className='text-lg font-semibold text-amber-300 mb-2'>
                      Entretenimiento Nocturno
                    </h3>
                    <p className='text-slate-300 text-sm'>
                      Ofrecemos servicios de entretenimiento nocturno exclusivo para adultos mayores
                      de 18 años.
                    </p>
                  </div>
                  <div className='bg-gray-800/50 border border-amber-500/20 rounded-lg p-4'>
                    <h3 className='text-lg font-semibold text-amber-300 mb-2'>Servicios VIP</h3>
                    <p className='text-slate-300 text-sm'>
                      Salas privadas, servicio de bar premium y atención personalizada para clientes
                      VIP.
                    </p>
                  </div>
                  <div className='bg-gray-800/50 border border-amber-500/20 rounded-lg p-4'>
                    <h3 className='text-lg font-semibold text-amber-300 mb-2'>
                      Eventos Especiales
                    </h3>
                    <p className='text-slate-300 text-sm'>
                      Organización de eventos privados y celebraciones especiales bajo reserva
                      previa.
                    </p>
                  </div>
                </div>
              </section>

              {/* Requisitos de Acceso */}
              <section>
                <h2 className='text-2xl font-bold text-amber-400 mb-4 flex items-center gap-2'>
                  <Shield className='w-6 h-6' />
                  3. Requisitos de Acceso
                </h2>
                <ul className='space-y-2 text-slate-300'>
                  <li className='flex items-start gap-2'>
                    <div className='w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0'></div>
                    <span>Ser mayor de 18 años y presentar identificación válida</span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <div className='w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0'></div>
                    <span>Cumplir con el código de vestimenta establecido</span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <div className='w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0'></div>
                    <span>Respetar las normas de comportamiento y convivencia</span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <div className='w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0'></div>
                    <span>No ingresar bajo efectos del alcohol o sustancias prohibidas</span>
                  </li>
                </ul>
              </section>

              {/* Horarios y Reservas */}
              <section>
                <h2 className='text-2xl font-bold text-amber-400 mb-4 flex items-center gap-2'>
                  <Calendar className='w-6 h-6' />
                  4. Horarios y Reservas
                </h2>
                <div className='grid md:grid-cols-2 gap-4'>
                  <div className='bg-gray-800/50 border border-amber-500/20 rounded-lg p-4'>
                    <h3 className='text-lg font-semibold text-amber-300 mb-2'>
                      Horarios de Atención
                    </h3>
                    <p className='text-slate-300 text-sm mb-1'>Martes a Domingo</p>
                    <p className='text-slate-300 text-sm'>20:00 - 06:00 hrs</p>
                  </div>
                  <div className='bg-gray-800/50 border border-amber-500/20 rounded-lg p-4'>
                    <h3 className='text-lg font-semibold text-amber-300 mb-2'>Reservas</h3>
                    <p className='text-slate-300 text-sm mb-1'>Salas VIP y eventos especiales</p>
                    <p className='text-slate-300 text-sm'>Contacto: +56 9 87904824</p>
                  </div>
                </div>
              </section>

              {/* Políticas de Pago */}
              <section>
                <h2 className='text-2xl font-bold text-amber-400 mb-4'>5. Políticas de Pago</h2>
                <div className='space-y-3'>
                  <p className='text-slate-300'>
                    Los precios de nuestros servicios están sujetos a cambios sin previo aviso. Se
                    aceptan pagos en efectivo y transferencias bancarias.
                  </p>
                  <p className='text-slate-300'>
                    Las reservas requieren confirmación y pueden estar sujetas a depósito previo.
                  </p>
                </div>
              </section>

              {/* Responsabilidades */}
              <section>
                <h2 className='text-2xl font-bold text-amber-400 mb-4'>
                  6. Responsabilidades del Cliente
                </h2>
                <ul className='space-y-2 text-slate-300'>
                  <li className='flex items-start gap-2'>
                    <div className='w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0'></div>
                    <span>Respetar a otros clientes y personal del establecimiento</span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <div className='w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0'></div>
                    <span>Cumplir con las normas de seguridad establecidas</span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <div className='w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0'></div>
                    <span>No realizar actividades ilegales en el establecimiento</span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <div className='w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0'></div>
                    <span>Responsabilizarse por sus pertenencias personales</span>
                  </li>
                </ul>
              </section>

              {/* Limitación de Responsabilidad */}
              <section>
                <h2 className='text-2xl font-bold text-amber-400 mb-4'>
                  7. Limitación de Responsabilidad
                </h2>
                <p className='text-slate-300 leading-relaxed mb-3'>
                  Las Muñecas de Ramón no se hace responsable por pérdidas, daños o lesiones que
                  puedan ocurrir en el establecimiento, excepto en casos de negligencia comprobada
                  de nuestra parte.
                </p>
                <p className='text-slate-300 leading-relaxed'>
                  Los clientes ingresan al establecimiento bajo su propio riesgo y responsabilidad.
                </p>
              </section>

              {/* Modificaciones */}
              <section>
                <h2 className='text-2xl font-bold text-amber-400 mb-4'>8. Modificaciones</h2>
                <p className='text-slate-300 leading-relaxed'>
                  Nos reservamos el derecho de modificar estos términos y condiciones en cualquier
                  momento. Las modificaciones entrarán en vigor inmediatamente después de su
                  publicación en nuestro establecimiento o sitio web.
                </p>
              </section>

              {/* Contacto */}
              <section>
                <h2 className='text-2xl font-bold text-amber-400 mb-4 flex items-center gap-2'>
                  <Phone className='w-6 h-6' />
                  9. Contacto
                </h2>
                <div className='bg-gray-800/50 border border-amber-500/20 rounded-lg p-4'>
                  <div className='grid md:grid-cols-2 gap-4'>
                    <div>
                      <h3 className='text-lg font-semibold text-amber-300 mb-2'>
                        Información de Contacto
                      </h3>
                      <div className='space-y-1 text-slate-300 text-sm'>
                        <p>
                          <strong>Teléfono:</strong> +56 9 87904824
                        </p>
                        <p>
                          <strong>Ubicación:</strong> Linares, Chile
                        </p>
                        <p>
                          <strong>Horario:</strong> Martes a Domingo 20:00-06:00
                        </p>
                      </div>
                    </div>
                    <div>
                      <h3 className='text-lg font-semibold text-amber-300 mb-2'>Para Consultas</h3>
                      <p className='text-slate-300 text-sm'>
                        Para cualquier consulta sobre estos términos y condiciones, puede
                        contactarnos a través de WhatsApp o visitarnos en nuestro establecimiento.
                      </p>
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
