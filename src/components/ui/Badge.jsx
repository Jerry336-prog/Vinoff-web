import React from 'react';
import { getStatusColors } from '../../utils/statusColors';

export const Badge = ({ children, status, className = '' }) => {
  const colors = getStatusColors(status || children);
  
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
