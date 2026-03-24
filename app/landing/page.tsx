'use client';

import { useEffect, useState } from 'react';
import {
  Navigation,
  HeroSection,
  AboutSection,
  EventsSection,
  ServicesSection,
  TestimonialsSection,
  LocationSection,
  CareersSection,
  ReviewsSection,
  ApplicationModal
} from '@/components/landing';
import Footer from '@/components/landing/Footer';
import { useLandingState } from '@/hooks/landing/useLandingState';

export default function LandingPage() {
  const {
    scrollY,
    selectedPosition,
    handlePositionClick,
    handleCloseModal,
    formData,
    handleInputChange,
    handleSubmit,
    isSubmitting,
    reviews,
    reviewData,
    setReviewData,
    handleReviewSubmit,
    menuItems
  } = useLandingState();

  const [snowCount, setSnowCount] = useState(50);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updateSnowCount = () => {
      if (reducedMotion.matches) {
        setSnowCount(0);
        return;
      }

      setSnowCount(media.matches ? 18 : 50);
    };

    updateSnowCount();
    media.addEventListener('change', updateSnowCount);
    reducedMotion.addEventListener('change', updateSnowCount);

    return () => {
      media.removeEventListener('change', updateSnowCount);
      reducedMotion.removeEventListener('change', updateSnowCount);
    };
  }, []);

  return (
    <main className='landing-shell relative min-h-screen overflow-x-hidden bg-black text-white'>
      <a
        href='#landing-content'
        className='landing-skip-link sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-black'
      >
        Saltar al contenido principal
      </a>

      <div aria-hidden='true' className='fixed inset-0 z-0 overflow-hidden pointer-events-none'>
        <div className='absolute left-0 top-0 h-full w-full bg-gradient-to-br from-gold-900/5 via-black to-silver-800/5' />
        <div className='absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-gold-500/5 blur-3xl animate-pulse' />
        <div
          className='absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-silver-400/5 blur-3xl animate-pulse'
          style={{ animationDelay: '1s' }}
        />

        {[...Array(snowCount)].map((_, i) => {
          const isGold = i % 2 === 0;
          const left = (i * 5.3) % 100;
          const animationDuration = 8 + (i % 6) + ((i * 11) % 20) / 10;
          const animationDelay = ((i * 7) % 60) / 10;
          const size = 2 + ((i * 3) % 15) / 10;
          const opacity = 0.2 + ((i * 4) % 50) / 100;

          return (
            <div
              key={`snow-${i}`}
              className='absolute rounded-full'
              style={{
                left: `${left}%`,
                top: '-20px',
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: isGold ? '#F59E0B' : '#E5E7EB',
                opacity: Number.isFinite(opacity) ? opacity : 0.5,
                animation: `landing-fall ${animationDuration}s linear infinite`,
                animationDelay: `${animationDelay}s`,
                boxShadow: isGold
                  ? `0 0 ${size * 2}px rgba(245, 158, 11, 0.4)`
                  : `0 0 ${size * 2}px rgba(229, 231, 235, 0.3)`
              }}
            />
          );
        })}
      </div>

      <header className='relative z-50'>
        <Navigation scrollY={scrollY} />
      </header>

      <div id='landing-content' className='relative z-10'>
        <HeroSection scrollY={scrollY} />
        <AboutSection />
        <EventsSection />
        <ServicesSection />
        <TestimonialsSection reviews={reviews} />
        <LocationSection />
        <CareersSection handlePositionClick={handlePositionClick} />
        <ReviewsSection
          reviewData={reviewData}
          setReviewData={setReviewData}
          handleReviewSubmit={handleReviewSubmit}
        />
        <Footer menuItems={menuItems} />
      </div>

      <ApplicationModal
        isOpen={!!selectedPosition}
        onClose={handleCloseModal}
        position={selectedPosition || ''}
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </main>
  );
}
