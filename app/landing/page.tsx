'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';
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
    <>
      <Head>
        <title>Las Muñecas de Ramón - Nightclub Exclusivo en Linares</title>
        <meta
          name='description'
          content='El nightclub más exclusivo de Linares. Experiencia VIP, shows en vivo y ambiente único.'
        />
      </Head>

      <main className='relative min-h-screen bg-black text-white overflow-x-hidden'>
        {/* Estilos globales para animaciones */}
        <style jsx global>{`
          @keyframes fall {
            0% {
              transform: translateY(-20px);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            90% {
              opacity: 1;
            }
            100% {
              transform: translateY(100vh);
              opacity: 0;
            }
          }

          @keyframes float {
            0%,
            100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-20px);
            }
          }

          @keyframes shimmer {
            0% {
              background-position: -1000px 0;
            }
            100% {
              background-position: 1000px 0;
            }
          }

          @keyframes blink {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0.3;
            }
          }

          .animate-fall {
            animation: fall linear infinite;
          }

          .animate-float {
            animation: float 3s ease-in-out infinite;
          }

          .animate-shimmer {
            animation: shimmer 2s linear infinite;
          }

          .animate-blink {
            animation: blink 2s ease-in-out infinite;
          }

          html {
            scroll-behavior: smooth;
          }

          ::-webkit-scrollbar {
            width: 8px;
          }

          ::-webkit-scrollbar-track {
            background: #000;
          }

          ::-webkit-scrollbar-thumb {
            background: linear-gradient(to bottom, #d4af37, #c5a028);
            border-radius: 4px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(to bottom, #e5c158, #d4af37);
          }

          @media (prefers-reduced-motion: reduce) {
            html {
              scroll-behavior: auto;
            }

            *,
            *::before,
            *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}</style>

        {/* Background Effects */}
        <div className='fixed inset-0 overflow-hidden pointer-events-none z-0'>
          <div className='absolute top-0 left-0 w-full h-full bg-gradient-to-br from-gold-900/5 via-black to-silver-800/5'></div>
          <div className='absolute top-1/4 left-1/4 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl animate-pulse'></div>
          <div
            className='absolute bottom-1/4 right-1/4 w-96 h-96 bg-silver-400/5 rounded-full blur-3xl animate-pulse'
            style={{ animationDelay: '1s' }}
          ></div>

          {/* Falling Snow - Gold and Platinum */}
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
                  animation: `fall ${animationDuration}s linear infinite`,
                  animationDelay: `${animationDelay}s`,
                  boxShadow: isGold
                    ? `0 0 ${size * 2}px rgba(245, 158, 11, 0.4)`
                    : `0 0 ${size * 2}px rgba(229, 231, 235, 0.3)`
                }}
              ></div>
            );
          })}
        </div>

        {/* Navigation */}
        <div className='relative z-50'>
          <Navigation scrollY={scrollY} />
        </div>

        {/* Content */}
        <div className='relative z-10'>
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

        {/* Application Modal */}
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
    </>
  );
}
