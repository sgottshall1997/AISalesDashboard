import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNotifications, useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

export function NotificationCenter() {
  const notifications = useNotifications();
  const removeNotification = useAppStore((state) => state.removeNotification);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getCardStyle = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950';
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
      case 'warning':
        return 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950';
      default:
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <Card
          key={notification.id}
          className={cn(
            "p-4 shadow-lg animate-in slide-in-from-right duration-300",
            getCardStyle(notification.type)
          )}
        >
          <div className="flex items-start gap-3">
            {getIcon(notification.type)}
            <div className="flex-1 space-y-1">
              <h4 className="font-medium text-sm">{notification.title}</h4>
              <p className="text-sm text-muted-foreground">{notification.message}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => removeNotification(notification.id)}
              className="h-6 w-6 p-0 hover:bg-transparent"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Hook for easy notification creation
export function useNotify() {
  const addNotification = useAppStore((state) => state.addNotification);

  return {
    success: (title: string, message: string) => 
      addNotification({ type: 'success', title, message }),
    
    error: (title: string, message: string) => 
      addNotification({ type: 'error', title, message }),
    
    warning: (title: string, message: string) => 
      addNotification({ type: 'warning', title, message }),
    
    info: (title: string, message: string) => 
      addNotification({ type: 'info', title, message }),
  };
}