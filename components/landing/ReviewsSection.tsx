import { Star } from 'lucide-react';

interface ReviewsSectionProps {
  reviewData?: {
    nombre: string;
    email: string;
    telefono: string;
    rating: number;
    comentario: string;
    servicio: string;
  };
  setReviewData: (data: any) => void;
  handleReviewSubmit: () => void;
}

export default function ReviewsSection({ reviewData, setReviewData, handleReviewSubmit }: ReviewsSectionProps) {
  const safeReviewData = reviewData ?? {
    nombre: '',
    email: '',
    telefono: '',
    rating: 0,
    comentario: '',
    servicio: 'General'
  };

  return (
    <section id='reviews' className='relative py-20 overflow-hidden'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-20'>
          <div className='inline-block mb-4 px-6 py-2 bg-gold-600/10 border border-gold-500/40 rounded-full'>
            <span className='text-gold-500 text-sm font-semibold tracking-wider uppercase'>
              COMPARTE TU EXPERIENCIA
            </span>
          </div>
          <h2 className='text-5xl md:text-6xl font-bold mb-6'>
            <span className='bg-gradient-to-r from-gold-300 via-gold-500 to-gold-700 bg-clip-text text-transparent'>
              Deja tu Reseña
            </span>
          </h2>
          <p className='text-silver-300 text-xl max-w-3xl mx-auto font-light'>
            Comparte tu experiencia con otros clientes. Nos encantaría saber tu opinión.
          </p>
        </div>

        <div className='max-w-2xl mx-auto bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-10 shadow-2xl hover:border-gold-500/30 transition-all duration-500'>
          <div className='mb-8'>
            <label className='block text-silver-200 mb-3 font-medium tracking-wide text-sm uppercase'>Tu Nombre *</label>
            <input
              type='text'
              value={safeReviewData.nombre}
              onChange={e => setReviewData({ ...safeReviewData, nombre: e.target.value })}
              className='w-full bg-zinc-900/50 border border-white/10 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-gold-500/50 focus:bg-zinc-900/80 transition-all duration-300 placeholder:text-silver-600 font-light'
              placeholder='Juan Pérez'
            />
          </div>
          <div className='grid md:grid-cols-2 gap-6 mb-8'>
            <div>
              <label className='block text-silver-200 mb-3 font-medium tracking-wide text-sm uppercase'>Email</label>
              <input
                type='email'
                value={safeReviewData.email}
                onChange={e => setReviewData({ ...safeReviewData, email: e.target.value })}
                className='w-full bg-zinc-900/50 border border-white/10 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-gold-500/50 focus:bg-zinc-900/80 transition-all duration-300 placeholder:text-silver-600 font-light'
                placeholder='tu@email.com'
              />
            </div>
            <div>
              <label className='block text-silver-200 mb-3 font-medium tracking-wide text-sm uppercase'>Teléfono</label>
              <input
                type='tel'
                value={safeReviewData.telefono}
                onChange={e => setReviewData({ ...safeReviewData, telefono: e.target.value })}
                className='w-full bg-zinc-900/50 border border-white/10 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-gold-500/50 focus:bg-zinc-900/80 transition-all duration-300 placeholder:text-silver-600 font-light'
                placeholder='+591 12345678'
              />
            </div>
          </div>
          <div className='mb-8'>
            <label className='block text-silver-200 mb-4 font-medium tracking-wide text-sm uppercase'>Calificación *</label>
            <div className='flex gap-4'>
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  type='button'
                  onClick={() => setReviewData({ ...safeReviewData, rating: s })}
                  className='hover:scale-110 transition-transform duration-200 group'
                >
                  <Star
                    className={`w-8 h-8 ${s <= safeReviewData.rating ? 'text-gold-500 fill-gold-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'text-zinc-700 fill-zinc-700 group-hover:text-gold-500/50'}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className='mb-8'>
            <label className='block text-silver-200 mb-3 font-medium tracking-wide text-sm uppercase'>Comentario *</label>
            <textarea
              value={safeReviewData.comentario}
              onChange={e => setReviewData({ ...safeReviewData, comentario: e.target.value })}
              rows={5}
              className='w-full bg-zinc-900/50 border border-white/10 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-gold-500/50 focus:bg-zinc-900/80 transition-all duration-300 resize-none placeholder:text-silver-600 font-light'
              placeholder='Comparte tu experiencia...'
            ></textarea>
          </div>
          <button
            onClick={handleReviewSubmit}
            className='w-full bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600 hover:from-gold-500 hover:to-gold-400 text-black font-bold px-8 py-5 rounded-full transition-all duration-300 hover:scale-[1.02] shadow-xl shadow-gold-600/30 inline-flex items-center justify-center gap-3 uppercase tracking-widest'
          >
            <Star className='w-5 h-5' /> Publicar Reseña
          </button>
        </div>
      </div>
    </section>
  );
}
