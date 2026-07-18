import React from 'react';

interface StatsCardProps {
  icon: React.ReactNode;
  bgColor: string;
  title: string;
  value: string | number;
}

export const StatsCard: React.FC<StatsCardProps> = ({ icon, bgColor, title, value }) => (
  <div className='w-full bg-white rounded-lg shadow-xs border border-gray-200 p-3 sm:p-6'>
    <div className='flex items-center min-w-0'>
      <div className={`p-2 sm:p-3 rounded-lg shrink-0 ${bgColor}`}>{icon}</div>
      <div className='ml-3 sm:ml-4 min-w-0'>
        <p className='text-xs sm:text-sm font-medium text-zinc-500 wrap-break-word'>{title}</p>
        <p className='text-lg sm:text-2xl font-bold text-black wrap-break-word'>{value}</p>
      </div>
    </div>
  </div>
);
