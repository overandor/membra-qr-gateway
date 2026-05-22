import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../utils';

const ToastContext = createContext(null);

const TOAST_DURATION_MS = 4000;

const variantConfig = {
  success: {
    icon: CheckCircle,
    classes: 'border-success/40 bg-success/10',
    iconClass: 'text-success',
    titleClass: 'text-success',
  },
  error: {
    icon: XCircle,
    classes: 'border-danger/40 bg-danger/10',
    iconClass: 'text-danger',
    titleClass: 'text-danger',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'border-primary-gold/40 bg-primary-gold/10',
    iconClass: 'text-primary-gold',
    titleClass: 'text-primary-gold',
  },
  info: {
    icon: Info,
    classes: 'border-primary-orange/40 bg-primary-orange/10',
    iconClass: 'text-primary-orange',
    titleClass: 'text-primary-orange',
  },
};

function ToastItem({ toast, onRemove }) {
  const config = variantConfig[toast.variant] || variantConfig.info;
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration ?? TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border glass-card min-w-[280px] max-w-sm shadow-lg',
        config.classes
      )}
      role="alert"
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.iconClass)} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className={cn('text-sm font-semibold mb-0.5', config.titleClass)}>{toast.title}</p>
        )}
        {toast.message && (
          <p className="text-sm text-text-muted leading-snug">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ToastContainer({ toasts, onRemove }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>,
    document.body
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((options) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const entry = { id, ...options };
    setToasts((prev) => [...prev.slice(-4), entry]); // keep max 5
    return id;
  }, []);

  const success = useCallback((message, title) => toast({ variant: 'success', message, title }), [toast]);
  const error = useCallback((message, title) => toast({ variant: 'error', message, title }), [toast]);
  const warning = useCallback((message, title) => toast({ variant: 'warning', message, title }), [toast]);
  const info = useCallback((message, title) => toast({ variant: 'info', message, title }), [toast]);

  const value = { toast, success, error, warning, info, removeToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

export { ToastItem };
export default ToastProvider;
