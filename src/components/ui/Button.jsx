import React from 'react';

export const Button = ({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary', // primary, secondary, danger, outline
  size = 'md', // sm, md, lg
  disabled = false,
  isLoading = false,
  className = '',
  icon: Icon
}) => {
  const baseStyle = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all outline-none duration-250 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-brand-green-600 hover:bg-brand-green-700 text-white shadow-sm border border-brand-green-700/20 active:scale-[0.98]',
    secondary: 'bg-brand-yellow-400 hover:bg-brand-yellow-500 text-slate-950 shadow-sm border border-brand-yellow-500/20 active:scale-[0.98]',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm active:scale-[0.98]',
    outline: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 active:scale-[0.98]'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4.5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2.5'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  );
};

export default Button;
