import React from "react";

interface StatsCardProps {
  icon: React.ReactNode;
  bgColor: string;
  title: string;
  value: string | number;
}

export const StatsCard: React.FC<StatsCardProps> = ({ icon, bgColor, title, value }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div className="flex items-center">
      <div className={`p-3 rounded-lg ${bgColor}`}>
        {icon}
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-zinc-500">{title}</p>
        <p className="text-2xl font-bold text-black">{value}</p>
      </div>
    </div>
  </div>
);
