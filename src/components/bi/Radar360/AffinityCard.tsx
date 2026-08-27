import React from 'react';
import { Mail, MessageCircle, TrendingUp, User } from 'lucide-react';

interface AffinityCardProps {
  vendedor: string;
  shareOfWallet?: number;
}

export const AffinityCard: React.FC<AffinityCardProps> = ({ vendedor, shareOfWallet = 85 }) => {
  // Extract initials
  const getInitials = (name: string) => {
    if (!name || name === 'N/A') return '?';
    const parts = name.trim().split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const handleWhatsApp = () => {
    // Exemplo de link, em prod poderia usar o telefone do vendedor se disponível
    window.open(`https://wa.me/`, '_blank');
  };

  const handleEmail = () => {
    window.open(`mailto:`, '_blank');
  };

  return (
    <div className="bg-bg-primary/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 relative overflow-hidden group" aria-label="Afinidade Comercial">
      {/* Decorative gradient orb */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl group-hover:bg-cyan-500/30 transition-all duration-500"></div>

      <div className="flex justify-between items-start mb-6">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center">
          <TrendingUp size={16} className="mr-2 text-cyan-500" />
          Afinidade Comercial
        </h3>
      </div>

      <div className="flex flex-col items-center justify-center space-y-4">
        {/* Avatar with progress ring simulating Share of Wallet */}
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="transparent" stroke="currentColor" strokeWidth="5" className="text-bg-secondary" />
            <circle 
              cx="50" cy="50" r="45" 
              fill="transparent" 
              stroke="url(#gradient)" 
              strokeWidth="5" 
              strokeDasharray="283" 
              strokeDashoffset={283 - (283 * shareOfWallet) / 100}
              className="transition-all duration-1000 ease-out"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06B6D4" />
                <stop offset="100%" stopColor="#0EA5E9" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 m-auto w-20 h-20 bg-bg-secondary rounded-full flex items-center justify-center shadow-inner overflow-hidden">
             {vendedor && vendedor !== 'N/A' ? (
                <span className="text-2xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                  {getInitials(vendedor)}
                </span>
             ) : (
                <User size={30} className="text-text-muted" />
             )}
          </div>
        </div>

        <div className="text-center z-10">
          <h2 className="text-xl font-bold text-text-primary">{vendedor !== 'N/A' ? vendedor : 'Sem Vendedor'}</h2>
          <p className="text-sm text-text-secondary">Vendedor Estrela • {shareOfWallet}% S.O.W.</p>
        </div>

        <div className="flex gap-3 w-full mt-4 z-10">
          <button onClick={handleWhatsApp} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors font-medium text-sm border border-[#25D366]/20">
            <MessageCircle size={16} /> WhatsApp
          </button>
          <button onClick={handleEmail} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 transition-colors font-medium text-sm border border-brand-500/20">
            <Mail size={16} /> E-mail
          </button>
        </div>
      </div>
    </div>
  );
};
