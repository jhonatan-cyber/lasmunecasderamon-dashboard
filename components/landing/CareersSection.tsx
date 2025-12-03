import { Heart, Shield, Wine, Briefcase, Clock, Star, Award, ChevronDown, Send, Sparkles } from 'lucide-react';

interface CareersSectionProps {
  handlePositionClick: (position: string) => void;
}

export default function CareersSection({ handlePositionClick }: CareersSectionProps) {
  const positions = [
    {
      title: 'Anfitriona',
      icon: Sparkles,
      color: 'from-gold-300 to-gold-500',
      bg: 'from-gold-500/10 to-gold-600/10',
      border: 'border-gold-500/30',
      schedule: 'Martes a Domingo 22:00-05:00',
      requirements: ['Excelente presentación personal', 'Habilidades de comunicación', 'Experiencia en atención al cliente', 'Disponibilidad horaria nocturna'],
      benefits: ['Propinas', 'Comisiones', 'Imagen']
    },
    {
      title: 'Bailarina',
      icon: Heart,
      color: 'from-gold-400 to-gold-600',
      bg: 'from-gold-500/10 to-gold-600/10',
      border: 'border-gold-500/30',
      schedule: 'Martes a Domingo 22:00-05:00',
      requirements: ['Experiencia en baile y performance', 'Buena condición física', 'Actitud profesional', 'Disponibilidad inmediata'],
      benefits: ['Propinas', 'Comisiones', 'Ambiente VIP']
    },
    {
      title: 'Garzones',
      icon: Wine,
      color: 'from-silver-400 to-silver-600',
      bg: 'from-silver-500/10 to-silver-600/10',
      border: 'border-silver-500/30',
      schedule: 'Martes a Domingo 22:00-05:00',
      requirements: ['Experiencia en servicio de bar/restaurant', 'Conocimiento de bebidas y cócteles', 'Agilidad y buena memoria', 'Trabajo en equipo'],
      benefits: ['Propinas', 'Uniforme', 'Cena']
    },
    {
      title: 'Seguridad',
      icon: Shield,
      color: 'from-zinc-500 to-zinc-700',
      bg: 'from-zinc-500/10 to-zinc-600/10',
      border: 'border-zinc-500/30',
      schedule: 'Martes a Domingo 22:00-05:00',
      requirements: ['Curso OS-10 vigente', 'Experiencia en seguridad nocturna', 'Excelente condición física', 'Manejo de conflictos'],
      benefits: ['Seguro', 'Entrenamiento', 'Equipamiento']
    },
    {
      title: 'Personal Administrativo',
      icon: Briefcase,
      color: 'from-silver-500 to-zinc-500',
      bg: 'from-silver-500/10 to-zinc-600/10',
      border: 'border-silver-500/30',
      schedule: 'Martes a Domingo 22:00-05:00',
      requirements: ['Experiencia administrativa', 'Manejo de Office y sistemas', 'Organización y proactividad', 'Disponibilidad horaria nocturna'],
      benefits: ['Estabilidad', 'Contrato', 'Oficina']
    }
  ];

  return (
    <section id='careers' className='relative py-20 overflow-hidden'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='text-center mb-20'>
          <div className='inline-block mb-4 px-6 py-2 bg-gold-600/10 border border-gold-500/40 rounded-full'>
            <span className='text-gold-500 text-sm font-semibold tracking-wider uppercase'>
              ÚNETE A NUESTRO EQUIPO
            </span>
          </div>
          <h2 className='text-5xl md:text-6xl font-bold mb-6'>
            <span className='bg-gradient-to-r from-gold-300 via-gold-500 to-gold-700 bg-clip-text text-transparent'>
              Trabaja con Nosotros
            </span>
          </h2>
          <p className='text-silver-300 text-xl max-w-3xl mx-auto font-light'>
            Buscamos profesionales apasionados para formar parte del mejor nightclub de Linares
          </p>
        </div>

        <div className='flex flex-wrap justify-center gap-8 max-w-7xl mx-auto mb-16'>
          {positions.map((pos, i) => (
            <div
              key={i}
              onClick={() => handlePositionClick(pos.title)}
              className={`group relative w-full md:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1.5rem)] bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 hover:border-gold-500/30 transition-all duration-500 hover:scale-105 cursor-pointer overflow-hidden`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${pos.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl`}
              ></div>
              <div className='relative z-10'>
                <div className='flex items-center gap-4 mb-6'>
                  <div
                    className={`w-16 h-16 bg-gradient-to-br ${pos.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-black/50`}
                  >
                    <pos.icon className='w-8 h-8 text-black' />
                  </div>
                  <div>
                    <h3 className='text-2xl font-bold text-silver-100 mb-1 tracking-wide'>{pos.title}</h3>
                    <div className='flex items-center gap-2 text-sm text-silver-400 font-light'>
                      <Clock className='w-4 h-4' /> <span>{pos.schedule}</span>
                    </div>
                  </div>
                </div>
                <div className='mb-6'>
                  <h4 className='text-gold-400 font-semibold mb-3 flex items-center gap-2 uppercase tracking-wider text-sm'>
                    <Star className='w-4 h-4' /> Requisitos
                  </h4>
                  <ul className='space-y-2'>
                    {pos.requirements.map((req, j) => (
                      <li key={j} className='flex items-start text-silver-400 text-sm font-light'>
                        <div className='w-1.5 h-1.5 rounded-full bg-gold-500 mr-3 mt-2 flex-shrink-0'></div>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className='mb-6'>
                  <h4 className='text-silver-200 font-semibold mb-3 flex items-center gap-2 uppercase tracking-wider text-sm'>
                    <Award className='w-4 h-4 text-gold-500' /> Beneficios
                  </h4>
                  <div className='flex flex-wrap gap-2'>
                    {pos.benefits.map((b, j) => (
                      <span
                        key={j}
                        className='px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-silver-300'
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
                <div className='pt-6 border-t border-white/10'>
                  <div className='flex items-center justify-between'>
                    <span className='text-gold-500 text-sm font-semibold flex items-center gap-2 group-hover:gap-3 transition-all uppercase tracking-wider'>
                      Postular{' '}
                      <ChevronDown className='w-4 h-4 rotate-[-90deg] group-hover:translate-x-1 transition-transform' />
                    </span>
                    <div className='w-8 h-8 bg-gradient-to-br from-gold-500 to-gold-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-gold-500/20'>
                      <Send className='w-4 h-4 text-black' />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className='max-w-4xl mx-auto bg-black/60 backdrop-blur-md border border-gold-500/30 rounded-3xl p-12 text-center shadow-2xl'>
          <Briefcase className='w-16 h-16 mx-auto mb-6 text-gold-500' />
          <h3 className='text-3xl md:text-4xl font-bold text-white mb-4 tracking-wide'>
            ¿Te interesa trabajar con nosotros?
          </h3>
          <p className='text-silver-300 text-lg mb-8 max-w-2xl mx-auto font-light'>
            Envía tu CV y carta de presentación a nuestro WhatsApp. Nos pondremos en contacto
            contigo a la brevedad.
          </p>
          <a
            href='https://wa.me/56987904824?text=Hola,%20me%20interesa%20trabajar%20en%20Las%20Muñecas%20de%20Ramón'
            target='_blank'
            rel='noopener noreferrer'
          >
            <button className='bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600 hover:from-gold-500 hover:to-gold-400 text-black font-bold px-10 py-4 rounded-full text-lg transition-all duration-300 hover:scale-105 shadow-xl shadow-gold-600/40 inline-flex items-center gap-2 uppercase tracking-widest'>
              <Send className='w-5 h-5' /> Enviar CV por WhatsApp
            </button>
          </a>
        </div>
      </div>
    </section>
  );
}
