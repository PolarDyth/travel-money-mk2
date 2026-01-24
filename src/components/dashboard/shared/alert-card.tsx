import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AlertSeverity = "critical" | "high" | "medium" | "low";

type AlertCardProps = {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  timestamp?: string;
  transactionRef?: string;
  onAcknowledge?: (id: string) => void;
  onViewTransaction?: (ref: string) => void;
  className?: string;
};

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { icon: typeof AlertCircle; color: string; borderColor: string }
> = {
  critical: {
    icon: AlertCircle,
    color: "text-red-600",
    borderColor: "border-l-red-600",
  },
  high: {
    icon: AlertTriangle,
    color: "text-orange-600",
    borderColor: "border-l-orange-500",
  },
  medium: {
    icon: Info,
    color: "text-amber-600",
    borderColor: "border-l-amber-500",
  },
  low: {
    icon: CheckCircle,
    color: "text-blue-600",
    borderColor: "border-l-blue-500",
  },
};

export function AlertCard({
  id,
  title,
  message,
  severity,
  timestamp,
  transactionRef,
  onAcknowledge,
  onViewTransaction,
  className,
}: AlertCardProps) {
  const config = SEVERITY_CONFIG[severity];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "bg-white border border-l-4 p-3",
        config.borderColor,
        className
      )}
    >
      <div className="flex gap-3">
        <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", config.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-black truncate">{title}</p>
            {timestamp && (
              <span className="text-xs text-zinc-500 shrink-0">{timestamp}</span>
            )}
          </div>
          <p className="text-xs text-zinc-600 mt-1">{message}</p>
          {(transactionRef || onAcknowledge) && (
            <div className="flex items-center gap-2 mt-2">
              {transactionRef && onViewTransaction && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs cursor-pointer"
                  onClick={() => onViewTransaction(transactionRef)}
                >
                  View TXN
                </Button>
              )}
              {onAcknowledge && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-xs cursor-pointer"
                  onClick={() => onAcknowledge(id)}
                >
                  Acknowledge
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
