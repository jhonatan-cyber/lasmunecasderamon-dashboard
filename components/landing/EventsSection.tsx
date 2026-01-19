import { useState } from 'react';
import { Camera, PartyPopper, Users, Star, ChevronLeft, ChevronRight } from 'lucide-react';

export default function EventsSection() {
    const [currentImage, setCurrentImage] = useState(0);

    const galleryImages = [
        {
            url: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?q=80&w=1000&auto=format&fit=crop',
            alt: 'Fiesta Privada'
        },
        {
            url: 'https://images.unsplash.com/photo-1570572225676-47621c255771?q=80&w=1000&auto=format&fit=crop',
            alt: 'Despedida de Soltero'
        },
        {
            url: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?q=80&w=1000&auto=format&fit=crop',
            alt: 'Ambiente Exclusivo'
        },
        {
            url: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?q=80&w=1000&auto=format&fit=crop',
            alt: 'Sala VIP'
        }
    ];

    const nextImage = () => {
        setCurrentImage((prev) => (prev + 1) % galleryImages.length);
    };

    const prevImage = () => {
        setCurrentImage((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
    };

    return (
        <section id='events' className='relative py-20 overflow-hidden'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
                <div className='text-center mb-16'>
                    <div className='inline-block mb-4 px-6 py-2 bg-gold-600/10 border border-gold-500/40 rounded-full'>
                        <span className='text-gold-500 text-sm font-semibold tracking-wider uppercase'>
                            EVENTOS EXCLUSIVOS
                        </span>
                    </div>
                    <h2 className='text-5xl md:text-6xl font-bold mb-6'>
                        <span className='bg-gradient-to-r from-gold-300 via-gold-500 to-gold-700 bg-clip-text text-transparent'>
                            Despedidas de Solteros y Fiestas Privadas
                        </span>
                    </h2>
                </div>

                <div className='grid md:grid-cols-2 gap-12 items-center'>
                    {/* Text Content */}
                    <div className='order-2 md:order-1'>
                        <div className='bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-10 shadow-2xl hover:border-gold-500/30 transition-all duration-500'>
                            <p className='text-silver-300 text-lg leading-relaxed mb-8 font-light'>
                                Contamos con espacios únicos, totalmente remodelados y climatizados, que cuentan con servicios higiénicos privados. Diseñados para disfrutar de la sensualidad de nuestras hermosas chicas y para que vivas realmente la experiencia de la privacidad y exclusividad.
                            </p>
                            <p className='text-gold-400 text-xl font-medium mb-8 tracking-wide'>
                                Llámanos y confíanos tu despedida de soltero.
                            </p>

                            <div className='grid grid-cols-2 gap-4 mb-8'>
                                <div className='flex items-center gap-3 p-4 bg-zinc-900/50 rounded-xl border border-white/5'>
                                    <PartyPopper className='w-6 h-6 text-gold-500' />
                                    <span className='text-silver-300 text-sm'>Eventos Personalizados</span>
                                </div>
                                <div className='flex items-center gap-3 p-4 bg-zinc-900/50 rounded-xl border border-white/5'>
                                    <Users className='w-6 h-6 text-gold-500' />
                                    <span className='text-silver-300 text-sm'>Grupos Exclusivos</span>
                                </div>
                                <div className='flex items-center gap-3 p-4 bg-zinc-900/50 rounded-xl border border-white/5'>
                                    <Star className='w-6 h-6 text-gold-500' />
                                    <span className='text-silver-300 text-sm'>Atención VIP</span>
                                </div>
                                <div className='flex items-center gap-3 p-4 bg-zinc-900/50 rounded-xl border border-white/5'>
                                    <Camera className='w-6 h-6 text-gold-500' />
                                    <span className='text-silver-300 text-sm'>Momentos Únicos</span>
                                </div>
                            </div>

                            <a
                                href='https://wa.me/56987904824?text=Hola,%20me%20interesa%20cotizar%20una%20despedida%20de%20soltero'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='inline-block w-full'
                            >
                                <button className='w-full bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600 hover:from-gold-500 hover:to-gold-400 text-black font-bold px-8 py-4 rounded-full transition-all duration-300 hover:scale-105 shadow-lg shadow-gold-500/20 uppercase tracking-widest'>
                                    Cotizar Evento
                                </button>
                            </a>
                        </div>
                    </div>

                    {/* Gallery Slider */}
                    <div className='order-1 md:order-2 relative h-[500px] group'>
                        <div className='absolute inset-0 bg-gradient-to-br from-gold-500/10 to-silver-400/10 rounded-3xl blur-3xl animate-pulse'></div>
                        <div className='relative h-full bg-zinc-900/50 rounded-3xl border border-white/10 overflow-hidden shadow-2xl'>
                            {galleryImages.map((img, index) => (
                                <div
                                    key={index}
                                    className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === currentImage ? 'opacity-100' : 'opacity-0'
                                        }`}
                                >
                                    <div
                                        className="absolute inset-0 bg-cover bg-center transition-transform ease-linear transform scale-105 hover:scale-110"
                                        style={{ backgroundImage: `url('${img.url}')`, transitionDuration: '10000ms' }}
                                    ></div>
                                    <div className='absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60'></div>
                                </div>
                            ))}

                            {/* Navigation Controls */}
                            <button
                                onClick={prevImage}
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white hover:bg-gold-500 hover:text-black transition-all duration-300 opacity-0 group-hover:opacity-100 z-30"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                                onClick={nextImage}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 border border-white/10 flex items-center justify-center text-white hover:bg-gold-500 hover:text-black transition-all duration-300 opacity-0 group-hover:opacity-100 z-30"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>

                            {/* Dots Indicators */}
                            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-30">
                                {galleryImages.map((_, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentImage(index)}
                                        className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentImage ? 'bg-gold-500 w-6' : 'bg-white/30 hover:bg-white/50'
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
