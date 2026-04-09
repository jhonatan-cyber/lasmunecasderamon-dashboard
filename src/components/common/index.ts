/**
 * Componentes comunes - Barrel exports
 *
 * Re-exporta componentes compartidos de:
 * - components/ui/ (shadcn/ui)
 * - components/shared/ (componentes personalizados)
 *
 * Usage:
 * import { Button, Card } from '@/components/common'
 *
 * NOTA: Algunos componentes usan default export - importarlos directamente
 */

// UI Components (shadcn/ui) - Named exports
export { Button } from '@/components/ui/button';
export { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
export { Input } from '@/components/ui/input';
export { Label } from '@/components/ui/label';
export { Textarea } from '@/components/ui/textarea';
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
// ConfirmModal como default export - usar import ConfirmModal from...
// export { default as ConfirmModal } from '@/components/shared/ConfirmModal';
export {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
export { Badge } from '@/components/ui/badge';
export { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
export { Checkbox } from '@/components/ui/checkbox';
export { Switch } from '@/components/ui/switch';
export { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
export { Calendar } from '@/components/ui/calendar';
export { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
export { ScrollArea } from '@/components/ui/scroll-area';
export { Skeleton } from '@/components/ui/skeleton';
export { Separator } from '@/components/ui/separator';
export { Toast } from '@/components/ui/toast';
// Sonner es default export
// export { default as Sonner } from '@/components/ui/sonner';
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Custom Shared Components - verificar exports individuales
// Por ahora commentamos los que tienen default exports
// import ConfirmModal from '@/components/shared/ConfirmModal'
// import SearchInput from '@/components/shared/SearchInput'
// etc.

// User Components - verificar exports
export { UserTable } from '@/components/users/UserTable';
export { UserFormModal } from '@/components/users/UserFormModal';
export { RoleSelect } from '@/components/users/RoleSelect';

// Weekly Sales Chart
export { WeeklySalesChart } from '@/components/weekly-sales-chart';

// Background Gradient
export { BackgroundGradient } from '@/components/shared/background-gradient';
