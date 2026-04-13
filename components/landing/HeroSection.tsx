import NextImage from 'next/image';
import { Sparkles, Music, Users, Wine, ChevronDown } from 'lucide-react';

export default function HeroSection({ scrollY }: { scrollY: number }) {
  const logoOpacity = Math.max(0, 1 - scrollY / 300);
  const logoScale = Math.max(0.4, 1 - scrollY / 500);
  const logoTranslateY = -scrollY * 0.5;

  return (
    <section
      id='home'
      className='relative min-h-[92svh] lg:min-h-screen flex items-center justify-center pt-20 z-10 overflow-hidden'
    >
      {/* Background Elements specific to Hero */}
      <div className='absolute inset-0 z-0'>
        <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold-500/5 rounded-full blur-[120px] animate-pulse'></div>
      </div>

      <div className='relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center'>
        <div
          className='flex justify-center mb-10 sm:mb-12 lg:sticky lg:top-20'
          style={{
            opacity: Number.isFinite(logoOpacity) ? logoOpacity : 1,
            transform: `translateY(${logoTranslateY}px) scale(${logoScale})`,
            transition: 'transform 0.1s linear, opacity 0.1s linear'
          }}
        >
          <NextImage
            src='/img/system/logo2.png'
            alt='Las Muñecas de Ramón'
            width={1124}
            height={721}
            loading='eager'
            className='max-w-[680px] md:max-w-[780px] lg:max-w-[950px] object-contain drop-shadow-[0_0_25px_rgba(217,119,6,0.3)] animate-in fade-in zoom-in duration-1000 px-2 sm:px-0'
            style={{ width: '100%', height: 'auto' }}
          />
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-12 sm:mt-16 lg:mt-20 max-w-6xl mx-auto'>
          {[
            { icon: Music, title: 'Música Premium', desc: 'DJs de clase mundial' },
            { icon: Sparkles, title: 'Ambiente VIP', desc: 'Lujo y exclusividad' },
            { icon: Users, title: 'Servicio Exclusivo', desc: 'Atención personalizada' },
            { icon: Wine, title: 'Bar Premium', desc: 'Licores de primera' }
          ].map((feature, i) => (
            <div
              key={i}
              className='group relative bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 sm:p-6 lg:p-8 hover:border-gold-500/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_10px_40px_-10px_rgba(245,158,11,0.2)]'
            >
              <div className='absolute inset-0 bg-gradient-to-b from-gold-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl'></div>

              <div className='relative z-10'>
                <div className='w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-br from-zinc-900 to-black border border-gold-500/20 flex items-center justify-center group-hover:border-gold-500/60 transition-colors duration-500 shadow-lg shadow-black/50'>
                  <feature.icon className='w-6 h-6 sm:w-7 sm:h-7 text-gold-400 group-hover:text-gold-300 transition-colors duration-300' />
                </div>

                <h3 className='text-base sm:text-lg font-bold text-silver-200 mb-2 tracking-wide group-hover:text-gold-400 transition-colors duration-300'>
                  {feature.title}
                </h3>
                <p className='text-silver-500 text-sm font-light group-hover:text-silver-300 transition-colors duration-300'>
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className='flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center mt-12 sm:mt-16 lg:mt-20'>
          <a href='#about' className='group relative w-full sm:w-auto'>
            <div className='absolute -inset-1 bg-gradient-to-r from-gold-600 via-gold-400 to-gold-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200'></div>
            <button className='relative w-full sm:w-auto bg-black border border-gold-500/50 text-gold-400 hover:text-gold-300 font-medium px-10 sm:px-12 py-4 rounded-full text-base sm:text-lg transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] tracking-widest uppercase min-h-11'>
              <span className='flex items-center gap-2'>
                Conocer Más
                <ChevronDown className='w-4 h-4 group-hover:translate-y-1 transition-transform duration-300' />
              </span>
            </button>
          </a>
        </div>
      </div>
    </section>
  );
}
