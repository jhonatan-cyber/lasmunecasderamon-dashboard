import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TipsStatsCardsProps {
  totalTips: number;
  totalUsuarios: number;
  maxTip: number;
  formatCurrency: (n: number) => string;
}

export default function TipsStatsCards({
  totalTips,
  totalUsuarios,
  maxTip,
  formatCurrency,
}: TipsStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
      <Card className="shadow-none border border-gray-100">
        <CardHeader className="pb-2 p-4 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">Total Comisiones</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 p-4 sm:p-6">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">{formatCurrency(totalTips)}</div>
        </CardContent>
      </Card>
      <Card className="shadow-none border border-gray-100">
        <CardHeader className="pb-2 p-4 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 p-4 sm:p-6">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">{totalUsuarios}</div>
        </CardContent>
      </Card>
      <Card className="shadow-none border border-gray-100">
        <CardHeader className="pb-2 p-4 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">Comisión Máxima</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 p-4 sm:p-6">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800">{formatCurrency(maxTip)}</div>
        </CardContent>
      </Card>
    </div>
  );
}