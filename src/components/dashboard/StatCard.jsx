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
      bg: 'from-emerald-500/10 to-teal-500/5 border-emerald-500/15',
      text: 'text-emerald-700',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-100',
      glow: 'bg-emerald-500/10'
    },
    yellow: {
      bg: 'from-amber-500/10 to-orange-500/5 border-amber-500/15',
      text: 'text-amber-800',
      iconBg: 'bg-gradient-to-br from-amber-450 to-orange-500 shadow-amber-100',
      glow: 'bg-amber-500/10'
    },
    slate: {
      bg: 'from-slate-550/10 to-slate-650/5 border-slate-500/15',
      text: 'text-slate-700',
      iconBg: 'bg-gradient-to-br from-slate-700 to-slate-900 shadow-slate-100',
      glow: 'bg-slate-500/10'
    },
    blue: {
      bg: 'from-sky-500/10 to-blue-500/5 border-sky-500/15',
      text: 'text-blue-700',
      iconBg: 'bg-gradient-to-br from-sky-500 to-blue-600 shadow-blue-100',
      glow: 'bg-sky-500/10'
    },
    red: {
      bg: 'from-rose-500/10 to-red-500/5 border-rose-500/15',
      text: 'text-rose-700',
      iconBg: 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-100',
      glow: 'bg-rose-500/10'
    }
  };

  const currentTheme = colors[variant] || colors.slate;

  return (
    <div className={`bg-white bg-gradient-to-br ${currentTheme.bg} border-2 rounded-3xl p-4 sm:p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-1 flex flex-col justify-between min-h-[115px] sm:min-h-[125px] relative group overflow-hidden`}>
      {/* Animated Background Glow Effect */}
      <div className={`absolute -right-6 -bottom-6 w-20 h-20 rounded-full blur-xl opacity-40 group-hover:scale-150 transition-transform duration-500 ${currentTheme.glow}`} />

      <div className="flex items-start justify-between gap-2.5 relative z-10">
        <div className="space-y-1 min-w-0">
          <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider block truncate">
            {title}
          </span>
          <h3 className="text-base sm:text-lg xl:text-xl font-black text-slate-900 tracking-tight truncate mt-1">
            {value}
          </h3>
        </div>
        
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 ${currentTheme.iconBg}`}>
          <Icon className="w-4.5 h-4.5 sm:w-5 h-5 text-white" />
        </div>
      </div>

      {trend && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] sm:text-xs relative z-10">
          <span className={`px-1.5 py-0.5 rounded-lg font-bold text-[8px] sm:text-[9px] border ${
            trend.includes('generated') || trend.includes('settled') || trend.startsWith('+')
              ? 'bg-emerald-50/80 text-emerald-700 border-emerald-150'
              : trend.includes('critical')
              ? 'bg-rose-50/80 text-rose-700 border-rose-150'
              : 'bg-amber-50/80 text-amber-705 border-amber-150'
          }`}>
            {trend}
          </span>
          <span className="text-slate-450 truncate font-semibold">{trendLabel}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
