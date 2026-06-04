import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        {
          // FIFA Gold — high contrast with black text (10:1 ratio)
          'bg-fifa-gold text-fifa-black hover:bg-fifa-gold-light active:bg-fifa-gold-dark': variant === 'primary',
          // Clean dark outline
          'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 hover:border-gray-400': variant === 'secondary',
          // Keep red for destructive actions
          'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
          'text-gray-600 hover:text-gray-900 hover:bg-gray-100': variant === 'ghost',
        },
        {
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2 text-sm':   size === 'md',
          'px-6 py-3 text-base': size === 'lg',
        },
        className
      )}
    />
  )
}
