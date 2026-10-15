import type { ComponentProps } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils/utils';
import { MODULE_TABLE_CARD_CLASS } from './moduleTableStyles';
export {
  Table as ModuleTable,
  TableHeader as ModuleTableHeader,
  TableBody as ModuleTableBody,
  TableRow as ModuleTableRow,
  TableHead as ModuleTableHead,
  TableCell as ModuleTableCell
} from '@/components/ui/table';
export function ModuleTableCard({ className, ...props }: ComponentProps<typeof Card>) {
  return <Card className={cn(MODULE_TABLE_CARD_CLASS, className)} {...props} />;
}
