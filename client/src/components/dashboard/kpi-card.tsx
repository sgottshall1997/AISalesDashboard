import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period: string;
  };
  format?: 'currency' | 'percentage' | 'number';
  subtitle?: string;
  status?: 'success' | 'warning' | 'danger' | 'neutral';
  className?: string;
}

export function KPICard({
  title,
  value,
  change,
  format = 'number',
  subtitle,
  status = 'neutral',
  className
}: KPICardProps) {
  const formatValue = (val: string | number) => {
    const numVal = typeof val === 'string' ? parseFloat(val) : val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(numVal);
      case 'percentage':
        return `${numVal}%`;
      default:
        return new Intl.NumberFormat('en-US').format(numVal);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      case 'danger':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-foreground';
    }
  };

  const getTrendIcon = () => {
    if (!change) return null;
    
    switch (change.type) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    if (!change) return '';
    
    switch (change.type) {
      case 'increase':
        return 'text-green-600 dark:text-green-400';
      case 'decrease':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className={cn("p-6 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {status !== 'neutral' && (
          <Badge 
            variant={
              status === 'success' ? 'default' : 
              status === 'warning' ? 'secondary' : 
              'destructive'
            }
            className="h-2 w-2 p-0"
          />
        )}
      </div>
      
      <div className="space-y-1">
        <div className={cn("text-3xl font-bold tracking-tight", getStatusColor())}>
          {formatValue(value)}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {change && (
        <div className="flex items-center gap-2">
          {getTrendIcon()}
          <span className={cn("text-sm font-medium", getTrendColor())}>
            {change.value > 0 ? '+' : ''}{change.value}%
          </span>
          <span className="text-sm text-muted-foreground">
            vs {change.period}
          </span>
        </div>
      )}
    </Card>
  );
}