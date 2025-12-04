import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { SensorData } from '../types';

interface HistoryChartProps {
  data: SensorData[];
}

export const HistoryChart: React.FC<HistoryChartProps> = ({ data }) => {
  // Format data for chart display
  const chartData = data.slice(-30).map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    temp: parseFloat(d.temperature.toFixed(1)),
    humidity: parseFloat(d.humidity.toFixed(1)),
    mold: parseFloat(d.moldIndex.toFixed(0))
  }));

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 h-96 w-full">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">环境趋势图 (最近30次读数)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="time" tick={{ fontSize: 12, fill: '#64748b' }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 100]} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 50]} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
            labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
            formatter={(value: number, name: string) => {
                if (name === 'Humidity %') return [`${value}%`, '湿度'];
                if (name === 'Temp °C') return [`${value}°C`, '温度'];
                if (name === 'Mold Index') return [`${value}`, '霉菌指数'];
                return [value, name];
            }}
          />
          <Legend formatter={(value) => {
             if (value === 'Humidity %') return '湿度 %';
             if (value === 'Temp °C') return '温度 °C';
             if (value === 'Mold Index') return '霉菌指数';
             return value;
          }}/>
          <Line yAxisId="left" type="monotone" dataKey="humidity" name="Humidity %" stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="temp" name="Temp °C" stroke="#f59e0b" strokeWidth={2} dot={false} />
          <Line yAxisId="left" type="monotone" dataKey="mold" name="Mold Index" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};