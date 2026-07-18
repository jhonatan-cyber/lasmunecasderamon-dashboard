import React from 'react';
import { Loader2 } from 'lucide-react';

interface BreakdownItem {
  label: string;
  value: string;
  isSpecial?: boolean;
}

interface FinancialCardProps {
  title: string;
  mainValue: string;
  isLoading?: boolean;
  gradientFrom: string;
  gradientTo: string;
  textColor: string;
  mainColor: string;
  breakdown: BreakdownItem[];
  icon?: React.ReactNode;
}

export function FinancialCard({
  title,
  mainValue,
  isLoading,
  gradientFrom,
  gradientTo,
  textColor,
  mainColor,
  breakdown,
  icon
}: FinancialCardProps) {
  return (
    <div className="relative group">
      <div className={`absolute -inset-1 bg-linear-to-r ${gradientFrom} ${gradientTo} rounded-[2.5rem] blur-sm opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200`}></div>
      <div className="relative bg-white dark:bg-gray-950 p-8 rounded-4xl border border-gray-100 dark:border-gray-800 h-full flex flex-col justify-center">
        <div className="text-center space-y-3">
          <div className={`text-[10px] ${textColor} font-black uppercase tracking-[0.3em]`}>{title}</div>
          <div className={`text-4xl font-black ${mainColor}`}>
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin mx-auto" /> : mainValue}
          </div>
          <div className="pt-6 mt-4 border-t border-gray-50 dark:border-gray-900/50 space-y-3">
            {breakdown.map((item, idx) => (
              <div key={idx} className={`flex justify-between text-xs font-bold ${item.isSpecial ? 'pt-1' : ''}`}>
                <span className="text-gray-400">{item.label}</span>
                <span className={item.isSpecial ? mainColor : 'text-gray-600 dark:text-gray-300'}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
        {icon && (
          <div className="absolute top-4 right-4 opacity-5">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
