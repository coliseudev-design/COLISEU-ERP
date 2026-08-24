import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  ShieldCheck,
  Percent,
  Calculator,
  RefreshCw,
  X,
  Check,
} from 'lucide-react';
import { tributacaoService, RegraTributaria, ResultadoTributarioItem } from '../lib/tributacao';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { parseNumber } from '../lib/formatters';

export const TaxRulesPage: React.FC = () => {
  const [regras, setRegras] = useState<RegraTributaria[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [ncm, setNcm] = useState('22021000');
  const [ufOrigem, setUfOrigem] = useState('SP');
  const [ufDestino, setUfDestino] = useState('SP');
  const [crt, setCrt] = useState<number>(1);
  const [cfopEstado, setCfopEstado] = useState('5102');
  const [cfopInterestado, setCfopInterestado] = useState('6102');
  const [csosn, setCsosn] = useState('102');
  const [cstIcms, setCstIcms] = useState('00');
  const [aliquotaIcms, setAliquotaIcms] = useState<number>(0);
  const [aliquotaPis, setAliquotaPis] = useState<number>(0);
  const [aliquotaCofins, setAliquotaCofins] = useState<number>(0);
  const [ibptNacional, setIbptNacional] = useState<number>(4.20);
  const [ibptEstadual, setIbptEstadual] = useState<number>(12.00);

  // Simulador State
  const [simValor, setSimValor] = useState<number>(100.0);
  const [simResultado, setSimResultado] = useState<ResultadoTributarioItem | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadRegras = async () => {
    setLoading(true);
    try {
      const data = await tributacaoService.listarRegrasTributarias('emp_default');
      setRegras(data);
    } catch (err: any) {
      showToast(`⚠️ Usando regras padrão locais.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegras();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleSalvarRegra = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tributacaoService.salvarRegraTributaria({
        id: '',
        empresa_id: 'emp_default',
        ncm,
        uf_origem: ufOrigem,
        uf_destino: ufDestino,
        crt,
        cfop_estado: cfopEstado,
        cfop_interestado: cfopInterestado,
        csosn,
        cst_icms: cstIcms,
        aliquota_icms: aliquotaIcms,
        aliquota_red_bc_icms: 0,
        cst_pis: '07',
        aliquota_pis: aliquotaPis,
        cst_cofins: '07',
        aliquota_cofins: aliquotaCofins,
        aliquota_ibpt_nacional: ibptNacional,
        aliquota_ibpt_estadual: ibptEstadual,
      });
      showToast(`✅ Regra tributária para NCM ${ncm} cadastrada!`);
      setIsModalOpen(false);
      loadRegras();
    } catch (err: any) {
      showToast(`❌ Erro ao salvar regra: ${err?.message || 'Falha IPC'}`);
    }
  };

  const handleSimularCalculo = async () => {
    try {
      const res = await tributacaoService.calcularTributacaoItem({
        ncm,
        valor_bruto_item: simValor,
        valor_desconto_item: 0.0,
        quantidade: 1.0,
        uf_origem: ufOrigem,
        uf_destino: ufDestino,
        crt_empresa: crt,
      });
      setSimResultado(res);
      showToast(`⚡ Cálculo executado via Rust com sucesso!`);
    } catch (err: any) {
      showToast(`❌ Erro na simulação: ${err?.message || 'Falha'}`);
    }
  };

  const filteredRegras = regras.filter((r) =>
    r.ncm.toLowerCase().includes(search.toLowerCase()) ||
    r.cfop_estado.includes(search)
  );

  return (
    <div className="coliseu-page">
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <ShieldCheck style={{ width: '1.25rem', height: '1.25rem', color: 'var(--status-success)' }} aria-hidden="true" />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header com Ações */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <PageHeader
          title="Matriz & Regras Tributárias SEFAZ"
          subtitle="Configuração de tributação por NCM, UF, CRT (Simples Nacional vs Normal) e Carga IBPT"
          icon={<Percent style={{ color: '#10b981', width: '1.5rem', height: '1.5rem' }} />}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={loadRegras} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw style={{ width: '1rem', height: '1rem' }} />
            Atualizar
          </Button>
          <Button variant="success" onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus style={{ width: '1rem', height: '1rem' }} />
            Nova Regra Tributária
          </Button>
        </div>
      </div>

      {/* Grid Principal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem' }}>
        {/* Tabela de Regras */}
        <div className="coliseu-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Regras Cadastradas</h2>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search style={{ width: '1rem', height: '1rem', color: 'var(--text-muted)', position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} aria-hidden="true" />
              <Input
                type="text"
                placeholder="Filtrar por NCM ou CFOP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.25rem', width: '100%', fontSize: '0.75rem' }}
              />
            </div>
          </div>

          <div className="coliseu-table-container">
            <table className="coliseu-table">
              <thead>
                <tr>
                  <th style={{ padding: '0.75rem' }}>NCM</th>
                  <th style={{ padding: '0.75rem' }}>UF Orig/Dest</th>
                  <th style={{ padding: '0.75rem' }}>CRT</th>
                  <th style={{ padding: '0.75rem' }}>CFOP Interno</th>
                  <th style={{ padding: '0.75rem' }}>CSOSN / CST</th>
                  <th style={{ padding: '0.75rem' }}>ICMS %</th>
                  <th style={{ padding: '0.75rem' }}>IBPT %</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegras.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontFamily: 'Inter, system-ui, sans-serif' }}>
                      Nenhuma regra cadastrada. Utilizando alíquotas padrão de Simples Nacional.
                    </td>
                  </tr>
                ) : (
                  filteredRegras.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #1c2540' }}>
                      <td style={{ padding: '0.75rem', color: '#10b981', fontWeight: 700 }}>{r.ncm}</td>
                      <td style={{ padding: '0.75rem' }}>{r.uf_origem} ➔ {r.uf_destino}</td>
                      <td style={{ padding: '0.75rem' }}>{r.crt === 1 ? '1 - Simples' : '3 - Normal'}</td>
                      <td style={{ padding: '0.75rem' }}>{r.cfop_estado}</td>
                      <td style={{ padding: '0.75rem' }}>{r.crt === 1 ? r.csosn : r.cst_icms}</td>
                      <td style={{ padding: '0.75rem' }}>{r.aliquota_icms}%</td>
                      <td style={{ padding: '0.75rem', color: '#f59e0b' }}>
                        {(r.aliquota_ibpt_nacional + r.aliquota_ibpt_estadual).toFixed(2)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Simulador */}
        <div className="coliseu-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calculator style={{ width: '1.25rem', height: '1.25rem', color: 'var(--action-primary)' }} aria-hidden="true" />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Simulador SEFAZ</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Valor do Item (R$)</label>
              <Input
                type="text"
                value={simValor}
                onChange={(e) => setSimValor(parseNumber(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>NCM</label>
                <Input
                  type="text"
                  value={ncm}
                  onChange={(e) => setNcm(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>CRT Empresa</label>
                <select
                  value={crt}
                  onChange={(e) => setCrt(parseInt(e.target.value))}
                  style={{ width: '100%', backgroundColor: '#0b1120', border: '1px solid #1c2540', borderRadius: '0.5rem', padding: '0.5rem', fontSize: '0.75rem', color: '#ffffff' }}
                >
                  <option value={1}>1 - Simples Nacional</option>
                  <option value={3}>3 - Regime Normal</option>
                </select>
              </div>
            </div>

            <Button onClick={handleSimularCalculo} style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Calculator style={{ width: '1rem', height: '1rem' }} />
              Executar Cálculo Tributário
            </Button>

            {simResultado && (
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#0b1120', border: '1px solid #1c2540', borderRadius: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1c2540', paddingBottom: '0.375rem' }}>
                  <span style={{ color: '#94a3b8' }}>CFOP Aplicado:</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>{simResultado.cfop}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>CSOSN/CST ICMS:</span>
                  <span>{simResultado.csosn_ou_cst_icms}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Base de Cálculo:</span>
                  <span>R$ {simResultado.base_calculo_icms.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Valor ICMS ({simResultado.aliquota_icms}%):</span>
                  <span style={{ color: '#38bdf8' }}>R$ {simResultado.valor_icms.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1c2540', paddingTop: '0.375rem' }}>
                  <span style={{ color: '#94a3b8' }}>Carga IBPT (Lei 12.741):</span>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>R$ {simResultado.valor_total_tributos_ibpt.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Cadastro de Regra */}
      {isModalOpen && (
        <div className="coliseu-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="coliseu-modal coliseu-modal--md" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-default)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Percent style={{ width: '1.25rem', height: '1.25rem', color: 'var(--action-primary)' }} aria-hidden="true" />
                Cadastrar Regra Tributária
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.25rem', cursor: 'pointer' }}>
                <X style={{ width: '1.25rem', height: '1.25rem' }} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSalvarRegra} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>NCM Fiscal</label>
                  <Input
                    type="text"
                    required
                    value={ncm}
                    onChange={(e) => setNcm(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Regime (CRT)</label>
                  <select
                    value={crt}
                    onChange={(e) => setCrt(parseInt(e.target.value))}
                    style={{ width: '100%', backgroundColor: '#0b1120', border: '1px solid #1c2540', borderRadius: '0.5rem', padding: '0.5rem', fontSize: '0.75rem', color: '#ffffff' }}
                  >
                    <option value={1}>1 - Simples Nacional</option>
                    <option value={3}>3 - Regime Normal</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>CFOP Dentro Estado</label>
                  <Input
                    type="text"
                    value={cfopEstado}
                    onChange={(e) => setCfopEstado(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>CFOP Fora Estado</label>
                  <Input
                    type="text"
                    value={cfopInterestado}
                    onChange={(e) => setCfopInterestado(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>CSOSN (Simples)</label>
                  <Input
                    type="text"
                    value={csosn}
                    onChange={(e) => setCsosn(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>Alíquota ICMS %</label>
                  <Input
                    type="text"
                    value={aliquotaIcms}
                    onChange={(e) => setAliquotaIcms(parseNumber(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #1c2540' }}>
                <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="success" type="submit" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Check style={{ width: '1rem', height: '1rem' }} />
                  Salvar Regra
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
