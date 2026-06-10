import React from 'react';

export const Card = ({ 
  children, 
  title, 
  actions, 
  className = '', 
  hoverable = false, 
  glass = false 
}) => {
  const baseStyle = 'bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden';
  const glassStyle = 'glass-panel shadow-glass rounded-2xl overflow-hidden';
  const hoverStyle = hoverable ? 'transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-brand-green-200' : '';

  return (
    <div className={`${glass ? glassStyle : baseStyle} ${hoverStyle} ${className}`}>
      {/* Card Header (Optional) */}
      {(title || actions) && (
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between gap-4">
          {title && <h3 className="font-bold text-slate-800 tracking-tight text-sm uppercase">{title}</h3>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      
      {/* Card Body */}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default Card;
