'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className='flex items-center justify-center min-h-[400px] p-8'>
          <div className='text-center max-w-md'>
            <div className='mb-4 flex justify-center'>
              <div className='rounded-full bg-red-100 p-3'>
                <AlertTriangle className='h-8 w-8 text-red-600' />
              </div>
            </div>

            <h2 className='text-2xl font-bold text-gray-900 mb-2'>Algo salió mal</h2>

            <p className='text-gray-600 mb-6'>
              Lo sentimos, ocurrió un error inesperado. Por favor, intenta recargar la página.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className='mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left'>
                <p className='text-sm font-mono text-red-800 break-all'>
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className='flex gap-3 justify-center'>
              <Button onClick={this.handleReset} variant='outline' className='gap-2'>
                <RefreshCw className='h-4 w-4' />
                Intentar de nuevo
              </Button>

              <Button onClick={() => (window.location.href = '/dashboard')} variant='default'>
                Ir al Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
function logErrorToService(error: Error, errorInfo: any) {
  throw new Error('Function not implemented.');
}
