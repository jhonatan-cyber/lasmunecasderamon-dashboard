/* eslint-disable */
import { useState, useEffect } from 'react';
import { Award, Shield, Calendar, Users, Star, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AboutSection() {
  const [currentImage, setCurrentImage] = useState(0);

  const images = [
    {
      url: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?q=80&w=1000&auto=format&fit=crop',
      alt: 'Ambiente de Lujo'
    },
    {
      url: 'https://images.unsplash.com/photo-1570572225676-47621c255771?q=80&w=1000&auto=format&fit=crop',
      alt: 'Iluminación Premium'
    },
    {
      url: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?q=80&w=1000&auto=format&fit=crop',
      alt: 'Bar Exclusivo'
    },
    {
      url: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?q=80&w=1000&auto=format&fit=crop',
      alt: 'Sala VIP'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <section id='about' className='relative py-16 sm:py-20 overflow-hidden'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='grid md:grid-cols-2 gap-10 lg:gap-16 items-center'>
          <div className='relative order-2 md:order-1'>
            <div className='absolute -inset-4 bg-gradient-to-r from-gold-500/10 to-silver-400/10 blur-3xl rounded-full'></div>
            <div className='relative bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl hover:border-gold-500/30 transition-all duration-500'>
              <div className='flex items-center gap-3 mb-8'>
                <div className='w-12 h-12 bg-gradient-to-br from-gold-500 via-gold-600 to-gold-700 rounded-xl flex items-center justify-center shadow-lg shadow-gold-500/20'>
                  <Award className='w-6 h-6 text-black' />
                </div>
                <h2 className='text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight'>
                  <span className='bg-gradient-to-r from-gold-300 via-gold-500 to-gold-700 bg-clip-text text-transparent'>
                    Sobre Nosotros
                  </span>
                </h2>
              </div>
              <p className='text-silver-300 text-base sm:text-lg leading-relaxed mb-6 font-light'>
                <span className='text-gold-400 font-medium'>Las Muñecas de Ramón</span> se consolida como uno de los nightclubs más exclusivos y reconocidos de la Región del Maule, ofreciendo un servicio de calidad y primera clase. Contamos con nuevas instalaciones totalmente renovadas y una infraestructura de primer nivel.
              </p>
              <p className='text-silver-400 text-base sm:text-lg leading-relaxed mb-8 font-light'>
                Con 7 años de experiencia, somos una empresa joven siempre a la vanguardia, certificada por la preferencia de nuestros clientes. Disponemos de un local climatizado con los más altos estándares de higiene y un quincho exclusivo con todas las comodidades para que disfrutes de un asado privado con las chicas y tus amigos.
              </p>

              <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-10 pt-8 border-t border-white/10'>
                {[
                  { number: '7+', label: 'Años de Experiencia', icon: Calendar },
                  { number: '500+', label: 'Clientes VIP', icon: Users },
                  { number: '4.9', label: 'Rating', icon: Star }
                ].map((stat, i) => (
                  <div key={i} className='text-center group hover:scale-110 transition-transform duration-300'>
                    <stat.icon className='w-8 h-8 mx-auto mb-3 text-gold-500/80 group-hover:text-gold-400 transition-colors' />
                    <div className='text-3xl font-bold text-silver-200 group-hover:text-gold-400 transition-colors'>
                      {stat.number}
                    </div>
                    <div className='text-xs text-silver-500 mt-1 uppercase tracking-wider'>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className='flex flex-wrap gap-4 mt-10'>
                <div className='flex items-center gap-2 px-4 py-2 bg-gold-500/10 border border-gold-500/20 rounded-full'>
                  <Shield className='w-4 h-4 text-gold-500' />
                  <span className='text-xs text-gold-400 uppercase tracking-wide'>Seguridad Garantizada</span>
                </div>
                <div className='flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full'>
                  <Award className='w-4 h-4 text-silver-400' />
                  <span className='text-xs text-silver-400 uppercase tracking-wide'>Certificado de Excelencia</span>
                </div>
              </div>
            </div>
          </div>

          <div className='relative h-[360px] sm:h-[500px] lg:h-[600px] order-1 md:order-2 group'>
            <div className='absolute inset-0 bg-gradient-to-br from-gold-500/10 to-silver-400/10 rounded-3xl blur-3xl animate-pulse'></div>
            <div className='relative h-full bg-zinc-900/50 rounded-3xl border border-white/10 overflow-hidden shadow-2xl'>
              {/* Slider Images */}
              {images.map((img, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentImage ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform ease-linear transform scale-105 hover:scale-110"
                    style={{ backgroundImage: `url('${img.url}')`, transitionDuration: '10000ms' }}
                  ></div>
                  <div className='absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60'></div>
                </div>
              ))}

              {/* Navigation Controls */}
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white hover:bg-gold-500 hover:text-black transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 z-30"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white hover:bg-gold-500 hover:text-black transition-all duration-300 opacity-100 md:opacity-0 md:group-hover:opacity-100 z-30"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Dots Indicators */}
              <div className="absolute bottom-6 sm:bottom-24 left-0 right-0 flex justify-center gap-2 z-30">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImage(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentImage ? 'bg-gold-500 w-6' : 'bg-white/30 hover:bg-white/50'
                      }`}
                  />
                ))}
              </div>

              <div className='absolute bottom-0 left-0 right-0 p-4 sm:p-8 z-20 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500'>
                <p className='text-gold-400 text-lg sm:text-xl font-medium mb-2 tracking-wide'>Experiencia Premium</p>
                <p className='text-silver-400 text-sm font-light'>Un ambiente único de lujo y distinción</p>
              </div>

              <div className='absolute top-8 right-8 z-20'>
                <Sparkles className='w-8 h-8 text-gold-500/50 animate-pulse' />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


