import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { HelpAccordion } from '@/components/help/HelpAccordion';

const faqData = [
  {
    id: '1',
    question: '¿Cómo puedo cambiar mi contraseña?',
    answer:
      'Abre tu Perfil desde el menú de usuario y usa el formulario de cambio de contraseña. Debes confirmar tu contraseña actual.',
    category: 'Cuenta'
  },
  {
    id: '2',
    question: '¿Cómo añado un nuevo producto?',
    answer:
      'En Bodega, selecciona una categoría y pulsa Nuevo Producto. Registra sus presentaciones y carga existencias mediante Compras. Después puedes transferirlas al Bar.',
    category: 'Productos'
  },
  {
    id: '3',
    question: '¿Puedo exportar mis datos?',
    answer:
      'En Reportes, selecciona el informe y el período y pulsa Exportar. Clientes y Usuarios también tienen botones PDF y Excel.',
    category: 'Reportes'
  },
  {
    id: '4',
    question: '¿Cómo gestiono los pedidos?',
    answer:
      'Abre una caja y entra en Pedidos. Puedes crear pedidos, revisar su detalle y procesarlos según los permisos de tu rol.',
    category: 'Pedidos'
  },
  {
    id: '5',
    question: '¿Qué métodos de pago puedo registrar?',
    answer:
      'Los formularios de venta y servicio permiten seleccionar los métodos disponibles en el sistema. El prepago requiere un cliente con saldo suficiente.',
    category: 'Facturación'
  }
];
const resources = [
  {
    title: 'Configuración',
    description: 'Datos de la empresa, facturación y permisos',
    href: '/settings'
  },
  { title: 'Bodega', description: 'Productos, categorías y presentaciones', href: '/products' },
  { title: 'Pedidos', description: 'Registro y seguimiento de pedidos', href: '/orders' },
  { title: 'Reportes', description: 'Consulta y exportación de informes', href: '/reports' }
];

export default function Help() {
  return (
    <div className='space-y-6 p-4 sm:p-6'>
      <div>
        <h1 className='text-2xl font-bold'>Centro de Ayuda</h1>
        <p className='text-muted-foreground'>Accesos a los módulos y respuestas sobre su uso</p>
      </div>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {resources.map(resource => (
          <Link
            key={resource.href}
            href={resource.href}
            className='rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2'
          >
            <Card className='h-full transition-shadow hover:shadow-md'>
              <CardContent className='p-6'>
                <h2 className='font-semibold'>{resource.title}</h2>
                <p className='mt-2 text-sm text-muted-foreground'>{resource.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <HelpAccordion faqData={faqData} />
      <Card>
        <CardContent className='p-6'>
          <h2 className='font-semibold'>Soporte del sistema</h2>
          <p className='mt-2 text-sm text-muted-foreground'>
            Para asistencia, contacta al administrador de tu establecimiento e indica el módulo, la
            acción y el mensaje que aparece.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
