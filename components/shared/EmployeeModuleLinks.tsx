import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getEmployeeModules, type EmployeeRole } from '@/lib/constants/employee-modules';
export function EmployeeModuleLinks({ role }: { role: EmployeeRole }) {
  return (
    <section aria-label='Mi actividad' className='space-y-3'>
      <h2 className='text-lg font-semibold'>Mi actividad</h2>
      <nav aria-label='Módulos personales' className='flex flex-wrap gap-2'>
        {getEmployeeModules(role).map(item => (
          <Button key={item.key} variant='outline' className='rounded-full' asChild>
            <Link href={item.href}>{item.name}</Link>
          </Button>
        ))}
      </nav>
    </section>
  );
}
