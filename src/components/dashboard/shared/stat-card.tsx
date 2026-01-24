import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("rounded-none border-zinc-200", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold text-black">{value}</p>
            {subtitle && (
              <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>
            )}
            {trend && trendValue && (
              <div className="flex items-center gap-1 mt-2">
                {trend === "up" && (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                )}
                {trend === "down" && (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                {trend === "neutral" && (
                  <Minus className="w-4 h-4 text-zinc-400" />
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    trend === "up" && "text-green-600",
                    trend === "down" && "text-red-600",
                    trend === "neutral" && "text-zinc-500"
                  )}
                >
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className="p-2 bg-zinc-100 text-zinc-600">{icon}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
