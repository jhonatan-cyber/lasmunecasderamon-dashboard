import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export function useLandingState() {
  const [scrollY, setScrollY] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    rating: 0,
    comentario: '',
    servicio: 'General'
  });
  const [reviews, setReviews] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    edad: '',
    sexo: '',
    experiencia: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('reviews');
    if (saved) {
      try {
        setReviews(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading reviews', e);
      }
    }
  }, []);

  const menuItems = [
    { name: 'Inicio', href: '#home' },
    { name: 'Nosotros', href: '#about' },
    { name: 'Servicios', href: '#services' },
    { name: 'Ubicación', href: '#location' },
    { name: 'Trabaja con Nosotros', href: '#careers' },
  ];

  const handlePositionClick = (position: string) => setSelectedPosition(position);

  const handleCloseModal = () => {
    setSelectedPosition(null);
    setFormData({
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      edad: '',
      sexo: '',
      experiencia: ''
    });
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const mensaje = `SOLICITUD DE EMPLEO - ${selectedPosition}\n\nDatos del candidato:\n• Nombre: ${formData.nombre} ${formData.apellido}\n• Email: ${formData.email}\n• Teléfono: ${formData.telefono}\n• Edad: ${formData.edad} años\n• Sexo: ${formData.sexo}\n\nExperiencia:\n${formData.experiencia}\n\n_Por favor contacta al candidato para coordinar entrevista._`;
      window.open(`https://wa.me/59178491899?text=${encodeURIComponent(mensaje)}`, '_blank');
      handleCloseModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewSubmit = () => {
    if (!reviewData.nombre || !reviewData.rating || !reviewData.comentario)
      return toast.error('Completa los campos requeridos');
    const newReview = {
      id: Date.now(),
      ...reviewData,
      date: new Date().toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    };
    const updated = [newReview, ...reviews].slice(0, 6);
    localStorage.setItem('reviews', JSON.stringify(updated));
    setReviews(updated);
    setReviewData({
      nombre: '',
      email: '',
      telefono: '',
      rating: 0,
      comentario: '',
      servicio: 'General'
    });
    toast.success('¡Reseña publicada! Gracias por compartir tu experiencia.');
  };

  return {
    scrollY,
    isMenuOpen,
    setIsMenuOpen,
    selectedPosition,
    handlePositionClick,
    handleCloseModal,
    formData,
    handleInputChange,
    handleSubmit,
    isSubmitting,
    reviewData,
    setReviewData,
    reviews,
    handleReviewSubmit,
    menuItems
  };
}

