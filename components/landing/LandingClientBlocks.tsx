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
      
      {}
      <HeroSection scrollY={scrollY} />
      
      {}
      {children}

      {}
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
