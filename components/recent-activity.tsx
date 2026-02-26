'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, Users, DollarSign } from "lucide-react";

export function RecentActivity() {
  const activities = [
    {
      id: 1,
      type: 'venta',
      description: 'Nueva venta registrada',
      amount: '$25,000',
      time: '2 min ago',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      id: 2,
      type: 'usuario',
      description: 'Usuario logueado',
      amount: 'Anfitriona',
      time: '5 min ago',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      id: 3,
      type: 'tendencia',
      description: 'Ventas aumentando',
      amount: '+15%',
      time: '10 min ago',
      icon: TrendingUp,
      color: 'text-orange-600'
    },
    {
      id: 4,
      type: 'actividad',
      description: 'Sistema actualizado',
      amount: 'v2.1.0',
      time: '1 hora ago',
      icon: Activity,
      color: 'text-purple-600'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const IconComponent = activity.icon;
            return (
              <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className={`p-2 rounded-full bg-white shadow-sm ${activity.color}`}>
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{activity.amount}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
