import React from 'react';
import { Package, Tag, Layers, Fingerprint } from 'lucide-react';

interface DNAVisualizerProps {
  produtoFavorito: string;
  marcaFavorita: string;
}

export const DNAVisualizer: React.FC<DNAVisualizerProps> = ({ produtoFavorito, marcaFavorita }) => {
  // Mock data for demonstration purposes, as requested by the plan to evolve the modules
  const topProducts = [
    { name: produtoFavorito !== 'Análise dinâmica pendente' ? produtoFavorito : 'Ração Premium 15kg', pct: 45, color: 'bg-blue-500' },
    { name: 'Antipulgas Avançado', pct: 25, color: 'bg-indigo-500' },
    { name: 'Banho Super Premium', pct: 15, color: 'bg-emerald-500' },
    { name: 'Petisco Natural', pct: 10, color: 'bg-pink-500' },
    { name: 'Shampoo Neutro', pct: 5, color: 'bg-rose-500' },
  ];

  const topBrands = [
    { name: marcaFavorita !== 'Análise dinâmica pendente' ? marcaFavorita : 'Royal Canin', initial: 'R', color: 'from-blue-400 to-blue-600' },
    { name: 'Bravecto', initial: 'B', color: 'from-indigo-400 to-indigo-600' },
    { name: 'PremieR', initial: 'P', color: 'from-emerald-400 to-emerald-600' },
    { name: 'Zee.Dog', initial: 'Z', color: 'from-pink-400 to-pink-600' },
  ];

  const categories = [
    { name: 'Alimentação', size: 100, color: 'bg-blue-500/20 text-blue-500 border-blue-500/30' },
    { name: 'Farmácia', size: 80, color: 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30' },
    { name: 'Estética', size: 60, color: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' },
    { name: 'Acessórios', size: 40, color: 'bg-pink-500/20 text-pink-500 border-pink-500/30' },
  ];

  return (
    <div className="bg-bg-primary/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-card transition-all duration-300 h-full flex flex-col" aria-label="DNA de Consumo">
      <div className="flex items-center mb-6 border-b border-white/5 pb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 flex items-center justify-center mr-3 border border-white/10">
          <Fingerprint size={20} className="text-blue-400" />
        </div>
        <h3 className="text-lg font-bold text-text-primary">DNA de Consumo</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
        {/* Top 5 Products */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-text-secondary flex items-center">
            <Package size={14} className="mr-2" /> Top Produtos
          </h4>
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={i} className="group cursor-default">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-primary truncate pr-2 font-medium">{p.name}</span>
                  <span className="text-text-secondary font-bold">{p.pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${p.color} rounded-full transition-all duration-1000 ease-out group-hover:brightness-125`} 
                    style={{ width: `${p.pct}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Brands and Categories */}
        <div className="space-y-6 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-text-secondary flex items-center mb-4">
              <Tag size={14} className="mr-2" /> Marcas Predominantes
            </h4>
            <div className="flex flex-wrap gap-3">
              {topBrands.map((b, i) => (
                <div key={i} className="relative group cursor-pointer" title={b.name}>
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${b.color} flex items-center justify-center text-white font-bold text-lg shadow-lg transform transition-transform group-hover:scale-110 group-hover:-translate-y-1`}>
                    {b.initial}
                  </div>
                  {/* Tooltip */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-bg-tertiary text-text-primary text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-xl border border-white/10">
                    {b.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-secondary flex items-center mb-4">
              <Layers size={14} className="mr-2" /> Nuvem de Categorias
            </h4>
            <div className="relative h-32 w-full bg-bg-secondary/30 rounded-2xl border border-white/5 overflow-hidden p-2 flex flex-wrap items-center justify-center gap-2">
              {categories.map((c, i) => (
                <div 
                  key={i} 
                  className={`flex items-center justify-center rounded-full border ${c.color} shadow-sm backdrop-blur-sm transition-transform hover:scale-110 cursor-default`}
                  style={{ 
                    width: `${c.size}px`, 
                    height: `${c.size}px`,
                    fontSize: `${Math.max(10, c.size / 5)}px`,
                    fontWeight: 'bold'
                  }}
                >
                  {c.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
