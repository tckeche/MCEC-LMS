import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  testId?: string;
}

export function StatCard({ title, value, icon, trend, testId }: StatCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />;
    if (trend.value < 0) return <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (!trend) return "";
    if (trend.value > 0) return "text-green-600 dark:text-green-400";
    if (trend.value < 0) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  };

  return (
    <Card data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 font-heading text-3xl font-bold" data-testid={`${testId}-value`}>
              {value}
            </p>
            {trend && (
              <div className="mt-2 flex items-center gap-1">
                {getTrendIcon()}
                <span className={`text-xs font-medium ${getTrendColor()}`}>
                  {trend.value > 0 ? "+" : ""}
                  {trend.value}%
                </span>
                <span className="text-xs text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
