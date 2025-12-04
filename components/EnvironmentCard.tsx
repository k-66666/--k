import React from 'react';
    import { LucideIcon } from 'lucide-react';
    
    interface EnvironmentCardProps {
      title: string;
      value: string;
      unit: string;
      icon: LucideIcon;
      colorClass: string;
      status?: 'normal' | 'warning' | 'critical';
    }
    
    export const EnvironmentCard: React.FC<EnvironmentCardProps> = ({ 
      title, 
      value, 
      unit, 
      icon: Icon, 
      colorClass,
      status = 'normal'
    }) => {
      let bgClass = "bg-white";
      let borderClass = "border-slate-200";
    
      if (status === 'warning') {
        bgClass = "bg-yellow-50";
        borderClass = "border-yellow-300";
      } else if (status === 'critical') {
        bgClass = "bg-red-50";
        borderClass = "border-red-300";
      }
    
      return (
        <div className={`${bgClass} border ${borderClass} rounded-2xl p-5 shadow-sm transition-all duration-300`}>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
            <div className={`p-2 rounded-full ${colorClass} bg-opacity-20`}>
              <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} />
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-slate-800">{value}</span>
            <span className="ml-1 text-slate-500 text-sm">{unit}</span>
          </div>
          {status === 'critical' && (
            <p className="text-xs text-red-600 mt-2 font-semibold">⚠️ 已超过警戒值</p>
          )}
          {status === 'warning' && (
            <p className="text-xs text-yellow-600 mt-2 font-semibold">⚠️ 接近警戒值</p>
          )}
        </div>
      );
    };