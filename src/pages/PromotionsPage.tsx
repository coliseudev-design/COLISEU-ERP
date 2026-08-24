import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../lib/formatters';
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  Sparkles,
  Zap,
  Printer,
  Edit2,
  Trash2,
  Play,
  Pause,
  Layers,
  Flame,
  Ticket,
  Calendar,
} from 'lucide-react';
import {
  CampanhaPromocional,
  MecanicaPromocao,
  getCampanhasPromocionais,
  alternarStatusCampanha,
  excluirCampanhaPromocional,
} from '../lib/promocoesAvancadas';
import { ModalCriarPromocaoAvancada } from '../components/promocoes/ModalCriarPromocaoAvancada';
import { ModalSimuladorPromocao } from '../components/promocoes/ModalSimuladorPromocao';
import { ModalCartazPromocional } from '../components/promocoes/ModalCartazPromocional';

export const PromotionsPage: React.FC = () => {
  const [tabFiltro, setTabFiltro] = useState<'TODAS' | 'ITEM' | 'MARCA' | 'CATEGORIA' | 'LEVE_PAGUE' | 'CUPOM'>('TODAS');
  const [busca, setBusca] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modais
  const [isModalCriarOpen, setIsModalCriarOpen] = useState(false);
  const [isModalSimuladorOpen, setIsModalSimuladorOpen] = useState(false);
  const [isModalCartazOpen, setIsModalCartazOpen] = useState(false);

  const [campanhaSelecionada, setCampanhaSelecionada] = useState<CampanhaPromocional | null>(null);
  const [campanhas, setCampanhas] = useState<CampanhaPromocional[]>(getCampanhasPromocionais);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const handleUpdate = () => {
      setCampanhas(getCampanhasPromocionais());
    };
    window.addEventListener('coliseu_promocoes_updated', handleUpdate);
    return () => window.removeEventListener('coliseu_promocoes_updated', handleUpdate);
  }, []);

  const handleNovo = () => {
    setCampanhaSelecionada(null);
    setIsModalCriarOpen(true);
  };

  const handleEditar = (c: CampanhaPromocional) => {
    setCampanhaSelecionada(c);
    setIsModalCriarOpen(true);
  };

  const handleCartaz = (c: CampanhaPromocional) => {
    setCampanhaSelecionada(c);
    setIsModalCartazOpen(true);
  };

  const handleToggleStatus = (id: string) => {
    const c = alternarStatusCampanha(id);
    if (c) {
      showToast(`Campanha '${c.titulo}' agora está ${c.status}!`);
    }
  };

  const handleExcluir = (id: string, titulo: string) => {
    if (confirm(`Tem certeza que deseja excluir a promoção '${titulo}'?`)) {
      excluirCampanhaPromocional(id);
      showToast(`Promoção excluída com sucesso!`);
    }
  };

  // Filtragem
  const campanhasFiltradas = useMemo(() => {
    return campanhas.filter((c) => {
      if (tabFiltro === 'ITEM' && c.mecanica !== 'DESCONTO_ITEM') return false;
      if (tabFiltro === 'MARCA' && c.mecanica !== 'DESCONTO_MARCA') return false;
      if (tabFiltro === 'CATEGORIA' && c.mecanica !== 'DESCONTO_CATEGORIA') return false;
      if (tabFiltro === 'LEVE_PAGUE' && c.mecanica !== 'LEVE_X_PAGUE_Y') return false;
      if (tabFiltro === 'CUPOM' && c.mecanica !== 'CUPOM_DESCONTO') return false;

      if (busca) {
        const q = busca.toLowerCase();
        const mTit = c.titulo.toLowerCase().includes(q);
        const mCod = c.codigo.toLowerCase().includes(q);
        const mMarca = c.marcaAlvo?.toLowerCase().includes(q);
        const mCat = c.categoriaAlvo?.toLowerCase().includes(q);
        const mCupom = c.codigoCupom?.toLowerCase().includes(q);
        if (!mTit && !mCod && !mMarca && !mCat && !mCupom) return false;
      }

      return true;
    });
  }, [campanhas, tabFiltro, busca]);

  // Estatísticas Globais
  const stats = useMemo(() => {
    const ativas = campanhas.filter((c) => c.status === 'ATIVA').length;
    const totalVendas = campanhas.reduce((acc, c) => acc + c.totalVendasImpactadas, 0);
    const totalDescontos = campanhas.reduce((acc, c) => acc + c.totalDescontoConcedido, 0);
    const totalUsos = campanhas.reduce((acc, c) => acc + c.qtdUsosNoCaixa, 0);

    return {
      ativas,
      totalVendas,
      totalDescontos,
      totalUsos,
    };
  }, [campanhas]);

  return (
    <div className="coliseu-page" style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <CheckCircle2 size={18} color="#10b981" />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="Motor Avançado de Promoções, Ofertas Dinâmicas & Cupons"
        description="Precificação promocional por Item (código de barras), Marca, Categoria, Leve X Pague Y, Cupons e Cartazes de Gôndola."
        breadcrumbItems={[
          { label: 'Comercial', active: false },
          { label: 'Promoções & Ofertas', active: true },
        ]}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            onClick={() => setIsModalSimuladorOpen(true)}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px' }}
          >
            <Zap size={15} color="#f59e0b" /> Simulador de Checkout
          </Button>

          <Button
            variant="primary"
            onClick={handleNovo}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px' }}
          >
            <Plus size={15} /> Nova Campanha Promocional
          </Button>
        </div>
      </PageHeader>

      {/* Cards de Métricas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginBottom: '16px',
        }}
      >
        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Campanhas Ativas no Caixa</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', margin: '4px 0' }}>
            {stats.ativas} ativas
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rodando no PDV & Balcão</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Faturamento com Ofertas</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(stats.totalVendas)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Receita impulsionada</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Economia Concedida a Clientes</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(stats.totalDescontos)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Descontos totais aplicados</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Usos / Bipagens no Caixa</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b', margin: '4px 0' }}>
            {stats.totalUsos} vezes
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Conversões promocionais</div>
        </div>
      </div>

      {/* Abas e Busca */}
      <div
        className="coliseu-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', backgroundColor: 'var(--surface-3)', borderRadius: '6px', padding: '2px', gap: '2px', flexWrap: 'wrap' }}>
          {[
            { key: 'TODAS', label: 'Todas as Campanhas' },
            { key: 'ITEM', label: '🏷️ Por Item (Código de Barras)' },
            { key: 'MARCA', label: '🏢 Por Marca' },
            { key: 'CATEGORIA', label: '📂 Por Categoria' },
            { key: 'LEVE_PAGUE', label: '🎁 Leve X Pague Y' },
            { key: 'CUPOM', label: '🎟️ Cupons' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTabFiltro(tab.key as any)}
              style={{
                border: 'none',
                background: tabFiltro === tab.key ? 'var(--surface-1)' : 'transparent',
                color: tabFiltro === tab.key ? '#f59e0b' : 'var(--text-muted)',
                fontSize: '11px',
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ width: '300px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título, marca, cupom..."
              className="coliseu-input"
              style={{ paddingLeft: '30px', height: '34px', fontSize: '11px' }}
            />
          </div>
        </div>
      </div>

      {/* Tabela de Campanhas */}
      <div className="coliseu-card">
        <div className="coliseu-table-container">
          <table className="coliseu-table" style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Código</th>
                <th>Título da Campanha & Abrangência</th>
                <th style={{ width: '130px' }}>Mecânica</th>
                <th style={{ width: '150px' }}>Vigência & Horário</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Desconto / Oferta</th>
                <th style={{ width: '110px', textAlign: 'right' }}>Vendas (R$)</th>
                <th style={{ width: '90px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '170px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {campanhasFiltradas.map((c) => {
                const isAtiva = c.status === 'ATIVA';

                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-link)', fontSize: '11px' }}>
                      {c.codigo}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {c.titulo}
                      </div>
                      {c.mecanica === 'DESCONTO_MARCA' && (
                        <div style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 600 }}>
                          Marca: {c.marcaAlvo} (Todos os produtos)
                        </div>
                      )}
                      {c.mecanica === 'DESCONTO_CATEGORIA' && (
                        <div style={{ fontSize: '10px', color: '#8b5cf6', fontWeight: 600 }}>
                          Categoria: {c.categoriaAlvo}
                        </div>
                      )}
                      {c.mecanica === 'CUPOM_DESCONTO' && (
                        <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700, fontFamily: 'monospace' }}>
                          Cupom: {c.codigoCupom}
                        </div>
                      )}
                      {c.mecanica === 'DESCONTO_ITEM' && c.itensPromocionais.length > 0 && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {c.itensPromocionais[0].descricao} ({c.itensPromocionais.length} itens)
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--surface-3)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {c.mecanica.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '11px' }}>
                        {c.condicoes.dataInicio} até {c.condicoes.dataFim}
                      </div>
                      {c.condicoes.horaInicio && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          ⏰ {c.condicoes.horaInicio} às {c.condicoes.horaFim}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                      {c.mecanica === 'LEVE_X_PAGUE_Y' ? (
                        <span>Leve {c.leveQuantidade} Pague {c.pagueQuantidade}</span>
                      ) : c.percentualDescontoGeral ? (
                        <span>{c.percentualDescontoGeral}% OFF</span>
                      ) : c.itensPromocionais[0] ? (
                        <span>{c.itensPromocionais[0].percentualDesconto}% OFF</span>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                      {formatCurrency(c.totalVendasImpactadas)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: isAtiva ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: isAtiva ? '#10b981' : '#ef4444',
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        {/* Cartaz A4 */}
                        <button
                          type="button"
                          onClick={() => handleCartaz(c)}
                          className="coliseu-btn coliseu-btn-secondary"
                          style={{ padding: '0 6px', height: '26px', fontSize: '11px', color: '#f59e0b' }}
                          title="Gerar Cartaz de Ofertas A4 para a Loja"
                        >
                          <Printer size={12} /> Cartaz
                        </button>

                        {/* Pausar / Ativar */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(c.id)}
                          className="coliseu-btn coliseu-btn-secondary"
                          style={{ padding: '0 6px', height: '26px', fontSize: '11px' }}
                          title={isAtiva ? 'Pausar Campanha' : 'Ativar Campanha'}
                        >
                          {isAtiva ? <Pause size={12} color="#ef4444" /> : <Play size={12} color="#10b981" />}
                        </button>

                        {/* Editar */}
                        <button
                          type="button"
                          onClick={() => handleEditar(c)}
                          className="coliseu-btn coliseu-btn-secondary"
                          style={{ padding: '0 6px', height: '26px', fontSize: '11px' }}
                          title="Editar Campanha"
                        >
                          <Edit2 size={12} />
                        </button>

                        {/* Excluir */}
                        <button
                          type="button"
                          onClick={() => handleExcluir(c.id, c.titulo)}
                          className="coliseu-btn coliseu-btn-secondary"
                          style={{ padding: '0 6px', height: '26px', fontSize: '11px', color: '#ef4444' }}
                          title="Excluir Promoção"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {campanhasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Nenhuma campanha encontrada para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Criar / Editar Promoção */}
      {isModalCriarOpen && (
        <ModalCriarPromocaoAvancada
          isOpen={isModalCriarOpen}
          onClose={() => setIsModalCriarOpen(false)}
          campanhaEdicao={campanhaSelecionada}
          onSaveSuccess={(c) => {
            showToast(`✅ Campanha '${c.titulo}' salva com sucesso!`);
          }}
        />
      )}

      {/* Modal Simulador de Checkout */}
      {isModalSimuladorOpen && (
        <ModalSimuladorPromocao
          isOpen={isModalSimuladorOpen}
          onClose={() => setIsModalSimuladorOpen(false)}
        />
      )}

      {/* Modal Cartaz de Ofertas A4 */}
      {isModalCartazOpen && (
        <ModalCartazPromocional
          isOpen={isModalCartazOpen}
          onClose={() => setIsModalCartazOpen(false)}
          campanha={campanhaSelecionada}
        />
      )}
    </div>
  );
};
