'use client';

import { 
  Navigation, 
  HeroSection, 
  TestimonialsSection, 
  CareersSection, 
  ReviewsSection, 
  ApplicationModal,
  WhatsAppWidget
} from '@/components/landing';
import { useLandingState } from '@/hooks/landing/useLandingState';
import SnowEffect from './SnowEffect';

export default function LandingClientBlocks({ children }: { children: React.ReactNode }) {
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

  return (
    <>
      <SnowEffect />
      <Navigation scrollY={scrollY} />
      
      {/* El HeroSection necesita scrollY para sus transformaciones de logo */}
      <HeroSection scrollY={scrollY} />
      
      {/* El resto de la página es estática (children) */}
      {children}

      {/* Los componentes interactivos del final siguen en el cliente */}
      <div className="relative z-10">
        <TestimonialsSection reviews={reviews} />
        <CareersSection handlePositionClick={handlePositionClick} />
        <ReviewsSection
          reviewData={reviewData}
          setReviewData={setReviewData}
          handleReviewSubmit={handleReviewSubmit}
        />
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
    </>
  );
}
