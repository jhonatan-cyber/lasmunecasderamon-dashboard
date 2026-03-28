import {
  AboutSection,
  EventsSection,
  ServicesSection,
  LocationSection,
} from '@/components/landing';
import Footer from '@/components/landing/Footer';
import LandingClientBlocks from '@/components/landing/LandingClientBlocks';

export default function LandingPage() {
  return (
    <main className='landing-shell relative min-h-screen overflow-x-hidden bg-black text-white'>
      <a
        href='#landing-content'
        className='landing-skip-link sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-black'
      >
        Saltar al contenido principal
      </a>

      {/* Bloques que Manejan Estado (Client Components) */}
      <LandingClientBlocks>
        {/* Secciones Estáticas (Server Components) */}
        <div id='landing-content' className='relative z-10'>
          <AboutSection />
          <EventsSection />
          <ServicesSection />
          <LocationSection />
        </div>
      </LandingClientBlocks>

      <Footer />
    </main>
  );
}

