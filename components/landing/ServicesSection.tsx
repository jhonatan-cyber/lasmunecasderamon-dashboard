import { Users, Wine, Music, Star } from 'lucide-react';

export default function ServicesSection() {
  const services = [
    {
      title: 'Salas VIP Exclusivas',
      icon: Users,
      description:
        'Espacios privados de lujo con la máxima comodidad, privacidad absoluta y servicio personalizado.',
      features: [
        'Capacidad para grupos',
        'Servicio de conserjería',
        'Minibar privado premium',
        'Audio de alta fidelidad'
      ],
      color: 'from-silver-400 to-silver-600',
      bgGradient: 'from-silver-500/10 via-silver-600/5 to-silver-500/0'
    },
    {
      title: 'Bar Premium',
      icon: Wine,
      description:
        'Las mejores bebidas importadas y cocteles exclusivos preparados por mixólogos certificados.',
      features: [
        'Licores premium importados',
        'Coctelería artesanal',
        'Champagne de lujo',
        'Servicio de sommelier'
      ],
      color: 'from-gold-400 to-gold-600',
      bgGradient: 'from-gold-500/10 via-gold-700/5 to-gold-500/0'
    },
    {
      title: 'Entretenimiento Elite',
      icon: Music,
      description:
        'DJs internacionales y shows en vivo espectaculares que harán de tu noche una experiencia única.',
      features: [
        'DJs de renombre mundial',
        'Shows en vivo exclusivos',
        'Pista de baile premium',
        'Sistema de sonido profesional'
      ],
      color: 'from-zinc-400 to-zinc-600',
      bgGradient: 'from-zinc-500/10 via-zinc-600/5 to-zinc-500/0'
    }
  ];

  return (
    <section id='services' className='relative py-16 sm:py-20 overflow-hidden'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-14 sm:mb-20'>
          <div className='inline-block mb-4 px-6 py-2 bg-gold-600/10 border border-gold-500/40 rounded-full'>
            <span className='text-gold-500 text-sm font-semibold tracking-wider uppercase'>
              SERVICIOS EXCLUSIVOS
            </span>
          </div>
          <h2 className='text-3xl sm:text-5xl md:text-6xl font-bold mb-6'>
            <span className='bg-gradient-to-r from-gold-300 via-gold-500 to-gold-700 bg-clip-text text-transparent'>
              Experiencias Premium
            </span>
          </h2>
          <p className='text-silver-300 text-base sm:text-xl max-w-3xl mx-auto leading-relaxed font-light'>
            Cada detalle está cuidadosamente diseñado para ofrecerte una experiencia inolvidable de
            lujo y exclusividad
          </p>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8'>
          {services.map((service, i) => (
            <div
              key={i}
              className='group relative bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-8 hover:border-gold-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-gold-600/10 overflow-hidden'
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${service.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl`}
              ></div>

              <div className='relative z-10'>
                <div className='flex items-center justify-between mb-8'>
                  <div
                    className={`w-20 h-20 bg-gradient-to-br ${service.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-black/50`}
                  >
                    <service.icon className='w-8 h-8 sm:w-10 sm:h-10 text-black' />
                  </div>
                </div>
                <h3 className='text-xl sm:text-2xl font-bold text-silver-100 mb-4 group-hover:text-gold-400 transition-colors tracking-wide'>
                  {service.title}
                </h3>
                <p className='text-silver-400 mb-8 leading-relaxed group-hover:text-silver-300 transition-colors font-light'>
                  {service.description}
                </p>
                <div className='space-y-4'>
                  <div className='text-xs text-gold-500 font-semibold uppercase tracking-widest mb-4'>
                    Incluye
                  </div>
                  {service.features.map((f, idx) => (
                    <div key={idx} className='flex items-start group/item'>
                      <div
                        className={`w-5 h-5 rounded-full border border-white/20 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 group-hover/item:border-gold-500/50 transition-colors`}
                      >
                        <Star className='w-2.5 h-2.5 text-gold-500 fill-gold-500' />
                      </div>
                      <span className='text-silver-400 text-sm group-hover/item:text-gold-300 transition-colors font-light'>
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


