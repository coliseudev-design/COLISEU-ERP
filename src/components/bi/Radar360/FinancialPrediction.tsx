import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Target } from 'lucide-react';

interface FinancialPredictionProps {
  ltv: number;
  ticketMedio: number;
}

export const FinancialPrediction: React.FC<FinancialPredictionProps> = ({ ltv, ticketMedio }) => {
  const [animatedLTV, setAnimatedLTV] = useState(0);

  // Smooth count-up animation for LTV
  useEffect(() => {
    let start = 0;
    const end = ltv;
    if (start === end) return;
    
    const duration = 2000;
    let startTimestamp: number | null = null;
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setAnimatedLTV(Math.floor(easeProgress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setAnimatedLTV(end);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [ltv]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Mock trend data
  const isUp = true;
  const sparklineData = isUp ? [30, 40, 35, 50, 49, 60, 70, 91] : [91, 80, 75, 60, 65, 50, 40, 30];

  return (
    <div className="bg-bg-primary/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 h-full relative overflow-hidden" aria-label="Visão Financeira">
      <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center">
          <Target size={16} className="mr-2 text-green-500" />
          Visão Financeira
        </h3>
        <div className="bg-green-500/20 text-green-500 p-2 rounded-xl">
          <DollarSign size={20} />
        </div>
      </div>

      <div className="space-y-8 relative z-10">
        {/* LTV */}
        <div>
          <div className="text-sm text-text-secondary mb-2">Faturamento Vitalício (LTV)</div>
          <div className="text-4xl font-extrabold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent tracking-tight font-mono">
            {formatCurrency(animatedLTV)}
          </div>
        </div>

        {/* Ticket Médio & Sparkline */}
        <div className="bg-bg-secondary/50 rounded-2xl p-4 border border-white/5">
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="text-xs text-text-secondary mb-1">Ticket Médio Histórico</div>
              <div className="text-xl font-bold text-text-primary">{formatCurrency(ticketMedio)}</div>
            </div>
            <div className={`flex items-center text-sm font-bold ${isUp ? 'text-green-500' : 'text-red-500'}`}>
              {isUp ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
              12.5%
            </div>
          </div>
          
          {/* Simple SVG Sparkline */}
          <div className="h-10 w-full mt-4">
            <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <path 
                d={`M 0,${30 - (sparklineData[0] / 100) * 30} ${sparklineData.map((val, i) => `L ${(i / (sparklineData.length - 1)) * 100},${30 - (val / 100) * 30}`).join(' ')}`}
                fill="none" 
                stroke={isUp ? "#22c55e" : "#ef4444"} 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="drop-shadow-md"
              />
              <path 
                d={`M 0,30 L 0,${30 - (sparklineData[0] / 100) * 30} ${sparklineData.map((val, i) => `L ${(i / (sparklineData.length - 1)) * 100},${30 - (val / 100) * 30}`).join(' ')} L 100,30 Z`}
                fill={isUp ? "url(#gradGreen)" : "url(#gradRed)"}
                opacity="0.2"
              />
              <defs>
                <linearGradient id="gradGreen" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
                <linearGradient id="gradRed" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="transparent" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
