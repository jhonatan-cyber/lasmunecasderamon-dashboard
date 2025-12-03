'use client';

import { useState } from 'react';

const menuItems = [
  { name: 'Inicio', href: '#home' },
  { name: 'Nosotros', href: '#about' },
  { name: 'Servicios', href: '#services' },
  { name: 'Eventos', href: '#events' },
  { name: 'Ubicación', href: '#location' },
  { name: 'Trabaja con Nosotros', href: '#careers' },
];

export default function Navigation({ scrollY }: { scrollY: number }) {

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrollY > 50 ? 'bg-black/80 backdrop-blur-md border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]' : 'bg-gradient-to-b from-black/80 to-transparent'}`}
    >
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='grid grid-cols-3 items-center h-24'>
          <div className='flex items-center space-x-3 group cursor-pointer'>
            <a
              href='#home'
              className={`flex items-center gap-3 transition-all duration-700 ease-out ${scrollY > 200
                ? 'opacity-100 visible translate-y-0 scale-100'
                : 'opacity-0 invisible -translate-y-10 scale-90'
                }`}
            >
              {/* Logo para desktop */}
              <img
                src='/img/system/logo2.png'
                alt='Las Muñecas de Ramón - Nightclub Exclusivo en Linares'
                className={`hidden md:block w-auto object-contain transform group-hover:scale-110 transition-all duration-500 ease-in-out mt-4 h-32 drop-shadow-md`}
              />
              {/* Logo para mobile */}
              <img
                src='/img/system/logo1.png'
                alt='Las Muñecas de Ramón - Nightclub Exclusivo en Linares'
                className={`md:hidden w-auto object-contain transform group-hover:scale-110 transition-all duration-500 ease-in-out mt-4 h-16 drop-shadow-md`}
              />
            </a>
          </div>

          <div className='hidden md:flex items-center justify-center gap-8'>
            {menuItems.map(item => (
              <a
                key={item.name}
                href={item.href}
                className='relative font-bold text-silver-300 hover:text-gold-400 transition-all duration-300 tracking-wide group whitespace-nowrap text-md uppercase '
              >
                {item.name}
                <span className='absolute bottom-2 left-0 w-0 h-[1px] bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 group-hover:w-full transition-all duration-300'></span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

