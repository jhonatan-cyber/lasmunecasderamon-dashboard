import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DashboardCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  iconColor?: string;
  bgColor?: string;
  borderColor?: string;
  href?: string;
  onClick?: () => void;
}

export default function DashboardCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = 'text-blue-600',
  bgColor = 'bg-blue-50',
  borderColor = 'border-blue-200',
  href,
  onClick
}: DashboardCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    }
  };

  const isClickable = href || onClick;

  return (
    <Card 
      className={`shadow-xs border ${borderColor} transition-all duration-200 group ${
        isClickable 
          ? 'hover:shadow-md hover:scale-105 cursor-pointer hover:border-gray-300' 
          : 'hover:shadow-md'
      }`}
      onClick={isClickable ? handleClick : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </CardTitle>
          <div className={`p-2 rounded-lg ${bgColor} ${isClickable ? 'group-hover:scale-110' : ''} transition-transform duration-200`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {value}
          </p>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
          {isClickable && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400 dark:text-gray-500">Ver más</span>
              <ArrowRight className="h-3 w-3 text-gray-400 dark:text-gray-500 group-hover:translate-x-1 transition-transform duration-200" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
