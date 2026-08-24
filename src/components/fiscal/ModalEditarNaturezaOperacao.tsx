import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import {
  FileText,
  Save,
  X,
  Plus,
  Trash2,
  Copy,
  Search,
  CheckCircle2,
  AlertCircle,
  Building,
  Smartphone,
  ShieldCheck,
  Percent,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  NaturezaOperacaoCompleta,
  TipoMovimentoNatureza,
  DestinoOperacao,
  CategoriaOperacao,
  salvarNaturezaOperacao,
  clonarNaturezaOperacao,
  excluirNaturezaOperacao,
} from '../../lib/naturezasOperacao';

interface ModalEditarNaturezaOperacaoProps {
  isOpen: boolean;
  onClose: () => void;
  naturezaEdicao?: NaturezaOperacaoCompleta | null;
  onSaveSuccess: (natureza: NaturezaOperacaoCompleta) => void;
}

export const ModalEditarNaturezaOperacao: React.FC<ModalEditarNaturezaOperacaoProps> = ({
  isOpen,
  onClose,
  naturezaEdicao,
  onSaveSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'CADASTRO' | 'IMPOSTOS' | 'MULTI_EMPRESA' | 'MOBILE'>('CADASTRO');

  // ABA 1: CADASTRO
  const [codigo, setCodigo] = useState(naturezaEdicao?.codigo || '1');
  const [cfop, setCfop] = useState(naturezaEdicao?.cfop || '5102');
  const [descricao, setDescricao] = useState(naturezaEdicao?.descricao || '');
  const [descricaoNota, setDescricaoNota] = useState(naturezaEdicao?.descricaoNota || '');
  const [tipoMovimento, setTipoMovimento] = useState<TipoMovimentoNatureza>(naturezaEdicao?.tipoMovimento || 'SAIDA');
  const [destino, setDestino] = useState<DestinoOperacao>(naturezaEdicao?.destino || 'DENTRO DO ESTADO');
  const [acobertamento, setAcobertamento] = useState(naturezaEdicao?.operacional.acobertamento || 'NÃO APLICÁVEL');
  const [cfopAtiva, setCfopAtiva] = useState(naturezaEdicao?.operacional.cfopAtivaPelaNatureza ?? true);
  const [categoria, setCategoria] = useState<CategoriaOperacao>(naturezaEdicao?.categoria || 'MOVIMENTAÇÃO');
  const [status, setStatus] = useState<'ATIVA' | 'INATIVA'>(naturezaEdicao?.status || 'ATIVA');

  // Operacional
  const [estoqueReal, setEstoqueReal] = useState(naturezaEdicao?.operacional.movimentaEstoqueReal ?? true);
  const [estoqueFiscal, setEstoqueFiscal] = useState(naturezaEdicao?.operacional.movimentaEstoqueFiscal ?? true);
  const [geraFinanceiro, setGeraFinanceiro] = useState(naturezaEdicao?.operacional.geraFinanceiro ?? true);
  const [calculaIcms, setCalculaIcms] = useState(naturezaEdicao?.operacional.calculaIcms ?? true);
  const [calculaIpi, setCalculaIpi] = useState(naturezaEdicao?.operacional.calculaIpi ?? false);
  const [calculaIss, setCalculaIss] = useState(naturezaEdicao?.operacional.calculaIss ?? false);
  const [calculaComissao, setCalculaComissao] = useState(naturezaEdicao?.operacional.calculaComissao ?? true);
  const [calculaPisCofins, setCalculaPisCofins] = useState(naturezaEdicao?.operacional.calculaPisCofins ?? true);
  const [permiteTransferencia, setPermiteTransferencia] = useState(naturezaEdicao?.operacional.permiteTransferencia ?? false);
  const [desconsiderarChaveRef, setDesconsiderarChaveRef] = useState(naturezaEdicao?.operacional.desconsiderarChaveReferenciada ?? false);
  const [vendaConsumidorFinal, setVendaConsumidorFinal] = useState(naturezaEdicao?.operacional.opcaoVendaConsumidorFinal ?? true);

  // Caixas de Habilitação Rápida
  const [utilizarVendas, setUtilizarVendas] = useState(naturezaEdicao?.utilizarEmVendas ?? true);
  const [utilizarCompras, setUtilizarCompras] = useState(naturezaEdicao?.utilizarEmCompras ?? false);
  const [utilizarMobile, setUtilizarMobile] = useState(naturezaEdicao?.utilizarEmMobile ?? true);

  // ABA 2: IMPOSTOS
  const [tributacaoAtiva, setTributacaoAtiva] = useState(naturezaEdicao?.impostos.tributacaoAtiva ?? true);
  const [origemMercadoria, setOrigemMercadoria] = useState(naturezaEdicao?.impostos.origemMercadoria || '0 - NACIONAL');
  const [cstIcms, setCstIcms] = useState(naturezaEdicao?.impostos.cstIcms || '00');
  const [csosn, setCsosn] = useState(naturezaEdicao?.impostos.csosn || '102');
  const [aliquotaIcms, setAliquotaIcms] = useState<number>(naturezaEdicao?.impostos.aliquotaIcms || 17.0);
  const [reducaoBaseIcms, setReducaoBaseIcms] = useState<number>(naturezaEdicao?.impostos.reducaoBaseIcms || 0);
  const [forcarReducao, setForcarReducao] = useState(naturezaEdicao?.impostos.forcarUsoReducao ?? false);
  const [aliquotaIcmsSt, setAliquotaIcmsSt] = useState<number>(naturezaEdicao?.impostos.aliquotaIcmsSt || 0);
  const [reducaoBaseIcmsSt, setReducaoBaseIcmsSt] = useState<number>(naturezaEdicao?.impostos.reducaoBaseIcmsSt || 0);
  const [mvaPercentual, setMvaPercentual] = useState<number>(naturezaEdicao?.impostos.mvaPercentual || 0);
  const [diferimento, setDiferimento] = useState<number>(naturezaEdicao?.impostos.diferimentoPercentual || 0);
  const [calculoDesoneracao, setCalculoDesoneracao] = useState(naturezaEdicao?.impostos.calculoDesoneracao ?? false);
  const [cBenef, setCBenef] = useState(naturezaEdicao?.impostos.codigoBeneficioFiscal || '');
  const [msgFisco, setMsgFisco] = useState(naturezaEdicao?.impostos.mensagemAuxiliarFisco || '');

  // IPI / PIS / COFINS
  const [cstIpi, setCstIpi] = useState(naturezaEdicao?.impostos.cstIpi || '52');
  const [aliquotaIpi, setAliquotaIpi] = useState<number>(naturezaEdicao?.impostos.aliquotaIpi || 0);
  const [enqIpi, setEnqIpi] = useState(naturezaEdicao?.impostos.enquadramentoLegalIpi || '999');
  const [cstPis, setCstPis] = useState(naturezaEdicao?.impostos.cstPis || '01');
  const [aliquotaPis, setAliquotaPis] = useState<number>(naturezaEdicao?.impostos.aliquotaPis || 1.65);
  const [cstCofins, setCstCofins] = useState(naturezaEdicao?.impostos.cstCofins || '01');
  const [aliquotaCofins, setAliquotaCofins] = useState<number>(naturezaEdicao?.impostos.aliquotaCofins || 7.60);

  // ABA 3: MULTI-EMPRESA
  const [empresaSelecionada, setEmpresaSelecionada] = useState(naturezaEdicao?.empresasVinculadas[0] || '<< TODAS >>');

  // Atalhos de Teclado (F3 Novo, F5 Salvar, F6 Editar, F9 Consultar, ESC Fechar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        handleSalvar();
      } else if (e.key === 'F3') {
        e.preventDefault();
        handleLimparNovo();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!isOpen) return null;

  const handleSalvar = () => {
    if (!descricao.trim() || !cfop.trim()) {
      alert('Preencha a descrição e o CFOP da natureza de operação.');
      return;
    }

    const payload: NaturezaOperacaoCompleta = {
      id: naturezaEdicao?.id || `NAT-${Date.now()}`,
      codigo,
      cfop: cfop.trim(),
      descricao: descricao.toUpperCase(),
      descricaoNota: (descricaoNota || descricao).toUpperCase(),
      tipoMovimento,
      destino,
      categoria,
      status,
      utilizarEmVendas: utilizarVendas,
      utilizarEmCompras: utilizarCompras,
      utilizarEmMobile: utilizarMobile,
      empresasVinculadas: [empresaSelecionada],
      operacional: {
        movimentaEstoqueReal: estoqueReal,
        movimentaEstoqueFiscal: estoqueFiscal,
        geraFinanceiro,
        calculaIcms,
        calculaIpi,
        calculaIss,
        calculaComissao,
        calculaPisCofins,
        permiteTransferencia,
        desconsiderarChaveReferenciada: desconsiderarChaveRef,
        opcaoVendaConsumidorFinal: vendaConsumidorFinal,
        cfopAtivaPelaNatureza: cfopAtiva,
        acobertamento,
      },
      impostos: {
        tributacaoAtiva,
        origemMercadoria,
        cstIcms,
        csosn,
        aliquotaIcms,
        reducaoBaseIcms,
        forcarUsoReducao: forcarReducao,
        aliquotaIcmsSt,
        reducaoBaseIcmsSt,
        mvaPercentual,
        diferimentoPercentual: diferimento,
        calculoDesoneracao,
        codigoBeneficioFiscal: cBenef,
        mensagemAuxiliarFisco: msgFisco,
        cstIpi,
        aliquotaIpi,
        enquadramentoLegalIpi: enqIpi,
        cstPis,
        aliquotaPis,
        cstCofins,
        aliquotaCofins,
      },
    };

    salvarNaturezaOperacao(payload);
    onSaveSuccess(payload);
    onClose();
  };

  const handleClonar = () => {
    if (naturezaEdicao) {
      const c = clonarNaturezaOperacao(naturezaEdicao.id);
      if (c) {
        alert(`Natureza de Operação clonada com sucesso! Código gerado: ${c.codigo}`);
        onSaveSuccess(c);
        onClose();
      }
    }
  };

  const handleEliminar = () => {
    if (naturezaEdicao && confirm(`Deseja realmente eliminar a natureza ${naturezaEdicao.cfop} - ${naturezaEdicao.descricao}?`)) {
      excluirNaturezaOperacao(naturezaEdicao.id);
      onClose();
    }
  };

  const handleLimparNovo = () => {
    setCodigo(`${Date.now().toString().slice(-4)}`);
    setCfop('5102');
    setDescricao('');
    setDescricaoNota('');
    setTipoMovimento('SAIDA');
    setActiveTab('CADASTRO');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(4px)',
        zIndex: 12000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '96vh',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: 'var(--surface-2)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} color="#3b82f6" />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Cadastro de Naturezas de Operação (CFOP)
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                São associadas aos pedidos de saída/entrada e geram as informações de contas, estoque e tributação.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ABAS SUPERIORES */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-2)', padding: '0 16px' }}>
          {[
            { key: 'CADASTRO', label: '📁 Cadastro' },
            { key: 'IMPOSTOS', label: '📋 Impostos' },
            { key: 'MULTI_EMPRESA', label: '🏢 Multi-Empresa' },
            { key: 'MOBILE', label: '📱 Mobile / Força de Vendas' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab.key ? '#3b82f6' : 'var(--text-muted)',
                fontWeight: activeTab === tab.key ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* FORMULÁRIO DO CORPO */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* ========================================================================= */}
          {/* ABA 1: CADASTRO */}
          {/* ========================================================================= */}
          {activeTab === 'CADASTRO' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Linha 1: Código, Descrição e Descrição Nota */}
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1.5fr 1.5fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Código:</label>
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    className="coliseu-input"
                    style={{ height: '32px', textAlign: 'center', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Descrição: *</label>
                  <input
                    type="text"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value.toUpperCase())}
                    placeholder="Ex: VENDA DE MERCADORIAS DENTRO DO ESTADO"
                    className="coliseu-input"
                    style={{ height: '32px', width: '100%', fontWeight: 700 }}
                    required
                  />
                </div>

                <div>
                  <label className="coliseu-label">Descrição Nota: (DANFE)</label>
                  <input
                    type="text"
                    value={descricaoNota}
                    onChange={(e) => setDescricaoNota(e.target.value.toUpperCase())}
                    placeholder="Ex: VENDA DE MERCADORIAS DENTRO DO ESTADO"
                    className="coliseu-input"
                    style={{ height: '32px', width: '100%' }}
                  />
                </div>
              </div>

              {/* Linha 2: Tipo Movimento (Radio), Destino, Acobertamento */}
              <div style={{ display: 'grid', gridTemplateColumns: '180px 1.4fr 1.4fr', gap: '10px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', backgroundColor: 'var(--surface-2)', padding: '6px 12px', borderRadius: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="tipoMovimento"
                      checked={tipoMovimento === 'SAIDA'}
                      onChange={() => setTipoMovimento('SAIDA')}
                    />
                    Saída
                  </label>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="tipoMovimento"
                      checked={tipoMovimento === 'ENTRADA'}
                      onChange={() => setTipoMovimento('ENTRADA')}
                    />
                    Entrada
                  </label>
                </div>

                <div>
                  <label className="coliseu-label">Destino:</label>
                  <select value={destino} onChange={(e) => setDestino(e.target.value as any)} className="coliseu-input" style={{ height: '32px', width: '100%', fontWeight: 600 }}>
                    <option value="DENTRO DO ESTADO">DENTRO DO ESTADO</option>
                    <option value="FORA DO ESTADO">FORA DO ESTADO</option>
                    <option value="EXTERIOR">EXTERIOR</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Acobertamento:</label>
                  <select value={acobertamento} onChange={(e) => setAcobertamento(e.target.value)} className="coliseu-input" style={{ height: '32px', width: '100%' }}>
                    <option value="NÃO APLICÁVEL">NÃO APLICÁVEL</option>
                    <option value="NOTA FISCAL ELETRÔNICA (NF-E)">NOTA FISCAL ELETRÔNICA (NF-E)</option>
                    <option value="CUPOM FISCAL ELETRÔNICO (NFC-E)">CUPOM FISCAL ELETRÔNICO (NFC-E)</option>
                  </select>
                </div>
              </div>

              {/* Linha 3: CFOP e Checkbox de Ativação Rápida */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1.5fr 1fr', gap: '10px', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.08)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                <div>
                  <label className="coliseu-label" style={{ color: '#3b82f6' }}>CFOP:</label>
                  <input
                    type="text"
                    value={cfop}
                    onChange={(e) => setCfop(e.target.value)}
                    className="coliseu-input"
                    style={{ height: '32px', textAlign: 'center', fontWeight: 800, fontFamily: 'monospace', fontSize: '13px', borderColor: '#3b82f6' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={cfopAtiva}
                      onChange={(e) => setCfopAtiva(e.target.checked)}
                    />
                    CFOP Ativa pela Natureza de Operação
                  </label>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Determina a incidência tributária padrão para todos os itens emitidos.
                  </span>
                </div>

                <div>
                  <label className="coliseu-label">Operação:</label>
                  <select value={categoria} onChange={(e) => setCategoria(e.target.value as any)} className="coliseu-input" style={{ height: '32px', width: '100%', fontWeight: 700 }}>
                    <option value="MOVIMENTAÇÃO">MOVIMENTAÇÃO</option>
                    <option value="FATURAMENTO">FATURAMENTO</option>
                    <option value="REMESSA">REMESSA</option>
                    <option value="DEVOLUÇÃO">DEVOLUÇÃO</option>
                    <option value="TRANSFERÊNCIA">TRANSFERÊNCIA</option>
                    <option value="BONIFICAÇÃO">BONIFICAÇÃO</option>
                  </select>
                </div>
              </div>

              {/* Linha 4: Matriz de Regras Operacionais (Estoque R/F, Financeiro, Impostos) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', backgroundColor: 'var(--surface-2)', padding: '12px', borderRadius: '6px' }}>
                {/* Coluna 1 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Estoque Real:</span>
                    <select value={estoqueReal ? 'SIM' : 'NAO'} onChange={(e) => setEstoqueReal(e.target.value === 'SIM')} className="coliseu-input" style={{ width: '70px', height: '26px', fontSize: '10px' }}>
                      <option value="SIM">SIM</option>
                      <option value="NAO">NÃO</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Estoque Fiscal:</span>
                    <select value={estoqueFiscal ? 'SIM' : 'NAO'} onChange={(e) => setEstoqueFiscal(e.target.value === 'SIM')} className="coliseu-input" style={{ width: '70px', height: '26px', fontSize: '10px' }}>
                      <option value="SIM">SIM</option>
                      <option value="NAO">NÃO</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Gera Financeiro:</span>
                    <select value={geraFinanceiro ? 'SIM' : 'NAO'} onChange={(e) => setGeraFinanceiro(e.target.value === 'SIM')} className="coliseu-input" style={{ width: '70px', height: '26px', fontSize: '10px' }}>
                      <option value="SIM">SIM</option>
                      <option value="NAO">NÃO</option>
                    </select>
                  </div>
                </div>

                {/* Coluna 2 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Calcula ICMS:</span>
                    <select value={calculaIcms ? 'SIM' : 'NAO'} onChange={(e) => setCalculaIcms(e.target.value === 'SIM')} className="coliseu-input" style={{ width: '70px', height: '26px', fontSize: '10px' }}>
                      <option value="SIM">SIM</option>
                      <option value="NAO">NÃO</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Calcula IPI:</span>
                    <select value={calculaIpi ? 'SIM' : 'NAO'} onChange={(e) => setCalculaIpi(e.target.value === 'SIM')} className="coliseu-input" style={{ width: '70px', height: '26px', fontSize: '10px' }}>
                      <option value="SIM">SIM</option>
                      <option value="NAO">NÃO</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Calcula ISS:</span>
                    <select value={calculaIss ? 'SIM' : 'NAO'} onChange={(e) => setCalculaIss(e.target.value === 'SIM')} className="coliseu-input" style={{ width: '70px', height: '26px', fontSize: '10px' }}>
                      <option value="SIM">SIM</option>
                      <option value="NAO">NÃO</option>
                    </select>
                  </div>
                </div>

                {/* Coluna 3 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Calcula Comissão:</span>
                    <select value={calculaComissao ? 'SIM' : 'NAO'} onChange={(e) => setCalculaComissao(e.target.value === 'SIM')} className="coliseu-input" style={{ width: '70px', height: '26px', fontSize: '10px' }}>
                      <option value="SIM">SIM</option>
                      <option value="NAO">NÃO</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Calcula PIS/COFINS:</span>
                    <select value={calculaPisCofins ? 'SIM' : 'NAO'} onChange={(e) => setCalculaPisCofins(e.target.value === 'SIM')} className="coliseu-input" style={{ width: '70px', height: '26px', fontSize: '10px' }}>
                      <option value="SIM">SIM</option>
                      <option value="NAO">NÃO</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Status Geral:</span>
                    <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="coliseu-input" style={{ width: '70px', height: '26px', fontSize: '10px', fontWeight: 700, color: status === 'ATIVA' ? '#10b981' : '#ef4444' }}>
                      <option value="ATIVA">ATIVA</option>
                      <option value="INATIVA">INATIVA</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Linha 5: Checkboxes de Aplicação Operacional */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '6px 10px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={permiteTransferencia} onChange={(e) => setPermiteTransferencia(e.target.checked)} />
                  Permite Realizar Transferência
                </label>

                <label style={{ fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={desconsiderarChaveRef} onChange={(e) => setDesconsiderarChaveRef(e.target.checked)} />
                  Desconsiderar Chave Referenciada
                </label>

                <label style={{ fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={vendaConsumidorFinal} onChange={(e) => setVendaConsumidorFinal(e.target.checked)} />
                  Opção de Venda Interna Cons. Final
                </label>
              </div>

              {/* Linha 6: Caixas de Seleção de Habilitação Rápida em Vendas e Compras */}
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', padding: '10px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>Disponibilidade Operacional:</span>

                <label style={{ fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={utilizarVendas} onChange={(e) => setUtilizarVendas(e.target.checked)} />
                  🛒 Habilitar no Módulo de Vendas / Balcão
                </label>

                <label style={{ fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={utilizarCompras} onChange={(e) => setUtilizarCompras(e.target.checked)} />
                  📦 Habilitar no Módulo de Compras / Entrada XML
                </label>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: IMPOSTOS */}
          {/* ========================================================================= */}
          {activeTab === 'IMPOSTOS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--surface-2)', padding: '8px 12px', borderRadius: '6px' }}>
                <input
                  type="checkbox"
                  checked={tributacaoAtiva}
                  onChange={(e) => setTributacaoAtiva(e.target.checked)}
                />
                <span style={{ fontSize: '12px', fontWeight: 700 }}>Tributação Ativa pela Natureza de Operação</span>
              </div>

              {/* Origem e CST / CSOSN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Origem Mercadoria:</label>
                  <select value={origemMercadoria} onChange={(e) => setOrigemMercadoria(e.target.value)} className="coliseu-input" style={{ height: '32px', width: '100%' }}>
                    <option value="0 - NACIONAL">0 - NACIONAL</option>
                    <option value="1 - ESTRANGEIRA IMPORTAÇÃO DIRETA">1 - ESTRANGEIRA IMPORTAÇÃO DIRETA</option>
                    <option value="2 - ESTRANGEIRA ADQUIRIDA NO MERCADO INTERNO">2 - ESTRANGEIRA MERCADO INTERNO</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Tipo Tributação ICMS (CST):</label>
                  <select value={cstIcms} onChange={(e) => setCstIcms(e.target.value)} className="coliseu-input" style={{ height: '32px', width: '100%', fontWeight: 600 }}>
                    <option value="00">00 - TRIBUTADA INTEGRALMENTE</option>
                    <option value="10">10 - TRIBUTADA COM COBRANÇA POR ST</option>
                    <option value="20">20 - COM REDUÇÃO DE BASE DE CÁLCULO</option>
                    <option value="40">40 - ISENTA</option>
                    <option value="41">41 - NÃO TRIBUTADA</option>
                    <option value="60">60 - ICMS COBRADO ANTERIORMENTE POR ST</option>
                    <option value="90">90 - OUTRAS TRIBUTAÇÕES</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">CSOSN (Simples Nacional):</label>
                  <select value={csosn} onChange={(e) => setCsosn(e.target.value)} className="coliseu-input" style={{ height: '32px', width: '100%', fontWeight: 700 }}>
                    <option value="101">101 - COM PERMISSÃO DE CRÉDITO</option>
                    <option value="102">102 - SEM PERMISSÃO DE CRÉDITO</option>
                    <option value="201">201 - COM CRÉDITO E ICMS ST</option>
                    <option value="202">202 - SEM CRÉDITO E COM ICMS ST</option>
                    <option value="400">400 - NÃO TRIBUTADA</option>
                    <option value="500">500 - ICMS ST COBRADO ANTERIORMENTE</option>
                    <option value="900">900 - OUTROS</option>
                  </select>
                </div>
              </div>

              {/* Alíquotas ICMS, ST e Reduções */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', backgroundColor: 'var(--surface-2)', padding: '12px', borderRadius: '6px' }}>
                <div>
                  <label className="coliseu-label">Alíquota ICMS (%):</label>
                  <input type="number" step="0.5" value={aliquotaIcms} onChange={(e) => setAliquotaIcms(parseFloat(e.target.value) || 0)} className="coliseu-input" style={{ height: '30px', textAlign: 'center', fontWeight: 700 }} />
                </div>

                <div>
                  <label className="coliseu-label">Redução Base (%):</label>
                  <input type="number" step="0.5" value={reducaoBaseIcms} onChange={(e) => setReducaoBaseIcms(parseFloat(e.target.value) || 0)} className="coliseu-input" style={{ height: '30px', textAlign: 'center' }} />
                </div>

                <div>
                  <label className="coliseu-label">Alíquota ICMS ST (%):</label>
                  <input type="number" step="0.5" value={aliquotaIcmsSt} onChange={(e) => setAliquotaIcmsSt(parseFloat(e.target.value) || 0)} className="coliseu-input" style={{ height: '30px', textAlign: 'center', fontWeight: 700 }} />
                </div>

                <div>
                  <label className="coliseu-label">MVA (%):</label>
                  <input type="number" step="0.5" value={mvaPercentual} onChange={(e) => setMvaPercentual(parseFloat(e.target.value) || 0)} className="coliseu-input" style={{ height: '30px', textAlign: 'center', fontWeight: 700 }} />
                </div>
              </div>

              {/* IPI, PIS, COFINS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', backgroundColor: 'var(--surface-2)', padding: '12px', borderRadius: '6px' }}>
                <div>
                  <label className="coliseu-label">CST IPI & Alíquota (%):</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="text" value={cstIpi} onChange={(e) => setCstIpi(e.target.value)} className="coliseu-input" style={{ width: '50px', height: '30px', textAlign: 'center' }} />
                    <input type="number" step="0.5" value={aliquotaIpi} onChange={(e) => setAliquotaIpi(parseFloat(e.target.value) || 0)} className="coliseu-input" style={{ flex: 1, height: '30px', textAlign: 'center', fontWeight: 700 }} />
                  </div>
                </div>

                <div>
                  <label className="coliseu-label">CST PIS & Alíquota (%):</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="text" value={cstPis} onChange={(e) => setCstPis(e.target.value)} className="coliseu-input" style={{ width: '50px', height: '30px', textAlign: 'center' }} />
                    <input type="number" step="0.01" value={aliquotaPis} onChange={(e) => setAliquotaPis(parseFloat(e.target.value) || 0)} className="coliseu-input" style={{ flex: 1, height: '30px', textAlign: 'center', fontWeight: 700 }} />
                  </div>
                </div>

                <div>
                  <label className="coliseu-label">CST COFINS & Alíquota (%):</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="text" value={cstCofins} onChange={(e) => setCstCofins(e.target.value)} className="coliseu-input" style={{ width: '50px', height: '30px', textAlign: 'center' }} />
                    <input type="number" step="0.01" value={aliquotaCofins} onChange={(e) => setAliquotaCofins(parseFloat(e.target.value) || 0)} className="coliseu-input" style={{ flex: 1, height: '30px', textAlign: 'center', fontWeight: 700 }} />
                  </div>
                </div>
              </div>

              {/* Mensagem Auxiliar ao Fisco */}
              <div>
                <label className="coliseu-label">Mensagem Auxiliar / Observações ao Fisco no DANFE:</label>
                <textarea
                  value={msgFisco}
                  onChange={(e) => setMsgFisco(e.target.value)}
                  placeholder="Ex: Documento emitido por ME ou EPP optante pelo Simples Nacional. Não gera direito a crédito fiscal de IPI..."
                  className="coliseu-input"
                  style={{ width: '100%', height: '55px', fontSize: '11px', resize: 'none' }}
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: MULTI-EMPRESA */}
          {/* ========================================================================= */}
          {activeTab === 'MULTI_EMPRESA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '14px', backgroundColor: 'var(--surface-2)', borderRadius: '6px' }}>
                <label className="coliseu-label">Empresa / Filial Vinculada:</label>
                <select
                  value={empresaSelecionada}
                  onChange={(e) => setEmpresaSelecionada(e.target.value)}
                  className="coliseu-input"
                  style={{ height: '36px', width: '100%', fontWeight: 700 }}
                >
                  <option value="<< TODAS >>">&lt;&lt; TODAS AS FILIAIS &gt;&gt;</option>
                  <option value="MATRIZ - DOURADOS/MS">MATRIZ - DOURADOS/MS</option>
                  <option value="LOJA 2 - CAMPO GRANDE/MS">LOJA 2 - CAMPO GRANDE/MS</option>
                  <option value="LOJA 3 - TRÊS LAGOAS/MS">LOJA 3 - TRÊS LAGOAS/MS</option>
                </select>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Define se a natureza de operação estará disponível para emissão em todas as filiais do grupo ou apenas na unidade selecionada.
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 4: MOBILE / FORÇA DE VENDAS */}
          {/* ========================================================================= */}
          {activeTab === 'MOBILE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '14px', backgroundColor: 'var(--surface-2)', borderRadius: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={utilizarMobile}
                    onChange={(e) => setUtilizarMobile(e.target.checked)}
                  />
                  📱 Sincronizar Natureza com Força de Vendas Mobile / Vendedores Externos
                </label>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Quando habilitado, os representantes comerciais poderão selecionar esta operação em seus dispositivos móveis offline.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BARRA DE AÇÕES DO RODAPÉ (CONFORME OS SCREENSHOTS) */}
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: 'var(--surface-2)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            <Button variant="secondary" size="sm" type="button" onClick={handleClonar} leftIcon={<Copy size={13} />} title="Clonar esta Natureza">
              Clonar
            </Button>
            <Button variant="secondary" size="sm" type="button" onClick={handleLimparNovo} leftIcon={<Plus size={13} />} title="Nova Natureza (F3)">
              Novo - F3
            </Button>
            {naturezaEdicao && (
              <Button variant="secondary" size="sm" type="button" onClick={handleEliminar} style={{ color: '#ef4444' }} leftIcon={<Trash2 size={13} />}>
                Eliminar
              </Button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" type="button" onClick={onClose}>
              Fechar - ESC
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleSalvar}
              style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
              leftIcon={<Save size={15} />}
              title="Salvar Natureza (F5)"
            >
              Salvar - F5
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
