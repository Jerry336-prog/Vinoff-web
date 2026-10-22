import React from 'react';

export const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, // e.g. "+12.5%" or "-2.3%"
  trendLabel = "vs last month", 
  variant = "green" // green, yellow, slate, blue, red
}) => {
  
  const colors = {
    green: {
      text: 'text-emerald-700',
      iconBg: 'bg-emerald-600 text-white',
    },
    yellow: {
      text: 'text-amber-800',
      iconBg: 'bg-amber-500 text-white',
    },
    slate: {
      text: 'text-slate-700',
      iconBg: 'bg-slate-800 text-white',
    },
    blue: {
      text: 'text-blue-700',
      iconBg: 'bg-blue-600 text-white',
    },
    red: {
      text: 'text-rose-700',
      iconBg: 'bg-rose-600 text-white',
    }
  };

  const currentTheme = colors[variant] || colors.slate;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition-all duration-200 hover:border-slate-300 hover:shadow-sm flex flex-col justify-between min-h-[115px] sm:min-h-[125px]">
      <div className="flex items-start justify-between gap-2.5">
        <div className="space-y-1 min-w-0">
          <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider block truncate">
            {title}
          </span>
          <h3 className="text-base sm:text-lg xl:text-xl font-black text-slate-900 tracking-tight truncate mt-1">
            {value}
          </h3>
        </div>
        
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${currentTheme.iconBg}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
      </div>

      {trend && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] sm:text-xs">
          <span className={`px-1.5 py-0.5 rounded-lg font-bold text-[8px] sm:text-[9px] border ${
            trend.includes('generated') || trend.includes('settled') || trend.startsWith('+')
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : trend.includes('critical')
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            {trend}
          </span>
          <span className="text-slate-400 truncate font-semibold">{trendLabel}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
