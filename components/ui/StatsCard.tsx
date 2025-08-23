import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackgroundGradient } from "@/components/ui/background-gradient";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";
import { formatCurrencyNoDecimals } from "@/lib/formatters";

export interface StatCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  isLoading?: boolean;
  formatAsCurrency?: boolean;
  formatAsPercentage?: boolean;
  formatAsNumber?: boolean;
}

export interface StatsCardProps {
  stats: StatCard[];
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
  error?: string | null;
  isLoading?: boolean;
}

export function StatsCard({ 
  stats, 
  columns = 4, 
  className = "mb-6 sm:mb-8",
  error,
  isLoading 
}: StatsCardProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
    6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
  };

  const formatValue = (stat: StatCard) => {
    // Si el valor ya es un string (ya formateado), devolverlo directamente
    if (typeof stat.value === 'string') return stat.value;
    
    const numValue = Number(stat.value);
    
    if (stat.formatAsCurrency) {
      return formatCurrencyNoDecimals(Math.round(numValue));
    }
    
    if (stat.formatAsPercentage) {
      return `${Math.round(numValue)}%`;
    }
    
    if (stat.formatAsNumber) {
      return Math.round(numValue).toLocaleString('es-MX');
    }
    
    return Math.round(numValue).toString();
  };

  if (error) {
    return (
      <div className="text-red-500 p-4 bg-red-50 border border-red-200 rounded-lg text-sm sm:text-base">
        Error al cargar las estadísticas: {error}
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-4 sm:gap-6 ${className}`}>
      {stats.map((stat, index) => (
        <BackgroundGradient key={index}>
          <Card className='shadow-sm hover:shadow-md transition-shadow bg-transparent border-0'>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className='p-4 sm:p-6 pt-0'>
              {isLoading || stat.isLoading ? (
                <Skeleton className="h-6 sm:h-8 w-20 sm:w-24" />
              ) : (
                <>
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold break-words">{formatValue(stat)}</div>
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </BackgroundGradient>
      ))}
    </div>
  );
} 