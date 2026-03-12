import Link from 'next/link';
import { Clock, Phone, Facebook, Instagram } from 'lucide-react';

// Icono personalizado de TikTok
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox='0 0 24 24' fill='currentColor' className={className}>
    <path d='M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z' />
  </svg>
);

interface FooterProps {
  menuItems?: { name: string; href: string }[];
}

export default function Footer({ menuItems }: FooterProps) {
  const fallbackMenuItems: { name: string; href: string }[] = [
    { name: 'Inicio', href: '#home' },
    { name: 'Nosotros', href: '#about' },
    { name: 'Servicios', href: '#services' },
    { name: 'Ubicación', href: '#location' },
    { name: 'Trabaja con Nosotros', href: '#careers' },
  ];

  const safeMenuItems = Array.isArray(menuItems) ? menuItems : fallbackMenuItems;
  return (
    <footer className='relative border-t border-white/10 bg-black pt-16 sm:pt-20 pb-10'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='grid md:grid-cols-4 gap-8 sm:gap-12 mb-12 sm:mb-16'>
          <div className='md:col-span-2 text-center md:text-left'>
            <div className='flex items-center justify-center md:justify-start space-x-3 mb-8'>
              {/* Logo para desktop */}
              <img
                src='/img/system/logo2.png'
                alt='Las Muñecas de Ramón - Nightclub Exclusivo en Linares'
                className='hidden md:block h-24 w-auto object-contain brightness-110 drop-shadow-lg'
              />
              {/* Logo para mobile */}
              <img
                src='/img/system/logo1.png'
                alt='Las Muñecas de Ramón - Nightclub Exclusivo en Linares'
                className='md:hidden h-20 w-auto object-contain brightness-110 drop-shadow-lg'
              />
            </div>
            <p className='text-silver-400 mb-8 leading-relaxed max-w-md text-sm font-light tracking-wide'>
              El nightclub más exclusivo de Linares. Un lugar para caballeros que buscan
              experiencias únicas en un ambiente de lujo, sofisticación y discreción absoluta.
            </p>
            <div className='flex gap-4 justify-center md:justify-start'>
              <a
                href='https://facebook.com'
                target='_blank'
                rel='noopener noreferrer'
                className='w-12 h-12 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-gold-500/50 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 group min-h-11 min-w-11'
              >
                <Facebook className='w-5 h-5 text-silver-400 group-hover:text-gold-400 transition-colors' />
              </a>
              <a
                href='https://instagram.com'
                target='_blank'
                rel='noopener noreferrer'
                className='w-12 h-12 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-gold-500/50 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 group min-h-11 min-w-11'
              >
                <Instagram className='w-5 h-5 text-silver-400 group-hover:text-gold-400 transition-colors' />
              </a>
              <a
                href='https://tiktok.com'
                target='_blank'
                rel='noopener noreferrer'
                className='w-12 h-12 bg-zinc-900 hover:bg-zinc-800 border border-white/10 hover:border-gold-500/50 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 group min-h-11 min-w-11'
              >
                <TikTokIcon className='w-5 h-5 text-silver-400 group-hover:text-gold-400 transition-colors' />
              </a>
            </div>
          </div>
          <div>
            <h4 className='text-gold-400 font-medium mb-6 sm:mb-8 text-lg tracking-widest uppercase text-center md:text-left'>Enlaces Rápidos</h4>
            <ul className='space-y-4 text-center md:text-left'>
              {safeMenuItems.map(item => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className='text-silver-500 hover:text-gold-400 transition-colors flex items-center group text-sm tracking-wide'
                  >
                    <span className='w-1 h-1 bg-gold-500/50 rounded-full mr-3 group-hover:bg-gold-500 transition-colors'></span>
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className='text-gold-400 font-medium mb-6 sm:mb-8 text-lg tracking-widest uppercase text-center md:text-left'>Horario</h4>
            <div className='space-y-6 text-center md:text-left'>
              <div className='flex items-start gap-4 justify-center md:justify-start'>
                <div className="p-2 bg-zinc-900 rounded-full border border-white/5">
                  <Clock className='w-5 h-5 text-gold-500' />
                </div>
                <div>
                  <p className='text-silver-200 font-medium tracking-wide'>Martes - Domingo</p>
                  <p className='text-silver-500 text-sm mt-1'>22:00 - 05:00 hrs</p>
                </div>
              </div>
              <div className='flex items-start gap-4 justify-center md:justify-start'>
                <div className="p-2 bg-zinc-900 rounded-full border border-white/5">
                  <Phone className='w-5 h-5 text-gold-500' />
                </div>
                <div>
                  <p className='text-silver-200 font-medium tracking-wide'>Contacto</p>
                  <p className='text-silver-500 text-sm mt-1'>+56 9 87904824</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='border-t border-white/10 pt-8'>
          <div className='flex flex-col md:flex-row justify-between items-center gap-6'>
            <p className='text-silver-600 text-xs text-center md:text-left tracking-wider uppercase'>
              © {new Date().getFullYear()} Las Muñecas de Ramón. Todos los derechos reservados.
            </p>
            <div className='flex gap-8 text-xs tracking-wider uppercase'>
              <Link
                href='/terminos-y-condiciones'
                className='text-silver-600 hover:text-gold-400 transition-colors'
              >
                Términos y Condiciones
              </Link>
              <Link
                href='/politica-de-privacidad'
                className='text-silver-600 hover:text-gold-400 transition-colors'
              >
                Política de Privacidad
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

