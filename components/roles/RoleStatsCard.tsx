import React from 'react';
import { MetricCard } from '@/components/shared/MetricCard';

interface StatsCardProps {
  icon: React.ReactNode;
  tone: 'slate' | 'emerald' | 'blue';
  title: string;
  value: string | number;
}

export const RoleStatsCard: React.FC<StatsCardProps> = ({ icon, tone, title, value }) => (
  <MetricCard icon={icon} badge='Roles' label={title} value={value} tone={tone} />
);
