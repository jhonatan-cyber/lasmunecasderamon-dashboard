"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, CheckCircle2 } from "lucide-react";

interface ServiceStatusTabsProps {
  showAllServices: boolean;
  onShowActiveServices: () => void;
  onShowAllServices: () => void;
}

export function ServiceStatusTabs({
  showAllServices,
  onShowActiveServices,
  onShowAllServices
}: ServiceStatusTabsProps) {
  return (
    <div className="flex justify-center mb-6">
      <Tabs
        value={showAllServices ? 'finished' : 'active'}
        onValueChange={value => {
          if (value === 'active') onShowActiveServices();
          else onShowAllServices();
        }}
        className="w-full sm:w-auto"
      >
        <TabsList className="flex flex-wrap gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-full">
          <TabsTrigger 
            value="active" 
            className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-md data-[state=active]:text-gray-900 dark:data-[state=active]:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <Play className="w-4 h-4" />
            En Proceso
          </TabsTrigger>
          <TabsTrigger 
            value="finished" 
            className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:shadow-md data-[state=active]:text-gray-900 dark:data-[state=active]:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <CheckCircle2 className="w-4 h-4" />
            Finalizados
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}