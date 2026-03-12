import { Star, User } from 'lucide-react';

interface TestimonialsSectionProps {
  reviews?: any[];
}

export default function TestimonialsSection({ reviews }: TestimonialsSectionProps) {
  const defaultReviews = [
    {
      id: 1,
      nombre: 'Carlos M.',
      comentario: 'Una experiencia única. El mejor lugar para pasar una noche inolvidable.',
      rating: 5,
      date: 'Hace 2 semanas',
      servicio: 'Sala VIP'
    },
    {
      id: 2,
      nombre: 'Ricardo S.',
      comentario: 'Ambiente excepcional, servicio de primera. Totalmente recomendado.',
      rating: 5,
      date: 'Hace 1 mes',
      servicio: 'Bar Premium'
    },
    {
      id: 3,
      nombre: 'Jorge P.',
      comentario: 'La atención y el ambiente VIP superaron todas mis expectativas.',
      rating: 5,
      date: 'Hace 3 semanas',
      servicio: 'Entretenimiento'
    }
  ];

  const safeReviews = Array.isArray(reviews) ? reviews : [];
  const displayReviews = safeReviews.length > 0 ? safeReviews : defaultReviews;

  return (
    <section className='relative py-16 sm:py-20 overflow-hidden'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-16'>
          <h2 className='text-3xl sm:text-5xl md:text-6xl font-bold mb-4'>
            <span className='bg-gradient-to-r from-gold-300 via-gold-500 to-gold-700 bg-clip-text text-transparent'>
              Lo que dicen nuestros clientes
            </span>
          </h2>
        </div>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8'>
          {displayReviews.slice(0, 6).map((t, i) => (
            <div
              key={i}
              className='group relative bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-8 hover:border-gold-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-gold-600/10 overflow-hidden'
            >
              <div className='absolute inset-0 bg-gradient-to-br from-gold-500/5 via-silver-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl'></div>
              <div className='absolute top-4 right-4 flex gap-1'>
                {[...Array(t.rating)].map((_, j) => (
                  <Star
                    key={j}
                    className='w-4 h-4 text-gold-500 fill-gold-500 drop-shadow-md'
                  />
                ))}
              </div>
              <p className='text-silver-300 italic text-base sm:text-lg leading-relaxed mb-8 relative z-10 font-light'>
                "{t.comentario}"
              </p>
              <div className='flex items-center gap-4 pt-6 border-t border-white/10 group-hover:border-gold-500/20 transition-colors'>
                <div className='w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center shadow-lg border border-white/5 group-hover:border-gold-500/30 transition-colors'>
                  <User className='w-5 h-5 text-silver-400 group-hover:text-gold-400 transition-colors' />
                </div>
                <div>
                  <p className='font-bold text-silver-200 group-hover:text-gold-400 transition-colors tracking-wide'>
                    {t.nombre}
                  </p>
                  <p className='text-xs text-silver-500 uppercase tracking-wider mt-0.5'>{t.date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

