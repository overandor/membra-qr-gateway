import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils';

const variantClasses = {
  primary: 'bg-gradient-to-r from-primary-orange to-primary-gold text-black font-semibold hover:opacity-90 active:scale-95 shadow-md',
  secondary: 'bg-transparent border border-primary-orange/40 text-primary-orange hover:bg-primary-orange/10 active:scale-95',
  ghost: 'bg-white/5 border border-white/10 text-text-muted hover:bg-white/10 hover:text-text-primary active:scale-95',
  danger: 'bg-danger/10 border border-danger/40 text-danger hover:bg-danger/20 active:scale-95',
  success: 'bg-success/10 border border-success/40 text-success hover:bg-success/20 active:scale-95',
};

const sizeClasses = {
  small: 'px-3 py-1.5 text-xs rounded-lg',
  medium: 'px-4 py-2 text-sm rounded-xl',
  large: 'px-6 py-3 text-base rounded-xl',
};

export function Button({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  className,
  onClick,
  type = 'button',
  icon: Icon,
  iconPosition = 'left',
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-orange/40',
        variantClasses[variant] || variantClasses.primary,
        sizeClasses[size] || sizeClasses.medium,
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className={cn('animate-spin flex-shrink-0', size === 'small' ? 'w-3 h-3' : 'w-4 h-4')} />
      ) : (
        Icon && iconPosition === 'left' && (
          <Icon className={cn('flex-shrink-0', size === 'small' ? 'w-3 h-3' : 'w-4 h-4')} />
        )
      )}
      {children}
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className={cn('flex-shrink-0', size === 'small' ? 'w-3 h-3' : 'w-4 h-4')} />
      )}
    </button>
  );
}

export default Button;
