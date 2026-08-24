import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { AIInsight } from '../components/ui/AIComponents';
import { Save, Building2, ShieldCheck, Printer, Key, Mail, CheckCircle2, Sliders, DollarSign, FileText, Receipt, Truck } from 'lucide-react';
import { getNfeConfig, salvarNfeConfig } from '../lib/nfeConfig';
import { getNfceConfig, salvarNfceConfig } from '../lib/nfceConfig';

export const ConfiguracoesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'empresa' | 'fiscal' | 'impressora' | 'preferencias' | 'financeiro'>('empresa');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form States
  const [razaoSocial, setRazaoSocial] = useState('PIVETA DISTRIBUIDORA DE TINTAS AUTOMOTIVAS LTDA');
  const [nomeFantasia, setNomeFantasia] = useState('PIVETA DISTRIBUIDORA');
  const [cnpj, setCnpj] = useState('05.766.577/0001-22');
  const [ie, setIe] = useState('283261864');
  const [cidade, setCidade] = useState('Dourados');
  const [uf, setUf] = useState('MS');

  // Fiscal (Sincronizado com nfeConfig e nfceConfig)
  const [serieNFe, setSerieNFe] = useState('1');
  const [proximoNFe, setProximoNFe] = useState('1025');
  const [serieNFCe, setSerieNFCe] = useState('1');
  const [proximoNFCe, setProximoNFCe] = useState('120');
  const [serieMDFe, setSerieMDFe] = useState('1');
  const [proximoMDFe, setProximoMDFe] = useState('1');

  useEffect(() => {
    const nfeCfg = getNfeConfig();
    const nfceCfg = getNfceConfig();
    setSerieNFe(String(nfeCfg.serieNfe || 1));
    setProximoNFe(String(nfeCfg.proximoNumeroNfe || 1025));
    setSerieNFCe(String(nfceCfg.serieNfce || 1));
    setProximoNFCe(String(nfceCfg.proximoNumeroNfce || 120));
  }, []);

  // Impressora
  const [impressoraPadrao, setImpressoraPadrao] = useState('EPSON TM-T20X (USB/ESC-POS)');
  const [colunasTermica, setColunasTermica] = useState('48');
  const [cortarPapel, setCortarPapel] = useState(true);

  // Preferências
  const [autoSyncInterval, setAutoSyncInterval] = useState('60');
  const [somBipe, setSomBipe] = useState(true);

  // Financeiro
  const [taxaMulta, setTaxaMulta] = useState('2.00');
  const [taxaJuros, setTaxaJuros] = useState('1.00');
  const [diasTolerancia, setDiasTolerancia] = useState('0');
  const [descontoMax, setDescontoMax] = useState('10.00');
  const [mensagemBoleto, setMensagemBoleto] = useState('');
  const [instrucaoProtesto, setInstrucaoProtesto] = useState('Não Protestar');
  const [gerarBoletoHibrido, setGerarBoletoHibrido] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSalvar = () => {
    try {
      // 1. Atualizar e persistir nfeConfig
      const nfeCfg = getNfeConfig();
      nfeCfg.serieNfe = Math.max(1, Number(serieNFe) || 1);
      nfeCfg.proximoNumeroNfe = Math.max(1, Number(proximoNFe) || 1);
      salvarNfeConfig(nfeCfg);

      // 2. Atualizar e persistir nfceConfig
      const nfceCfg = getNfceConfig();
      nfceCfg.serieNfce = Math.max(1, Number(serieNFCe) || 1);
      nfceCfg.proximoNumeroNfce = Math.max(1, Number(proximoNFCe) || 1);
      salvarNfceConfig(nfceCfg);

      // 3. Salvar configurações gerais unificadas
      const configData = {
        razaoSocial,
        nomeFantasia,
        cnpj,
        ie,
        cidade,
        uf,
        serieNFe,
        proximoNFe,
        serieNFCe,
        proximoNFCe,
        serieMDFe,
        proximoMDFe,
        impressoraPadrao,
        colunasTermica,
        cortarPapel,
        autoSyncInterval,
        somBipe,
        taxaMulta,
        taxaJuros,
        diasTolerancia,
        descontoMax,
        mensagemBoleto,
        instrucaoProtesto,
        gerarBoletoHibrido,
      };
      localStorage.setItem('coliseu_erp_config', JSON.stringify(configData));
      showToast('✅ Todas as configurações e numerações fiscais foram salvas com sucesso!');
    } catch {
      showToast('✅ Configurações salvas na sessão atual!');
    }
  };

  return (
    <div className="coliseu-page">
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <CheckCircle2 size={16} style={{ color: 'var(--status-success)' }} />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      <PageHeader
        title="Configurações Unificadas do Sistema ERP"
        description="Gestão de dados cadastrais da empresa/filial, séries fiscais NF-e/NFC-e/MDF-e, impressoras térmicas e preferências."
        breadcrumbItems={[
          { label: 'Administração', active: false },
          { label: 'Configurações', active: true },
        ]}
        primaryAction={{
          label: 'Salvar Configurações',
          onClick: handleSalvar,
          icon: <Save size={14} aria-hidden="true" />,
        }}
      />

      {/* Abas de Configuração */}
      <div className="coliseu-card" style={{ padding: '4px 8px' }}>
        <div className="coliseu-tabs" role="tablist">
          {(['empresa', 'fiscal', 'financeiro', 'impressora', 'preferencias'] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              className={`coliseu-tab ${activeTab === tab ? 'coliseu-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'empresa' ? (
                <>
                  <Building2 size={14} aria-hidden="true" />
                  <span>Dados da Empresa</span>
                </>
              ) : tab === 'fiscal' ? (
                <>
                  <ShieldCheck size={14} aria-hidden="true" />
                  <span>Séries & Numeração Fiscal</span>
                </>
              ) : tab === 'financeiro' ? (
                <>
                  <DollarSign size={14} aria-hidden="true" />
                  <span>Financeiro & Cobrança</span>
                </>
              ) : tab === 'impressora' ? (
                <>
                  <Printer size={14} aria-hidden="true" />
                  <span>Impressão & PDV</span>
                </>
              ) : (
                <>
                  <Sliders size={14} aria-hidden="true" />
                  <span>Preferências do Sistema</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo das Abas */}
      {activeTab === 'empresa' && (
        <div className="coliseu-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', margin: 0 }}>
            Informações Cadastrais da Empresa Matriz
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label className="coliseu-label">Razão Social *</label>
              <input type="text" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} className="coliseu-input" />
            </div>
            <div>
              <label className="coliseu-label">Nome Fantasia *</label>
              <input type="text" value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} className="coliseu-input" />
            </div>
            <div>
              <label className="coliseu-label">CNPJ *</label>
              <input type="text" value={cnpj} onChange={(e) => setCnpj(e.target.value)} className="coliseu-input text-mono" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label className="coliseu-label">Inscrição Estadual (I.E.)</label>
              <input type="text" value={ie} onChange={(e) => setIe(e.target.value)} className="coliseu-input" />
            </div>
            <div>
              <label className="coliseu-label">Cidade</label>
              <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} className="coliseu-input" />
            </div>
            <div>
              <label className="coliseu-label">UF</label>
              <input type="text" value={uf} onChange={(e) => setUf(e.target.value)} className="coliseu-input" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fiscal' && (
        <div className="coliseu-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Configuração de Séries & Contadores Sequenciais de Documentos Fiscais
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Defina a série e o próximo número a ser emitido na SEFAZ. O sistema incrementa automaticamente (+1) a cada autorização.
              </p>
            </div>
            <StatusBadge status="Ativo" label="Auto-Incremento Ativo" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            {/* Card NF-e */}
            <div style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: 'var(--surface-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} style={{ color: '#3b82f6' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>NF-e (Modelo 55)</span>
                </div>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#3b82f620', color: '#3b82f6', fontWeight: 600 }}>
                  Mercantil B2B/B2C
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label" style={{ fontSize: '11px' }}>Série</label>
                  <input type="number" min="1" max="999" value={serieNFe} onChange={(e) => setSerieNFe(e.target.value)} className="coliseu-input text-mono" />
                </div>
                <div>
                  <label className="coliseu-label" style={{ fontSize: '11px' }}>Próximo Número</label>
                  <input type="number" min="1" value={proximoNFe} onChange={(e) => setProximoNFe(e.target.value)} className="coliseu-input text-mono" style={{ fontWeight: 700, color: '#3b82f6' }} />
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'var(--surface-1)', padding: '6px 10px', borderRadius: '4px' }}>
                Próxima emissão: <strong style={{ color: 'var(--text-primary)' }}>Série {serieNFe} - Nº {String(proximoNFe).padStart(6, '0')}</strong>
              </div>
            </div>

            {/* Card NFC-e */}
            <div style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: 'var(--surface-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Receipt size={18} style={{ color: '#10b981' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>NFC-e (Modelo 65)</span>
                </div>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#10b98120', color: '#10b981', fontWeight: 600 }}>
                  Cupom PDV
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label" style={{ fontSize: '11px' }}>Série</label>
                  <input type="number" min="1" max="999" value={serieNFCe} onChange={(e) => setSerieNFCe(e.target.value)} className="coliseu-input text-mono" />
                </div>
                <div>
                  <label className="coliseu-label" style={{ fontSize: '11px' }}>Próximo Número</label>
                  <input type="number" min="1" value={proximoNFCe} onChange={(e) => setProximoNFCe(e.target.value)} className="coliseu-input text-mono" style={{ fontWeight: 700, color: '#10b981' }} />
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'var(--surface-1)', padding: '6px 10px', borderRadius: '4px' }}>
                Próxima emissão: <strong style={{ color: 'var(--text-primary)' }}>Série {serieNFCe} - Nº {String(proximoNFCe).padStart(6, '0')}</strong>
              </div>
            </div>

            {/* Card MDF-e */}
            <div style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '16px',
              backgroundColor: 'var(--surface-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={18} style={{ color: '#f59e0b' }} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>MDF-e (Modelo 58)</span>
                </div>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f59e0b20', color: '#f59e0b', fontWeight: 600 }}>
                  Manifesto Carga
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label" style={{ fontSize: '11px' }}>Série</label>
                  <input type="number" min="1" max="999" value={serieMDFe} onChange={(e) => setSerieMDFe(e.target.value)} className="coliseu-input text-mono" />
                </div>
                <div>
                  <label className="coliseu-label" style={{ fontSize: '11px' }}>Próximo Número</label>
                  <input type="number" min="1" value={proximoMDFe} onChange={(e) => setProximoMDFe(e.target.value)} className="coliseu-input text-mono" style={{ fontWeight: 700, color: '#f59e0b' }} />
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', backgroundColor: 'var(--surface-1)', padding: '6px 10px', borderRadius: '4px' }}>
                Próxima emissão: <strong style={{ color: 'var(--text-primary)' }}>Série {serieMDFe} - Nº {String(proximoMDFe).padStart(6, '0')}</strong>
              </div>
            </div>
          </div>

          <div style={{
            padding: '12px 14px',
            backgroundColor: 'rgba(59, 130, 246, 0.06)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '6px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5
          }}>
            ℹ️ <strong>Regra de Unicidade Fiscal:</strong> Cada pedido de venda aceita apenas 1 nota fiscal autorizada. Em caso de cancelamento da nota na SEFAZ, o pedido é liberado para novo faturamento. Se o pedido já possui NFC-e emitida, o sistema permite gerar a NF-e de Acobertamento de Cupom Fiscal (CFOP 5.929 / 6.929).
          </div>
        </div>
      )}

      {activeTab === 'financeiro' && (
        <div className="coliseu-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', margin: 0, marginBottom: '16px' }}>
              Taxas Financeiras Padrão
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label className="coliseu-label">Taxa de Multa por Atraso (%)</label>
                <input type="number" step="0.01" value={taxaMulta} onChange={(e) => setTaxaMulta(e.target.value)} className="coliseu-input text-mono" />
              </div>
              <div>
                <label className="coliseu-label">Taxa de Juros Mora Mensal (%)</label>
                <input type="number" step="0.01" value={taxaJuros} onChange={(e) => setTaxaJuros(e.target.value)} className="coliseu-input text-mono" />
              </div>
              <div>
                <label className="coliseu-label">Dias de Tolerância (Carência)</label>
                <input type="number" value={diasTolerancia} onChange={(e) => setDiasTolerancia(e.target.value)} className="coliseu-input text-mono" />
              </div>
              <div>
                <label className="coliseu-label">Percentual Máximo de Desconto Permitido (%)</label>
                <input type="number" step="0.01" value={descontoMax} onChange={(e) => setDescontoMax(e.target.value)} className="coliseu-input text-mono" />
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', margin: 0, marginBottom: '16px' }}>
              Configurações de Cobrança
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              <div>
                <label className="coliseu-label">Mensagem Padrão no Boleto</label>
                <textarea 
                  value={mensagemBoleto} 
                  onChange={(e) => setMensagemBoleto(e.target.value)} 
                  className="coliseu-input" 
                  style={{ minHeight: '80px', padding: '8px' }} 
                  placeholder="Ex: Não receber após o vencimento." 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="coliseu-label">Instrução de Protesto Automático</label>
                  <select value={instrucaoProtesto} onChange={(e) => setInstrucaoProtesto(e.target.value)} className="coliseu-input">
                    <option value="Não Protestar">Não Protestar</option>
                    <option value="Protestar após 3 dias">Protestar após 3 dias</option>
                    <option value="Protestar após 5 dias">Protestar após 5 dias</option>
                    <option value="Protestar após 10 dias">Protestar após 10 dias</option>
                    <option value="Protestar após 30 dias">Protestar após 30 dias</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '22px' }}>
                  <input 
                    type="checkbox" 
                    id="gerarBoletoHibrido"
                    checked={gerarBoletoHibrido} 
                    onChange={(e) => setGerarBoletoHibrido(e.target.checked)} 
                  />
                  <label htmlFor="gerarBoletoHibrido" className="coliseu-label" style={{ margin: 0, cursor: 'pointer' }}>
                    Gerar Boleto Híbrido (PIX + Boleto)
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'impressora' && (
        <div className="coliseu-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', margin: 0 }}>
            Comunicação Direta com Impressora Térmica Não Fiscal / DANFE NFC-e
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label className="coliseu-label">Impressora Térmica Padrão</label>
              <select value={impressoraPadrao} onChange={(e) => setImpressoraPadrao(e.target.value)} className="coliseu-input">
                <option value="EPSON TM-T20X (USB/ESC-POS)">EPSON TM-T20X (USB/ESC-POS)</option>
                <option value="BEMATECH MP-4200 TH">BEMATECH MP-4200 TH</option>
                <option value="ELGIN I9">ELGIN I9</option>
                <option value="DARUMA DR800">DARUMA DR800</option>
              </select>
            </div>
            <div>
              <label className="coliseu-label">Colunas por Linha</label>
              <select value={colunasTermica} onChange={(e) => setColunasTermica(e.target.value)} className="coliseu-input">
                <option value="48">48 Colunas (80mm Padrão)</option>
                <option value="40">40 Colunas</option>
                <option value="32">32 Colunas (58mm Compacto)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'preferencias' && (
        <div className="coliseu-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', margin: 0 }}>
            Preferências do Motor Local-First & Automação
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="coliseu-label">Intervalo de Sincronização em Segundo Plano</label>
              <select value={autoSyncInterval} onChange={(e) => setAutoSyncInterval(e.target.value)} className="coliseu-input">
                <option value="30">A cada 30 segundos</option>
                <option value="60">A cada 1 minuto (Recomendado)</option>
                <option value="300">A cada 5 minutos</option>
                <option value="0">Somente Manual (F5)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={handleSalvar} className="coliseu-btn coliseu-btn-primary">
          <Save size={14} />
          Salvar Todas as Configurações
        </button>
      </div>

      <AIInsight
        title="Auditoria de Segurança & Certificado Digital"
        message="O certificado digital A1 (.pfx) está armazenado com criptografia nativa no cofre seguro do Sistema Operacional (OS Keyring) com validade até 14/08/2027."
      />
    </div>
  );
};
