import { MapPin, Car, Navigation, MapPinned } from 'lucide-react';

const transportOptions = [
  {
    title: 'En Auto',
    icon: Car,
    description: 'Estacionamiento en la calle disponible. Ubicado en el centro de Linares, fácil acceso desde Av. Valentín Letelier.'
  },
  {
    title: 'En Taxi/Uber',
    icon: Navigation,
    description: 'Colectivos y taxis disponibles 24/7. Coordenadas: Valentín Letelier 182, a 2 cuadras del centro histórico.'
  },
  {
    title: 'Zona Céntrica',
    icon: MapPinned,
    description: 'Ubicación estratégica en pleno centro de Linares, rodeado de comercio, restaurantes y servicios.'
  }
];

export default function LocationSection() {
  return (
    <section id='location' className='relative py-16 sm:py-20 overflow-hidden'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-14 sm:mb-20'>
          <div className='inline-block mb-4 px-6 py-2 bg-gold-600/10 border border-gold-500/40 rounded-full'>
            <span className='text-gold-500 text-sm font-semibold tracking-wider uppercase'>UBICACIÓN</span>
          </div>
          <h2 className='text-3xl sm:text-5xl md:text-6xl font-bold mb-6'>
            <span className='bg-gradient-to-r from-gold-300 via-gold-500 to-gold-700 bg-clip-text text-transparent'>
              Cómo Llegar
            </span>
          </h2>
          <p className='text-silver-300 text-base sm:text-xl max-w-2xl mx-auto font-light'>
            Ubicados en el corazón de Linares, fácil acceso y estacionamiento disponible
          </p>
        </div>

        <div className='grid md:grid-cols-2 gap-8 lg:gap-12 items-start'>
          <div className='relative h-[320px] sm:h-[420px] lg:h-[500px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl group'>
            <div className="absolute inset-0 bg-gold-500/5 z-10 pointer-events-none group-hover:bg-transparent transition-colors duration-500"></div>
            <iframe
              src='https://www.google.com/maps?q=Valentín+Letelier+182,+3581069+Linares,+Maule,+Chile&output=embed'
              width='100%'
              height='100%'
              style={{ border: 0 }}
              allowFullScreen
              loading='lazy'
              className='grayscale hover:grayscale-0 transition-all duration-700 opacity-80 hover:opacity-100'
            ></iframe>
          </div>

          <div className='space-y-6'>
            <div className='bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-8 hover:border-gold-500/30 transition-all duration-500'>
              <div className='flex items-start gap-4 mb-8'>
                <div className='w-12 h-12 bg-gradient-to-br from-gold-500 via-gold-600 to-gold-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-gold-500/20'>
                  <MapPin className='w-6 h-6 text-black' />
                </div>
                <div>
                  <h3 className='text-xl sm:text-2xl font-bold text-gold-400 mb-2 tracking-wide'>Dirección</h3>
                  <p className='text-silver-200 text-lg font-light'>Valentín Letelier 182</p>
                  <p className='text-silver-500 font-light'>3581069 Linares, Maule, Chile</p>
                  <p className='text-silver-400 text-sm mt-3 font-light leading-relaxed'>
                    Ubicado en plena Avenida Vandejón Sur, frente al Cuerpo de Bomberos
                  </p>
                </div>
              </div>
              <div className='space-y-6 pt-6 border-t border-white/10'>
                {transportOptions.map((option, i) => {
                  const IconComponent = option.icon;
                  return (
                    <div key={i} className='flex items-start gap-4 group'>
                      <div className='w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 border border-white/10 group-hover:border-gold-500/50 transition-colors'>
                        <IconComponent className='w-5 h-5 text-silver-400 group-hover:text-gold-400 transition-colors' />
                      </div>
                      <div>
                        <h4 className='text-silver-200 font-medium mb-1 group-hover:text-gold-400 transition-colors'>{option.title}</h4>
                        <p className='text-silver-500 text-sm font-light leading-relaxed'>{option.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <a
                href='https://maps.google.com/?q=Valentín+Letelier+182,+Linares,+Maule,+Chile'
                target='_blank'
                rel='noopener noreferrer'
                className='flex-1 group'
              >
                <button className='w-full bg-black border border-gold-500/50 text-gold-400 hover:text-gold-300 font-bold px-6 py-4 rounded-2xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] flex items-center justify-center gap-2 uppercase tracking-widest text-sm min-h-11'>
                  <MapPin className='w-5 h-5 group-hover:scale-110 transition-transform' /> Google Maps
                </button>
              </a>
              <a
                href='https://waze.com/ul?ll=-35.8455,-71.5975&navigate=yes'
                target='_blank'
                rel='noopener noreferrer'
                className='flex-1 group'
              >
                <button className='w-full bg-black border border-gold-500/50 text-gold-400 hover:text-gold-300 font-bold px-6 py-4 rounded-2xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] flex items-center justify-center gap-2 uppercase tracking-widest text-sm min-h-11'>
                  <Navigation className='w-5 h-5 group-hover:scale-110 transition-transform' /> Waze
                </button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

