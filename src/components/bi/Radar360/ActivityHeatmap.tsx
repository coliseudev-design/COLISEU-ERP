import React from 'react';
import { Clock } from 'lucide-react';

interface ActivityHeatmapProps {
  bestHour: string;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ bestHour }) => {
  // Generate mock heatmap data for 24h (0-23)
  const generateHeatmapData = () => {
    const data = [];
    const bestHourNum = bestHour && bestHour !== 'N/A' ? parseInt(bestHour.split(':')[0]) : 14;
    
    for (let i = 0; i < 24; i++) {
      // Create a bell curve around the best hour
      let intensity = 0;
      const distance = Math.min(Math.abs(i - bestHourNum), 24 - Math.abs(i - bestHourNum));
      
      if (distance === 0) intensity = 100;
      else if (distance === 1) intensity = 80;
      else if (distance === 2) intensity = 50;
      else if (distance === 3) intensity = 20;
      else if (distance > 3 && (i >= 8 && i <= 18)) intensity = Math.random() * 15; // Random low activity during business hours
      
      data.push({ hour: i, intensity });
    }
    return data;
  };

  const heatmapData = generateHeatmapData();

  const getColorForIntensity = (intensity: number) => {
    if (intensity === 0) return 'bg-bg-secondary border border-white/5';
    if (intensity < 20) return 'bg-orange-500/20 border border-orange-500/30';
    if (intensity < 60) return 'bg-orange-500/50 border border-orange-500/60';
    if (intensity < 90) return 'bg-orange-500/80 border border-orange-500/90 shadow-[0_0_10px_rgba(249,115,22,0.5)]';
    return 'bg-orange-500 border border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.8)] scale-110 z-10';
  };

  return (
    <div className="bg-bg-primary/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-card transition-all duration-300 h-full" aria-label="Densidade de Compras">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center">
          <Clock size={16} className="mr-2 text-orange-500" />
          Densidade de Compras
        </h3>
        <div className="text-xs font-bold bg-orange-500/20 text-orange-500 px-3 py-1 rounded-full border border-orange-500/30">
          Pico: {bestHour !== 'N/A' ? bestHour : '14:00'}
        </div>
      </div>

      <div className="relative pt-4">
        {/* Y-axis labels (rough approximation) */}
        <div className="absolute left-0 top-4 bottom-6 flex flex-col justify-between text-[10px] text-text-muted pr-2">
          <span>Alta</span>
          <span>Média</span>
          <span>Baixa</span>
        </div>

        {/* Heatmap Grid */}
        <div className="ml-8 flex items-end justify-between h-32 gap-1 pb-6 border-b border-white/10 relative">
          {heatmapData.map((data) => (
            <div key={data.hour} className="relative flex flex-col items-center justify-end h-full w-full group">
              <div 
                className={`w-full rounded-t-sm transition-all duration-500 ease-out ${getColorForIntensity(data.intensity)}`}
                style={{ height: `${Math.max(data.intensity, 2)}%` }}
              ></div>
              
              {/* Tooltip */}
              <div className="absolute -top-8 bg-bg-tertiary text-text-primary text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 shadow-xl border border-white/10">
                {String(data.hour).padStart(2, '0')}:00 - {Math.round(data.intensity)}%
              </div>
            </div>
          ))}

          {/* X-axis labels */}
          <div className="absolute -bottom-5 left-0 right-0 flex justify-between text-[10px] text-text-muted">
            <span>00h</span>
            <span>06h</span>
            <span>12h</span>
            <span>18h</span>
            <span>23h</span>
          </div>
        </div>
      </div>
      
      <p className="text-xs text-text-secondary mt-6 text-center italic">
        Concentração de volume financeiro por hora do dia.
      </p>
    </div>
  );
};
