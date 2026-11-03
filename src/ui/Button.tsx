import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'quiet' | 'danger';
  size?: 'md' | 'lg';
  icon?: ReactNode;
  iconRight?: ReactNode;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', icon, iconRight, block, className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={`btn btn--${variant} btn--${size}${block ? ' btn--block' : ''} ${className}`}
      {...rest}
    >
      {icon && <span className="btn__icon">{icon}</span>}
      <span className="btn__label">{children}</span>
      {iconRight && <span className="btn__icon">{iconRight}</span>}
    </button>
  );
});
