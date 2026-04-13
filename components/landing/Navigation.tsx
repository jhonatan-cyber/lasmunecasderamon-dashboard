'use client';

import NextImage from 'next/image';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const menuItems = [
  { name: 'Inicio', href: '#home' },
  { name: 'Nosotros', href: '#about' },
  { name: 'Servicios', href: '#services' },
  { name: 'Eventos', href: '#events' },
  { name: 'Ubicaci?n', href: '#location' },
  { name: 'Trabaja con Nosotros', href: '#careers' }
];

export default function Navigation({ scrollY }: { scrollY: number }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const showCompactLogo = scrollY > 80;

  const handleMobileMenuClick = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  const handleMobileItemClick = () => {
    setIsMobileMenuOpen(false);
  };

  const handleMobileItemClickReal = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      aria-label='Navegacion principal'
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrollY > 50
          ? 'border-b border-white/10 bg-black/80 shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-md'
          : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='flex h-24 items-center justify-between lg:grid lg:grid-cols-3'>
          <div className='group flex cursor-pointer items-center space-x-3'>
            <a
              href='#home'
              className={`flex items-center gap-3 transition-all duration-700 ease-out ${
                showCompactLogo
                  ? 'visible translate-y-0 scale-100 opacity-100'
                  : 'invisible -translate-y-10 scale-90 opacity-0'
              }`}
            >
              <NextImage
                src='/img/system/logo2.png'
                alt='Las Munecas de Ramon - Nightclub exclusivo en Linares'
                width={1124}
                height={721}
                sizes='(min-width: 1024px) 288px, 0px'
                loading='eager'
                className='mt-4 hidden lg:block object-contain drop-shadow-md transition-all duration-500 ease-in-out group-hover:scale-110'
                style={{ width: '288px', height: 'auto' }}
              />
              <NextImage
                src='/img/system/logo1.png'
                alt='Las Munecas de Ramon - Nightclub exclusivo en Linares'
                width={128}
                height={64}
                sizes='(max-width: 1023px) 30vw, 0px'
                className='mt-4 lg:hidden object-contain drop-shadow-md transition-all duration-500 ease-in-out group-hover:scale-110'
                style={{ width: 'auto', height: '64px' }}
              />
            </a>
          </div>

          <div className='hidden items-center justify-center gap-8 lg:flex'>
            {menuItems.map(item => (
              <a
                key={item.name}
                href={item.href}
                className='group relative whitespace-nowrap text-md font-bold uppercase tracking-wide text-silver-300 transition-all duration-300 hover:text-gold-400'
              >
                {item.name}
                <span className='absolute bottom-2 left-0 h-[1px] w-0 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 transition-all duration-300 group-hover:w-full' />
              </a>
            ))}
          </div>

          <div className='flex items-center justify-end lg:hidden'>
            <button
              type='button'
              onClick={handleMobileMenuClick}
              aria-label={isMobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
              aria-controls='landing-mobile-menu'
              aria-expanded={isMobileMenuOpen}
              className='inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition-colors hover:bg-black/60'
            >
              {isMobileMenuOpen ? <X className='h-5 w-5' /> : <Menu className='h-5 w-5' />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          id='landing-mobile-menu'
          className='border-t border-white/10 bg-black/95 shadow-2xl backdrop-blur-md lg:hidden'
        >
          <div className='flex flex-col gap-1 px-4 py-3'>
            {menuItems.map(item => (
              <a
                key={`mobile-${item.name}`}
                href={item.href}
                onClick={handleMobileItemClick}
                className='block rounded-lg px-4 py-3 text-sm font-semibold uppercase tracking-wide text-silver-300 transition-colors hover:bg-white/5 hover:text-gold-400'
              >
                {item.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
