import Swal from 'sweetalert2';

declare global {
  interface Window {
    Swal: typeof Swal;
  }
}

export {};