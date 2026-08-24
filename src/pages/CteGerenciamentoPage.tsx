import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import {
  Save,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Settings,
  FolderOpen,
  Key,
  Server,
  Printer,
  FileEdit,
  Hash,
  Search,
} from 'lucide-react';
import { CteConfiguracaoCompleta, getCteConfig, salvarCteConfig } from '../lib/cteConfig';
import { escolherPasta, escolherArquivoImagem, escolherArquivoCertificado } from '../lib/fileDialogHelper';
import { safeInvoke as invoke } from "../lib/ipc";

export const CteGerenciamentoPage: React.FC = () => {
  const [config, setConfig] = useState<CteConfiguracaoCompleta>(getCteConfig);
  const [activeTab, setActiveTab] = useState<'PARAMETROS' | 'PASTAS_TECNOSPEED' | 'ACOES_SEFAZ' | 'RESPONSAVEL_TECNICO' | 'LOGS'>('PARAMETROS');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [retornoLog, setRetornoLog] = useState<string>(
    `[${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}] - Central de Gerenciamento do CT-e 4.00 & Motor TecnoSpeed pronta para operação.`
  );

  // Estados para Ações SEFAZ
  const [chaveConsulta, setChaveConsulta] = useState('');
  const [inutSerie, setInutSerie] = useState(1);
  const [inutNumIni, setInutNumIni] = useState(1);
  const [inutNumFim, setInutNumFim] = useState(1);
  const [inutJustificativa, setInutJustificativa] = useState('Inutilização de numeração por salto de sequência fiscal.');
  const [certificadosDisponiveis, setCertificadosDisponiveis] = useState<string[]>([
    'PIVETA DIST. DE TINTAS AUTOMOTIVA LTDA (A1 - VALIDADE: 12/2026)',
    'COLISEU MATERIAIS & DISTRIBUIÇÃO LTDA (A1 - VALIDADE: 01/2027)',
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    async function carregarCertsWindows() {
      try {
        const certs = await invoke<string[]>('tecnospeed_listar_certificados_cmd', {
          shCnpj: config.cnpjSoftwareHouse,
          shToken: config.tokenSoftwareHouse,
        });
        if (certs && certs.length > 0) {
          setCertificadosDisponiveis(certs);
        }
      } catch {
        // Fallback já definido
      }
    }
    carregarCertsWindows();
  }, []);

  const handleSalvar = () => {
    salvarCteConfig(config);
    showToast('Configurações do CT-e salvas com sucesso!');
  };

  const handleStatusSefaz = async () => {
    setRetornoLog((prev) => `[${new Date().toLocaleTimeString()}] Consultando Status do Web Service CT-e SEFAZ/SVRS...\n` + prev);
    try {
      const resp = await invoke<string>('tecnospeed_status_sefaz_cte_cmd', {
        uf: config.ufWebService,
        ambiente: config.ambienteDestino === 'PRODUÇÃO' ? 1 : 2,
        cnpj: config.cnpjEmitente,
        shCnpj: config.cnpjSoftwareHouse,
        shToken: config.tokenSoftwareHouse,
        certNome: config.certificadoDigital || null,
        certPfx: config.caminhoCertificadoPfx || null,
        certPwd: config.senhaCertificado || null,
        diretorioBase: config.diretorioBaseTecnospeed,
      });

      setRetornoLog((prev) => `[${new Date().toLocaleTimeString()}] ✅ Retorno SEFAZ:\n${resp}\n\n` + prev);
      showToast('SEFAZ CT-e: ' + (resp.includes('107') ? 'Serviço em Operação (cStat 107)' : resp.slice(0, 40)));
    } catch (err: any) {
      setRetornoLog((prev) => `[${new Date().toLocaleTimeString()}] ❌ Erro ao consultar SEFAZ: ${err}\n` + prev);
      showToast(`Erro na SEFAZ: ${err}`);
    }
  };

  const handleConsultarChave = async () => {
    if (!chaveConsulta.trim() || chaveConsulta.length < 44) {
      alert('Informe uma chave de acesso válida com 44 dígitos.');
      return;
    }
    try {
      const resp = await invoke<string>('tecnospeed_consultar_cte_cmd', {
        chave: chaveConsulta,
        uf: config.ufWebService,
        ambiente: config.ambienteDestino === 'PRODUÇÃO' ? 1 : 2,
      });
      setRetornoLog((prev) => `[${new Date().toLocaleTimeString()}] 🔍 Consulta CT-e (${chaveConsulta}):\n${resp}\n\n` + prev);
      showToast('Consulta de CT-e realizada!');
    } catch (err: any) {
      alert(`Erro ao consultar: ${err}`);
    }
  };

  const handleInutilizar = async () => {
    if (inutJustificativa.length < 15) {
      alert('A justificativa de inutilização deve ter pelo menos 15 caracteres.');
      return;
    }
    try {
      const ano = new Date().getFullYear();
      const resp = await invoke<string>('tecnospeed_inutilizar_cte_cmd', {
        ano,
        serie: inutSerie,
        numIni: inutNumIni,
        numFim: inutNumFim,
        justificativa: inutJustificativa,
        uf: config.ufWebService,
        ambiente: config.ambienteDestino === 'PRODUÇÃO' ? 1 : 2,
      });
      setRetornoLog((prev) => `[${new Date().toLocaleTimeString()}] ⛔ Inutilização CT-e:\n${resp}\n\n` + prev);
      showToast('Numeração de CT-e inutilizada com sucesso!');
    } catch (err: any) {
      alert(`Erro na inutilização: ${err}`);
    }
  };

  const handleEditarLayoutDacte = async () => {
    try {
      await invoke('tecnospeed_editar_modelo_dacte_cmd');
      showToast('Comando de abertura do editor de layout DACTE executado!');
    } catch (err: any) {
      alert(`Erro ao abrir editor: ${err}`);
    }
  };

  return (
    <div className="coliseu-page" style={{ minHeight: '100vh' }}>
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <CheckCircle2 size={18} color="#10b981" />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{toastMessage}</span>
          </div>
        </div>
      )}

      <PageHeader
        title="Gerenciamento & Configurações do CT-e 4.00 (TecnoSpeed)"
        description="Parâmetros fiscais, certificado A1, apontamento de pastas do componente spdCTeX e testes SEFAZ."
        breadcrumbItems={[
          { label: 'Transporte', active: false },
          { label: 'Gerenciamento CT-e', active: true },
        ]}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={handleStatusSefaz} leftIcon={<Server size={14} color="#3b82f6" />}>
            Status SEFAZ (F9)
          </Button>
          <Button variant="primary" onClick={handleSalvar} leftIcon={<Save size={14} />} style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>
            Salvar Parâmetros (F10)
          </Button>
        </div>
      </PageHeader>

      <div className="coliseu-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Abas */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-2)', padding: '0 12px' }}>
          {[
            { id: 'PARAMETROS', label: '1. Parâmetros Fiscais & Certificado' },
            { id: 'PASTAS_TECNOSPEED', label: '2. Apontamento de Diretórios (TecnoSpeed)' },
            { id: 'ACOES_SEFAZ', label: '3. Ações, Consultas & Layout DACTE' },
            { id: 'RESPONSAVEL_TECNICO', label: '4. Responsável Técnico (CSRT)' },
            { id: 'LOGS', label: '5. Log de Comunicação SEFAZ' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '12px 18px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab.id ? '#3b82f6' : 'var(--text-muted)',
                fontWeight: activeTab === tab.id ? 800 : 500,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px' }}>
          {/* ABA 1: PARÂMETROS FISCAIS & CERTIFICADO */}
          {activeTab === 'PARAMETROS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2.5fr 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">CNPJ do Emitente:</label>
                  <input type="text" className="coliseu-input" value={config.cnpjEmitente} onChange={(e) => setConfig({ ...config, cnpjEmitente: e.target.value })} style={{ height: '34px', fontWeight: 700 }} />
                </div>
                <div>
                  <label className="coliseu-label">Razão Social:</label>
                  <input type="text" className="coliseu-input" value={config.nomeEmitente} onChange={(e) => setConfig({ ...config, nomeEmitente: e.target.value.toUpperCase() })} style={{ height: '34px', fontWeight: 700 }} />
                </div>
                <div>
                  <label className="coliseu-label">Inscrição Estadual:</label>
                  <input type="text" className="coliseu-input" value={config.inscricaoEstadual} onChange={(e) => setConfig({ ...config, inscricaoEstadual: e.target.value })} style={{ height: '34px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '120px 140px 1.2fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Série CT-e:</label>
                  <input type="number" className="coliseu-input" value={config.serieCte} onChange={(e) => setConfig({ ...config, serieCte: parseInt(e.target.value) || 1 })} style={{ height: '34px', textAlign: 'center', fontWeight: 700 }} />
                </div>
                <div>
                  <label className="coliseu-label">Próximo Número:</label>
                  <input type="number" className="coliseu-input" value={config.proximoNumeroCte} onChange={(e) => setConfig({ ...config, proximoNumeroCte: parseInt(e.target.value) || 1 })} style={{ height: '34px', textAlign: 'center', fontWeight: 800 }} />
                </div>
                <div>
                  <label className="coliseu-label">UF do Web Service:</label>
                  <input type="text" className="coliseu-input" value={config.ufWebService} onChange={(e) => setConfig({ ...config, ufWebService: e.target.value.toUpperCase() })} style={{ height: '34px' }} />
                </div>
                <div>
                  <label className="coliseu-label">Ambiente SEFAZ:</label>
                  <select className="coliseu-input" value={config.ambienteDestino} onChange={(e) => setConfig({ ...config, ambienteDestino: e.target.value as any })} style={{ height: '34px', fontWeight: 800, color: config.ambienteDestino === 'PRODUÇÃO' ? '#10b981' : '#eab308' }}>
                    <option value="HOMOLOGAÇÃO">HOMOLOGAÇÃO (TESTE)</option>
                    <option value="PRODUÇÃO">PRODUÇÃO</option>
                  </select>
                </div>
                <div>
                  <label className="coliseu-label">Motor Fiscal:</label>
                  <select className="coliseu-input" value={config.motorFiscalPreferido} onChange={(e) => setConfig({ ...config, motorFiscalPreferido: e.target.value as any })} style={{ height: '34px', fontWeight: 700 }}>
                    <option value="TECNOSPEED">TECNOSPEED (spdCTeX / TX2)</option>
                    <option value="NUVEM_FISCAL">NUVEM FISCAL (API)</option>
                    <option value="ACBR">ACBR (SOCKET)</option>
                    <option value="SEFAZ_DIRETA">SEFAZ DIRETA (SOAP)</option>
                  </select>
                </div>
              </div>

              {/* Certificado Digital */}
              <div style={{ padding: '14px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={16} color="#f59e0b" /> Certificado Digital A1:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 140px', gap: '10px' }}>
                  <div>
                    <label className="coliseu-label">Certificado Instalado no Windows (CryptoAPI):</label>
                    <select
                      className="coliseu-input"
                      value={config.certificadoDigital || ''}
                      onChange={(e) => setConfig({ ...config, certificadoDigital: e.target.value })}
                      style={{ height: '34px', fontWeight: 700 }}
                    >
                      <option value="">-- Selecionar Certificado do Windows --</option>
                      {certificadosDisponiveis.map((c, i) => (
                        <option key={i} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="coliseu-label">Ou Arquivo .PFX / .P12 em Disco:</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input type="text" className="coliseu-input" value={config.caminhoCertificadoPfx || ''} onChange={(e) => setConfig({ ...config, caminhoCertificadoPfx: e.target.value })} placeholder="C:\Certificados\empresa.pfx" style={{ height: '34px', flex: 1 }} />
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          const f = await escolherArquivoCertificado();
                          if (f) setConfig({ ...config, caminhoCertificadoPfx: f });
                        }}
                        style={{ height: '34px' }}
                      >
                        ...
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="coliseu-label">Senha do PFX:</label>
                    <input type="password" className="coliseu-input" value={config.senhaCertificado || ''} onChange={(e) => setConfig({ ...config, senhaCertificado: e.target.value })} style={{ height: '34px' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: PASTAS TECNOSPEED */}
          {activeTab === 'PASTAS_TECNOSPEED' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="coliseu-label">Diretório Base Operacional do CT-e (C:\ERPFULL\CTE):</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="text" className="coliseu-input" value={config.diretorioBaseTecnospeed} onChange={(e) => setConfig({ ...config, diretorioBaseTecnospeed: e.target.value })} style={{ height: '34px', flex: 1, fontWeight: 700 }} />
                  <Button variant="secondary" onClick={async () => { const p = await escolherPasta(config.diretorioBaseTecnospeed); if (p) setConfig({ ...config, diretorioBaseTecnospeed: p }); }} style={{ height: '34px' }}>...</Button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Pasta de Entrada TX2 (Envio):</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="text" className="coliseu-input" value={config.diretorioEntradaTx2} onChange={(e) => setConfig({ ...config, diretorioEntradaTx2: e.target.value })} style={{ height: '32px', flex: 1 }} />
                    <Button variant="secondary" onClick={async () => { const p = await escolherPasta(config.diretorioEntradaTx2); if (p) setConfig({ ...config, diretorioEntradaTx2: p }); }} style={{ height: '32px' }}>...</Button>
                  </div>
                </div>

                <div>
                  <label className="coliseu-label">Pasta de Saída TX2 (Retorno SEFAZ):</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="text" className="coliseu-input" value={config.diretorioSaidaTx2} onChange={(e) => setConfig({ ...config, diretorioSaidaTx2: e.target.value })} style={{ height: '32px', flex: 1 }} />
                    <Button variant="secondary" onClick={async () => { const p = await escolherPasta(config.diretorioSaidaTx2); if (p) setConfig({ ...config, diretorioSaidaTx2: p }); }} style={{ height: '32px' }}>...</Button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Pasta de Esquemas XSD:</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="text" className="coliseu-input" value={config.diretorioEsquemas} onChange={(e) => setConfig({ ...config, diretorioEsquemas: e.target.value })} style={{ height: '32px', flex: 1 }} />
                    <Button variant="secondary" onClick={async () => { const p = await escolherPasta(config.diretorioEsquemas); if (p) setConfig({ ...config, diretorioEsquemas: p }); }} style={{ height: '32px' }}>...</Button>
                  </div>
                </div>

                <div>
                  <label className="coliseu-label">Pasta de Templates de Impressão:</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="text" className="coliseu-input" value={config.diretorioTemplates} onChange={(e) => setConfig({ ...config, diretorioTemplates: e.target.value })} style={{ height: '32px', flex: 1 }} />
                    <Button variant="secondary" onClick={async () => { const p = await escolherPasta(config.diretorioTemplates); if (p) setConfig({ ...config, diretorioTemplates: p }); }} style={{ height: '32px' }}>...</Button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Pasta de Armazenamento de PDFs (DACTE):</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="text" className="coliseu-input" value={config.diretorioPdf} onChange={(e) => setConfig({ ...config, diretorioPdf: e.target.value })} style={{ height: '32px', flex: 1 }} />
                    <Button variant="secondary" onClick={async () => { const p = await escolherPasta(config.diretorioPdf); if (p) setConfig({ ...config, diretorioPdf: p }); }} style={{ height: '32px' }}>...</Button>
                  </div>
                </div>

                <div>
                  <label className="coliseu-label">Logotipo para DACTE (.png / .jpg):</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="text" className="coliseu-input" value={config.caminhoLogotipoDacte || ''} onChange={(e) => setConfig({ ...config, caminhoLogotipoDacte: e.target.value })} style={{ height: '32px', flex: 1 }} />
                    <Button variant="secondary" onClick={async () => { const p = await escolherArquivoImagem(); if (p) setConfig({ ...config, caminhoLogotipoDacte: p }); }} style={{ height: '32px' }}>...</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: AÇÕES SEFAZ & TESTES */}
          {activeTab === 'ACOES_SEFAZ' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '14px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>1. Consulta de Situação por Chave de Acesso:</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={chaveConsulta}
                    onChange={(e) => setChaveConsulta(e.target.value)}
                    placeholder="Chave do CT-e com 44 dígitos (ex: 502608...)"
                    style={{ height: '34px', flex: 1, fontFamily: 'monospace' }}
                  />
                  <Button variant="primary" onClick={handleConsultarChave} leftIcon={<Search size={14} />}>
                    Consultar SEFAZ
                  </Button>
                </div>
              </div>

              <div style={{ padding: '14px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>2. Inutilização de Faixa de Numeração de CT-e:</span>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 100px 100px 1.5fr 130px', gap: '8px', marginTop: '8px', alignItems: 'flex-end' }}>
                  <div>
                    <label className="coliseu-label">Série:</label>
                    <input type="number" className="coliseu-input" value={inutSerie} onChange={(e) => setInutSerie(parseInt(e.target.value) || 1)} style={{ height: '34px', textAlign: 'center' }} />
                  </div>
                  <div>
                    <label className="coliseu-label">Nº Inicial:</label>
                    <input type="number" className="coliseu-input" value={inutNumIni} onChange={(e) => setInutNumIni(parseInt(e.target.value) || 1)} style={{ height: '34px', textAlign: 'center' }} />
                  </div>
                  <div>
                    <label className="coliseu-label">Nº Final:</label>
                    <input type="number" className="coliseu-input" value={inutNumFim} onChange={(e) => setInutNumFim(parseInt(e.target.value) || 1)} style={{ height: '34px', textAlign: 'center' }} />
                  </div>
                  <div>
                    <label className="coliseu-label">Justificativa (mínimo 15 caracteres):</label>
                    <input type="text" className="coliseu-input" value={inutJustificativa} onChange={(e) => setInutJustificativa(e.target.value)} style={{ height: '34px' }} />
                  </div>
                  <Button variant="secondary" onClick={handleInutilizar} leftIcon={<Hash size={14} />} style={{ height: '34px', color: '#ef4444' }}>
                    Inutilizar
                  </Button>
                </div>
              </div>

              <div style={{ padding: '14px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>3. Editor Visual de Layout do DACTE:</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Abre o editor de modelos de impressão da TecnoSpeed para personalização do DACTE.</div>
                </div>
                <Button variant="secondary" onClick={handleEditarLayoutDacte} leftIcon={<FileEdit size={14} color="#3b82f6" />}>
                  Abrir Editor DACTE
                </Button>
              </div>
            </div>
          )}

          {/* ABA 4: RESPONSÁVEL TÉCNICO */}
          {activeTab === 'RESPONSAVEL_TECNICO' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">CNPJ Softwarehouse:</label>
                  <input type="text" className="coliseu-input" value={config.cnpjRespTecnico} onChange={(e) => setConfig({ ...config, cnpjRespTecnico: e.target.value })} style={{ height: '34px', fontWeight: 700 }} />
                </div>
                <div>
                  <label className="coliseu-label">Contato Responsável:</label>
                  <input type="text" className="coliseu-input" value={config.contatoRespTecnico} onChange={(e) => setConfig({ ...config, contatoRespTecnico: e.target.value.toUpperCase() })} style={{ height: '34px' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">ID CSRT:</label>
                  <input type="text" className="coliseu-input" value={config.idCsrt} onChange={(e) => setConfig({ ...config, idCsrt: e.target.value })} style={{ height: '34px', textAlign: 'center', fontWeight: 700 }} />
                </div>
                <div>
                  <label className="coliseu-label">Hash CSRT:</label>
                  <input type="text" className="coliseu-input" value={config.hashCsrt} onChange={(e) => setConfig({ ...config, hashCsrt: e.target.value })} style={{ height: '34px', fontFamily: 'monospace' }} />
                </div>
              </div>
            </div>
          )}

          {/* ABA 5: LOGS */}
          {activeTab === 'LOGS' && (
            <textarea
              readOnly
              value={retornoLog}
              className="coliseu-input"
              style={{ width: '100%', height: '220px', fontFamily: 'monospace', fontSize: '11px', backgroundColor: 'var(--surface-2)', lineHeight: '1.5' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
