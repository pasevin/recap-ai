'use client';

import {
  createContext,
  useContext,
  useCallback,
  useState,
  ReactNode,
} from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

interface Toast {
  id: string;
  title?: string;
  description: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (description: string, title?: string) => void;
  error: (description: string, title?: string) => void;
  warning: (description: string, title?: string) => void;
  info: (description: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    // Auto remove after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback(
    (description: string, title?: string) => {
      addToast({ type: 'success', description, title });
    },
    [addToast]
  );

  const error = useCallback(
    (description: string, title?: string) => {
      addToast({ type: 'error', description, title, duration: 0 }); // Error toasts don't auto-dismiss
    },
    [addToast]
  );

  const warning = useCallback(
    (description: string, title?: string) => {
      addToast({ type: 'warning', description, title });
    },
    [addToast]
  );

  const info = useCallback(
    (description: string, title?: string) => {
      addToast({ type: 'info', description, title });
    },
    [addToast]
  );

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
    }
  };

  const getVariant = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'default';
    }
  };

  return (
    <ToastContext.Provider
      value={{
        addToast,
        removeToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm space-y-2">
        {toasts.map((toast) => (
          <Alert
            key={toast.id}
            variant={getVariant(toast.type)}
            className="shadow-lg border animate-in slide-in-from-bottom-2"
          >
            {getIcon(toast.type)}
            <div className="flex-1">
              {toast.title && <AlertTitle>{toast.title}</AlertTitle>}
              <AlertDescription>{toast.description}</AlertDescription>
            </div>
            <div className="flex items-start gap-2">
              {toast.action && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toast.action.onClick}
                  className="h-6 px-2 text-xs"
                >
                  {toast.action.label}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeToast(toast.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </Alert>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
