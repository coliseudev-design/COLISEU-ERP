import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency, parseNumber } from '../../lib/formatters';
import {
  DollarSign,
  Save,
  X,
  Building,
  Calendar,
  Percent,
  AlertCircle,
  FileText,
  Calculator,
  ShieldCheck,
} from 'lucide-react';
import {
  TituloPagarItem,
  RetencoesTributarias,
  salvarTituloPagar,
  getFornecedores,
} from '../../lib/fornecedores';

interface ModalNovoTituloPagarProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (titulo: TituloPagarItem) => void;
}

export const ModalNovoTituloPagar: React.FC<ModalNovoTituloPagarProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const fornecedores = getFornecedores();

  const [fornecedorId, setFornecedorId] = useState(fornecedores[0]?.id || '');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [categoriaDespesa, setCategoriaDespesa] = useState('Compra de Mercadorias para Revenda');
  const [centroCusto, setCentroCusto] = useState('Comercial & Estoque');
  const [dataEmissao, setDataEmissao] = useState(new Date().toLocaleDateString('pt-BR'));
  const [dataVencimento, setDataVencimento] = useState('');
  const [valorBruto, setValorBruto] = useState<number>(0);
  const [valorDesconto, setValorDesconto] = useState<number>(0);
  const [observacoes, setObservacoes] = useState('');

  // Retenções Tributárias na Fonte (WHT)
  const [reterIrrf, setReterIrrf] = useState(false);
  const [aliquotaIrrf, setAliquotaIrrf] = useState(1.5);

  const [reterCsrf, setReterCsrf] = useState(false);
  const [aliquotaCsrf, setAliquotaCsrf] = useState(4.65); // 0.65% PIS + 3.0% COFINS + 1.0% CSLL

  const [reterIssqn, setReterIssqn] = useState(false);
  const [aliquotaIssqn, setAliquotaIssqn] = useState(3.0);

  const [reterInss, setReterInss] = useState(false);
  const [aliquotaInss, setAliquotaInss] = useState(11.0);

  if (!isOpen) return null;

  const fornSelecionado = fornecedores.find((f) => f.id === fornecedorId);

  // Cálculos Automáticos de Retenções
  const valorIrrf = reterIrrf ? Math.round(valorBruto * (aliquotaIrrf / 100) * 100) / 100 : 0;
  const valorCsrf = reterCsrf ? Math.round(valorBruto * (aliquotaCsrf / 100) * 100) / 100 : 0;
  const valorIssqn = reterIssqn ? Math.round(valorBruto * (aliquotaIssqn / 100) * 100) / 100 : 0;
  const valorInss = reterInss ? Math.round(valorBruto * (aliquotaInss / 100) * 100) / 100 : 0;

  const valorTotalRetencoes = valorIrrf + valorCsrf + valorIssqn + valorInss;
  const valorLiquidoPagar = Math.max(0, valorBruto - valorDesconto - valorTotalRetencoes);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!numeroDocumento || !dataVencimento || valorBruto <= 0) {
      alert('Preencha o Número do Documento, Data de Vencimento e Valor Bruto.');
      return;
    }

    const retencoes: RetencoesTributarias = {
      reterIrrf,
      aliquotaIrrf,
      valorIrrf,
      reterCsrf,
      aliquotaCsrf,
      valorCsrf,
      reterIssqn,
      aliquotaIssqn,
      valorIssqn,
      reterInss,
      aliquotaInss,
      valorInss,
      valorTotalRetencoes,
      valorLiquidoPagar,
    };

    const novoTitulo: TituloPagarItem = {
      id: `TIT-PAG-${Date.now()}`,
      numeroDocumento: numeroDocumento.toUpperCase(),
      fornecedorId: fornSelecionado?.id || 'FORN-001',
      fornecedorNome: fornSelecionado?.razaoSocial || 'FORNECEDOR DIVERSO',
      fornecedorCnpj: fornSelecionado?.cnpjCpf || '00.000.000/0000-00',
      dataEmissao,
      dataVencimento,
      categoriaDespesa,
      centroCusto,
      valorBruto,
      valorDesconto,
      valorJurosMulta: 0,
      retencoes,
      valorFinalPagar: valorLiquidoPagar,
      status: 'EM_ABERTO',
      observacoes: observacoes.toUpperCase(),
    };

    salvarTituloPagar(novoTitulo);
    onSuccess(novoTitulo);
    onClose();
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
          maxWidth: '860px',
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
            <DollarSign size={20} color="#ef4444" />
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Lançamento de Título a Pagar & Retenções Tributárias (WHT)
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Cálculo automático de IRRF, CSRF (PIS/COFINS/CSLL), ISSQN e INSS na fonte.
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
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Fornecedor & Documento */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '12px' }}>
            <div>
              <label className="coliseu-label">Fornecedor / Favorecido *</label>
              <select
                className="coliseu-input"
                value={fornecedorId}
                onChange={(e) => setFornecedorId(e.target.value)}
                style={{ height: '38px', width: '100%', fontWeight: 700 }}
              >
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.razaoSocial} ({f.cnpjCpf})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="coliseu-label">Nº Documento / NF-e / Boleto *</label>
              <input
                type="text"
                className="coliseu-input"
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value.toUpperCase())}
                placeholder="Ex: NF-e 49120 ou NFS-e 881"
                style={{ height: '38px', width: '100%', fontWeight: 700 }}
                required
              />
            </div>
          </div>

          {/* Plano de Contas, Centro de Custo e Datas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 130px 130px', gap: '10px' }}>
            <div>
              <label className="coliseu-label">Categoria de Despesa</label>
              <select
                className="coliseu-input"
                value={categoriaDespesa}
                onChange={(e) => setCategoriaDespesa(e.target.value)}
                style={{ height: '36px', width: '100%' }}
              >
                <option value="Compra de Mercadorias para Revenda">Compra de Mercadorias para Revenda</option>
                <option value="Matéria-Prima & Insumos Industriais">Matéria-Prima & Insumos Industriais</option>
                <option value="Serviços Técnicos e Laudos de RT Agronômico">Serviços Técnicos e Laudos de RT Agronômico</option>
                <option value="Fretes e Transportes de Cargas">Fretes e Transportes de Cargas</option>
                <option value="Energia, Água e Telecomunicações">Energia, Água e Telecomunicações</option>
                <option value="Manutenção Predial & Equipamentos">Manutenção Predial & Equipamentos</option>
              </select>
            </div>

            <div>
              <label className="coliseu-label">Centro de Custo</label>
              <select
                className="coliseu-input"
                value={centroCusto}
                onChange={(e) => setCentroCusto(e.target.value)}
                style={{ height: '36px', width: '100%' }}
              >
                <option value="Comercial & Estoque">Comercial & Estoque</option>
                <option value="Produção & Tintas">Produção & Tintas</option>
                <option value="Técnico & Controle de Qualidade">Técnico & Controle de Qualidade</option>
                <option value="Administrativo & Financeiro">Administrativo & Financeiro</option>
                <option value="Logística & Frotas">Logística & Frotas</option>
              </select>
            </div>

            <div>
              <label className="coliseu-label">Emissão</label>
              <input
                type="text"
                className="coliseu-input"
                value={dataEmissao}
                onChange={(e) => setDataEmissao(e.target.value)}
                style={{ height: '36px', width: '100%', textAlign: 'center' }}
              />
            </div>

            <div>
              <label className="coliseu-label">Vencimento *</label>
              <input
                type="text"
                className="coliseu-input"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                placeholder="DD/MM/AAAA"
                style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700, color: '#ef4444' }}
                required
              />
            </div>
          </div>

          {/* Valor Bruto e Desconto */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="coliseu-label">Valor Bruto da Fatura (R$) *</label>
              <input
                type="number"
                step="0.01"
                className="coliseu-input"
                value={valorBruto || ''}
                onChange={(e) => setValorBruto(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                style={{ height: '38px', width: '100%', textAlign: 'right', fontWeight: 700, fontSize: '15px' }}
                required
              />
            </div>

            <div>
              <label className="coliseu-label">Desconto Comercial (R$)</label>
              <input
                type="number"
                step="0.01"
                className="coliseu-input"
                value={valorDesconto || ''}
                onChange={(e) => setValorDesconto(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
                style={{ height: '38px', width: '100%', textAlign: 'right' }}
              />
            </div>
          </div>

          {/* PAINEL DE RETENÇÕES TRIBUTÁRIAS NA FONTE (IRRF, CSRF, ISSQN, INSS) */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: 700, fontSize: '13px' }}>
                <ShieldCheck size={16} /> Retenções Tributárias na Fonte (Impostos Retidos pelo Tomador)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Tributos federais e municipais descontados do fornecedor para recolhimento em DARF/DAM
              </div>
            </div>

            {/* Grid dos 4 Tributos Retidos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {/* IRRF */}
              <div style={{ border: '1px solid var(--border-default)', padding: '10px', borderRadius: '6px', backgroundColor: 'var(--surface-1)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '11px' }}>
                  <input type="checkbox" checked={reterIrrf} onChange={(e) => setReterIrrf(e.target.checked)} />
                  IRRF Retido
                </label>
                {reterIrrf && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                      <span>Alíquota %:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={aliquotaIrrf}
                        onChange={(e) => setAliquotaIrrf(parseFloat(e.target.value) || 0)}
                        style={{ width: '45px', height: '22px', textAlign: 'center' }}
                      />
                    </div>
                    <div style={{ fontWeight: 700, color: '#ef4444', textAlign: 'right', fontSize: '12px', fontFamily: 'monospace' }}>
                      - {formatCurrency(valorIrrf)}
                    </div>
                  </div>
                )}
              </div>

              {/* CSRF (PIS/COFINS/CSLL 4.65%) */}
              <div style={{ border: '1px solid var(--border-default)', padding: '10px', borderRadius: '6px', backgroundColor: 'var(--surface-1)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '11px' }}>
                  <input type="checkbox" checked={reterCsrf} onChange={(e) => setReterCsrf(e.target.checked)} />
                  CSRF (4,65%)
                </label>
                {reterCsrf && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                      <span>Alíquota %:</span>
                      <input
                        type="number"
                        step="0.01"
                        value={aliquotaCsrf}
                        onChange={(e) => setAliquotaCsrf(parseFloat(e.target.value) || 0)}
                        style={{ width: '45px', height: '22px', textAlign: 'center' }}
                      />
                    </div>
                    <div style={{ fontWeight: 700, color: '#ef4444', textAlign: 'right', fontSize: '12px', fontFamily: 'monospace' }}>
                      - {formatCurrency(valorCsrf)}
                    </div>
                  </div>
                )}
              </div>

              {/* ISSQN Retido */}
              <div style={{ border: '1px solid var(--border-default)', padding: '10px', borderRadius: '6px', backgroundColor: 'var(--surface-1)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '11px' }}>
                  <input type="checkbox" checked={reterIssqn} onChange={(e) => setReterIssqn(e.target.checked)} />
                  ISSQN Retido
                </label>
                {reterIssqn && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                      <span>Alíquota %:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={aliquotaIssqn}
                        onChange={(e) => setAliquotaIssqn(parseFloat(e.target.value) || 0)}
                        style={{ width: '45px', height: '22px', textAlign: 'center' }}
                      />
                    </div>
                    <div style={{ fontWeight: 700, color: '#ef4444', textAlign: 'right', fontSize: '12px', fontFamily: 'monospace' }}>
                      - {formatCurrency(valorIssqn)}
                    </div>
                  </div>
                )}
              </div>

              {/* INSS Retido (11%) */}
              <div style={{ border: '1px solid var(--border-default)', padding: '10px', borderRadius: '6px', backgroundColor: 'var(--surface-1)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '11px' }}>
                  <input type="checkbox" checked={reterInss} onChange={(e) => setReterInss(e.target.checked)} />
                  INSS (11%)
                </label>
                {reterInss && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                      <span>Alíquota %:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={aliquotaInss}
                        onChange={(e) => setAliquotaInss(parseFloat(e.target.value) || 0)}
                        style={{ width: '45px', height: '22px', textAlign: 'center' }}
                      />
                    </div>
                    <div style={{ fontWeight: 700, color: '#ef4444', textAlign: 'right', fontSize: '12px', fontFamily: 'monospace' }}>
                      - {formatCurrency(valorInss)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Totalizador de Retenções e Valor Líquido */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Total Retido (DARF/DAM a recolher): <strong style={{ color: '#ef4444' }}>{formatCurrency(valorTotalRetencoes)}</strong>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                LÍQUIDO A PAGAR AO FORNECEDOR: {formatCurrency(valorLiquidoPagar)}
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="coliseu-label">Observações / Chave PIX de Liquidação</label>
            <input
              type="text"
              className="coliseu-input"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Pagamento via PIX para a conta corrente Sicredi..."
              style={{ height: '36px', width: '100%' }}
            />
          </div>

          {/* Footer de Ação */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" leftIcon={<Save size={16} />}>
              Gravar Título a Pagar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
