import React, { useState } from 'react';
import { Button } from '../ui/Button';
import {
  Settings,
  Save,
  X,
  TrendingUp,
  Percent,
  Layers,
  Award,
  DollarSign,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  PoliticaComissaoEmpresa,
  TipoCalculoComissao,
  GatilhoLiberacaoComissao,
  getPoliticaComissao,
  salvarPoliticaComissao,
} from '../../lib/comissoes';

interface ModalConfigRegrasComissaoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalConfigRegrasComissao: React.FC<ModalConfigRegrasComissaoProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [politica, setPolitica] = useState<PoliticaComissaoEmpresa>(getPoliticaComissao);

  if (!isOpen) return null;

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    salvarPoliticaComissao(politica);
    onSuccess();
    onClose();
  };

  const handleAddFaixaMargem = () => {
    setPolitica({
      ...politica,
      faixasMargem: [
        ...politica.faixasMargem,
        { margemMinima: 35.01, margemMaxima: 50, percentualComissao: 5.0 },
      ],
    });
  };

  const handleRemoveFaixaMargem = (index: number) => {
    setPolitica({
      ...politica,
      faixasMargem: politica.faixasMargem.filter((_, i) => i !== index),
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 11000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '880px',
          maxHeight: '94vh',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={20} color="#3b82f6" />
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Políticas Comerciais & Motor de Cálculo de Comissões
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Parametrização flexível: Margem Real, Metas Progressivas, Aceleradores e Gatilhos Financeiros.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSalvar} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Modelo Principal e Gatilho de Liberação */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '14px' }}>
            <div>
              <label className="coliseu-label">Modelo Principal de Cálculo *</label>
              <select
                className="coliseu-input"
                value={politica.tipoCalculoPrincipal}
                onChange={(e) => setPolitica({ ...politica, tipoCalculoPrincipal: e.target.value as any })}
                style={{ height: '38px', width: '100%', fontWeight: 700 }}
              >
                <option value="MARGEM_LUCRO">📈 Margem de Lucro Real (Recomendado - Bonifica Preço Justo)</option>
                <option value="ESCALONADO_POR_META">🎯 Escalonado por Meta & Acelerador Turbo</option>
                <option value="POR_CATEGORIA_MARCA">🏷️ Por Categoria / Marca de Produto</option>
                <option value="PERCENTUAL_DIRETO">💵 Percentual Direto Fixo sobre Faturamento</option>
              </select>
            </div>

            <div>
              <label className="coliseu-label">Gatilho de Liberação da Comissão *</label>
              <select
                className="coliseu-input"
                value={politica.gatilhoLiberacao}
                onChange={(e) => setPolitica({ ...politica, gatilhoLiberacao: e.target.value as any })}
                style={{ height: '38px', width: '100%', fontWeight: 700 }}
              >
                <option value="FATURAMENTO_VENDA">⚡ Na Emissão / Faturamento da Venda (Imediato)</option>
                <option value="QUITACAO_FINANCEIRA">🛡️ Na Quitação / Liquidação da Parcela pelo Cliente</option>
              </select>
            </div>
          </div>

          {/* PAINEL 1: FAIXAS POR MARGEM DE LUCRO */}
          {politica.tipoCalculoPrincipal === 'MARGEM_LUCRO' && (
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--surface-2)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={16} /> Tabela Progressiva por Margem de Lucro Obtida
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={handleAddFaixaMargem} leftIcon={<Plus size={13} />}>
                  Adicionar Faixa
                </Button>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                O sistema calcula a margem bruta da venda (Preço de Venda – Custo Real) e aplica o percentual correspondente:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {politica.faixasMargem.map((f, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '120px 120px 140px auto',
                      gap: '8px',
                      alignItems: 'center',
                      backgroundColor: 'var(--surface-1)',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Margem Mínima %</span>
                      <input
                        type="number"
                        step="0.1"
                        value={f.margemMinima}
                        onChange={(e) => {
                          const novas = [...politica.faixasMargem];
                          novas[idx].margemMinima = parseFloat(e.target.value) || 0;
                          setPolitica({ ...politica, faixasMargem: novas });
                        }}
                        className="coliseu-input"
                        style={{ height: '30px', width: '100%', textAlign: 'center' }}
                      />
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Margem Máxima %</span>
                      <input
                        type="number"
                        step="0.1"
                        value={f.margemMaxima}
                        onChange={(e) => {
                          const novas = [...politica.faixasMargem];
                          novas[idx].margemMaxima = parseFloat(e.target.value) || 0;
                          setPolitica({ ...politica, faixasMargem: novas });
                        }}
                        className="coliseu-input"
                        style={{ height: '30px', width: '100%', textAlign: 'center' }}
                      />
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Comissão Paga %</span>
                      <input
                        type="number"
                        step="0.1"
                        value={f.percentualComissao}
                        onChange={(e) => {
                          const novas = [...politica.faixasMargem];
                          novas[idx].percentualComissao = parseFloat(e.target.value) || 0;
                          setPolitica({ ...politica, faixasMargem: novas });
                        }}
                        className="coliseu-input"
                        style={{ height: '30px', width: '100%', textAlign: 'center', fontWeight: 700, color: '#10b981' }}
                      />
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveFaixaMargem(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PAINEL 2: FAIXAS POR META & ACELERADORES */}
          {politica.tipoCalculoPrincipal === 'ESCALONADO_POR_META' && (
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--surface-2)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={16} /> Escalonamento por Atingimento da Meta & Aceleradores Turbo
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {politica.faixasMetas.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.5fr 120px 140px',
                      gap: '8px',
                      alignItems: 'center',
                      backgroundColor: 'var(--surface-1)',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-default)',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '12px' }}>
                        Faixa: {m.percentualAtingimentoMin}% até {m.percentualAtingimentoMax >= 900 ? 'infinito' : `${m.percentualAtingimentoMax}%`} da Meta
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>% Comissão</span>
                      <input
                        type="number"
                        step="0.1"
                        value={m.percentualComissao}
                        onChange={(e) => {
                          const novas = [...politica.faixasMetas];
                          novas[idx].percentualComissao = parseFloat(e.target.value) || 0;
                          setPolitica({ ...politica, faixasMetas: novas });
                        }}
                        className="coliseu-input"
                        style={{ height: '28px', width: '100%', textAlign: 'center', fontWeight: 700, color: '#10b981' }}
                      />
                    </div>

                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Bônus Fixo (R$)</span>
                      <input
                        type="number"
                        step="50"
                        value={m.bonusFixoValor}
                        onChange={(e) => {
                          const novas = [...politica.faixasMetas];
                          novas[idx].bonusFixoValor = parseFloat(e.target.value) || 0;
                          setPolitica({ ...politica, faixasMetas: novas });
                        }}
                        className="coliseu-input"
                        style={{ height: '28px', width: '100%', textAlign: 'right', fontWeight: 700 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regras Gerais & Deduções */}
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Regras Gerais de Segurança Contábil
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={politica.estornarComissaoEmDevolucao}
                onChange={(e) => setPolitica({ ...politica, estornarComissaoEmDevolucao: e.target.checked })}
              />
              Estornar comissão automaticamente caso haja devolução total ou cancelamento da venda
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={politica.descontarFreteDaBase}
                onChange={(e) => setPolitica({ ...politica, descontarFreteDaBase: e.target.checked })}
              />
              Descontar o valor do frete da base de cálculo da comissão
            </label>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" leftIcon={<Save size={16} />}>
              Salvar Regras de Comissão
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
