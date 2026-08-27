import { useBranchPeriodQuery } from '../hooks/useApi'
import KPICard from '../components/KPICard'
import PeriodFilter from '../components/PeriodFilter'
import {
  Users, Package, Star, TrendingUp, Archive, BarChart
} from 'lucide-react'
import { formatBRL, formatBRLCompact, formatNum, formatPct } from '../utils/format'

interface ClienteEstatistica {
  nome: string;
  total: number;
}

interface CategoriaEstatistica {
  categoria: string;
  total: number;
}

interface EstatisticasKPIs {
  kpis: {
    clientes_ativos: number;
    total_clientes: number;
    ticket_medio: number;
    estoque: {
      qtd: number;
      valor: number;
    };
    taxa_conversao_pct: number;
    produto_mais_vendido: string;
    top_clientes: ClienteEstatistica[];
    top_categorias: CategoriaEstatistica[];
  }
}

export default function Estatisticas() {
  const kpis = useBranchPeriodQuery<EstatisticasKPIs>('/estatisticas/kpis')
  const k = kpis.data?.kpis

  return (
    <div className="space-y-6" aria-label="Estatísticas">
      <PeriodFilter />

      {/* Seção Central - Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* BLOCO CLIENTES */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E0E0E0] pb-2">
            <Users size={20} className="text-brand-500" />
            <h2 className="font-heading font-semibold text-lg text-text-primary">Métricas de Clientes</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <KPICard
              label="Clientes Ativos"
              value={formatNum(k?.clientes_ativos)}
              icon={Users}
              hint={`de ${formatNum(k?.total_clientes)} total`}
              loading={kpis.isLoading}
            />
            <KPICard
              label="Ticket Médio"
              value={formatBRLCompact(k?.ticket_medio)}
              icon={TrendingUp}
              iconColor="text-success"
              loading={kpis.isLoading}
            />
          </div>

          <div className="pt-2">
            <h3 className="text-sm font-semibold text-text-secondary mb-2 flex items-center gap-1">
              <Star size={14} /> Top 5 Clientes (Faturamento)
            </h3>
            {kpis.isLoading ? (
              <div className="text-center text-sm text-text-secondary">Carregando...</div>
            ) : (k?.top_clientes && k.top_clientes.length > 0) ? (
              <div className="space-y-0.5">
                {(k?.top_clientes || []).map((c: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0 text-sm hover:bg-bg-secondary transition-colors px-1 rounded-sm">
                    <span className="font-medium text-text-secondary truncate pr-4"><span className="text-text-tertiary mr-2 w-4 inline-block">{i + 1}.</span> {c.nome}</span>
                    <span className="font-bold text-text-primary flex-shrink-0">{formatBRL(c.total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-text-secondary">Nenhum dado no período.</div>
            )}
          </div>
        </div>

        {/* BLOCO PRODUTOS */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E0E0E0] pb-2">
            <Package size={20} className="text-warning" />
            <h2 className="font-heading font-semibold text-lg text-text-primary">Métricas de Produtos</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <KPICard
              label="Qtd. em Estoque"
              value={formatNum(k?.estoque?.qtd)}
              icon={Archive}
              loading={kpis.isLoading}
            />
            <KPICard
              label="Valor do Estoque"
              value={formatBRLCompact(k?.estoque?.valor)}
              icon={BarChart}
              iconColor="text-warning"
              loading={kpis.isLoading}
            />
          </div>

          <div className="pt-2">
            <h3 className="text-sm font-semibold text-text-secondary mb-2 flex items-center gap-1">
              <Star size={14} /> Principais Categorias (Giro)
            </h3>
            {kpis.isLoading ? (
              <div className="text-center text-sm text-text-secondary">Carregando...</div>
            ) : (k?.top_categorias && k.top_categorias.length > 0) ? (
              <div className="space-y-0.5">
                {(k?.top_categorias || []).map((c: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0 text-sm hover:bg-bg-secondary transition-colors px-1 rounded-sm">
                    <span className="font-medium text-text-secondary capitalize truncate pr-4"><span className="text-text-tertiary mr-2 w-4 inline-block">{i + 1}.</span> {c.categoria?.toLowerCase() || 'Sem categoria'}</span>
                    <span className="font-bold text-text-primary flex-shrink-0">{formatBRL(c.total)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-text-secondary">Nenhuma venda de categorias no período.</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Bloco Conversão */}
        <div className="card">
        <div className="flex items-start gap-3">
          <TrendingUp size={20} className="text-brand-500 mt-0.5" />
          <div>
            <h3 className="font-heading font-semibold text-sm mb-1">Análise de Conversão</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Durante o período selecionado, a conversão de faturamento da base de clientes foi de <span className="font-semibold text-brand-600">{formatPct(k?.taxa_conversao_pct)}</span>. 
              {k?.produto_mais_vendido && k?.produto_mais_vendido !== '—' && (
                <> O produto que mais tracionou as vendas foi <span className="font-semibold text-text-primary">{k.produto_mais_vendido}</span>.</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
