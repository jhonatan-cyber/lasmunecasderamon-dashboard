import { X, Send, Loader2 } from 'lucide-react';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: string;
  formData: {
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
    edad: string;
    sexo: string;
    experiencia: string;
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export default function ApplicationModal({
  isOpen,
  onClose,
  position,
  formData,
  onInputChange,
  onSubmit,
  isSubmitting
}: ApplicationModalProps) {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4'>
      <div className='bg-gradient-to-br from-zinc-900 to-black border-2 border-gold-600/50 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between mb-6'>
          <div>
            <h2 className='text-3xl font-bold text-gold-400 mb-2'>
              Postular a {position}
            </h2>
            <p className='text-silver-400'>Completa el formulario y se abrirá WhatsApp</p>
          </div>
          <button
            onClick={onClose}
            className='text-silver-400 hover:text-white transition-colors p-2 hover:bg-gold-600/10 rounded-full'
          >
            <X className='w-6 h-6' />
          </button>
        </div>
        <form onSubmit={onSubmit} className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <input
              name='nombre'
              value={formData.nombre}
              onChange={onInputChange}
              required
              placeholder='Nombre'
              className='bg-gray-800/50 border border-gold-500/40 rounded-lg px-4 py-3 text-white focus:border-gold-500 transition-colors'
            />
            <input
              name='apellido'
              value={formData.apellido}
              onChange={onInputChange}
              required
              placeholder='Apellido'
              className='bg-gray-800/50 border border-gold-500/40 rounded-lg px-4 py-3 text-white focus:border-gold-500 transition-colors'
            />
          </div>
          <input
            name='email'
            type='email'
            value={formData.email}
            onChange={onInputChange}
            required
            placeholder='Email'
            className='w-full bg-gray-800/50 border border-gold-500/40 rounded-lg px-4 py-3 text-white focus:border-gold-500 transition-colors'
          />
          <input
            name='telefono'
            type='tel'
            value={formData.telefono}
            onChange={onInputChange}
            required
            placeholder='Teléfono'
            className='w-full bg-gray-800/50 border border-gold-500/40 rounded-lg px-4 py-3 text-white focus:border-gold-500 transition-colors'
          />
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <input
              name='edad'
              type='number'
              value={formData.edad}
              onChange={onInputChange}
              required
              min='18'
              max='65'
              placeholder='Edad'
              className='bg-gray-800/50 border border-gold-500/40 rounded-lg px-4 py-3 text-white focus:border-gold-500 transition-colors'
            />
            <select
              name='sexo'
              value={formData.sexo}
              onChange={onInputChange}
              required
              className='bg-gray-800/50 border border-gold-500/40 rounded-lg px-4 py-3 text-white focus:border-gold-500 transition-colors'
            >
              <option value='' disabled>
                Sexo
              </option>
              <option value='Masculino'>Masculino</option>
              <option value='Femenino'>Femenino</option>
              <option value='Otro'>Otro</option>
            </select>
          </div>
          <textarea
            name='experiencia'
            value={formData.experiencia}
            onChange={onInputChange}
            required
            rows={5}
            placeholder='Experiencia...'
            className='w-full bg-gray-800/50 border border-gold-500/40 rounded-lg px-4 py-3 text-white focus:border-gold-500 transition-colors resize-none'
          ></textarea>
          <div className='flex gap-4 pt-4'>
            <button
              type='submit'
              disabled={isSubmitting}
              className='flex-1 bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600 hover:from-gold-500 hover:to-gold-400 text-black font-bold px-6 py-3 rounded-full transition-all duration-300 hover:scale-105 shadow-lg shadow-gold-600/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='w-5 h-5 animate-spin' /> Enviando...
                </>
              ) : (
                <>
                  <Send className='w-5 h-5' /> Enviar por WhatsApp
                </>
              )}
            </button>
            <button
              type='button'
              onClick={onClose}
              className='px-6 py-3 border-2 border-silver-600 text-silver-300 hover:border-silver-500 hover:text-white rounded-full transition-all duration-300'
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
