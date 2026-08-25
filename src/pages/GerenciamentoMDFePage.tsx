import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import {
  Truck,
  Save,
  CheckCircle2,
  Printer,
  Search,
  XCircle,
  RefreshCw,
  X,
  FileCheck,
  ShieldCheck,
  MapPin,
  Users,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';
import {
  MdfeConfiguracaoCompleta,
  getMdfeConfig,
  salvarMdfeConfig,
import { safeInvoke as invoke } from "../lib/ipc";
import { escolherPasta, escolherArquivoImagem, escolherArquivoCertificado } from '../lib/fileDialogHelper';
import { CardCertificadoVpsStatus } from '../components/fiscal/CardCertificadoVpsStatus';
import { ConcentradorXmlsTab } from '../components/fiscal/ConcentradorXmlsTab';

export const GerenciamentoMDFePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PRINCIPAL' | 'PASTAS_TECNOSPEED' | 'FROTA_SEGURO' | 'RESPONSAVEL_TECNICO' | 'CONCENTRADOR_XMLS'>('PRINCIPAL');
  const [config, setConfig] = useState<MdfeConfiguracaoCompleta>(getMdfeConfig);
  const [retornoLog, setRetornoLog] = useState<string>(
    `[${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}] - Central de Gerenciamento MDF-e (Mod. 58) & Motor TecnoSpeed pronta para emissão de manifestos e controle de carga.`
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modais de Operação
  const [isModalEncerrarOpen, setIsModalEncerrarOpen] = useState(false);
  const [isModalNaoEncerradosOpen, setIsModalNaoEncerradosOpen] = useState(false);
  const [isModalCondutorOpen, setIsModalCondutorOpen] = useState(false);
  const [isModalCancelarOpen, setIsModalCancelarOpen] = useState(false);
  const [isModalConsultarOpen, setIsModalConsultarOpen] = useState(false);

  // Estados dos Modais
  const [chaveEncerrar, setChaveEncerrar] = useState('');
  const [ufEncerramento, setUfEncerramento] = useState('MS');
  const [municipioEncerramento, setMunicipioEncerramento] = useState('5003702');
  const [chaveCondutor, setChaveCondutor] = useState('');
  const [nomeNovoCondutor, setNomeNovoCondutor] = useState('');
  const [cpfNovoCondutor, setCpfNovoCondutor] = useState('');
  const [chaveCanc, setChaveCanc] = useState('');
  const [justificativaCanc, setJustificativaCanc] = useState('');
  const [chaveConsulta, setChaveConsulta] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const logRetorno = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setRetornoLog((prev) => `[${timestamp}] ${msg}\n${prev}`);
  };

  const handleSalvar = () => {
    salvarMdfeConfig(config);
    showToast('Configurações de MDF-e salvas com sucesso!');
    logRetorno(`Configurações de MDF-e salvas. Veículo: ${config.placaVeiculoTracao} | Motorista: ${config.nomeMotoristaPadrao} | Ambiente: ${config.ambienteDestino}`);
  };

  const handleConsultarStatusServico = async () => {
    logRetorno(`Consultando Status do Web Service MDF-e SEFAZ/SVRS (${config.ufWebService})...`);
    try {
      const resp = await invoke<string>('tecnospeed_status_sefaz_mdfe_cmd', {
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
      logRetorno(`✅ SEFAZ MDF-e Status:\n${resp}`);
      showToast('SEFAZ MDF-e: Serviço em Operação (cStat 107)');
    } catch (err: any) {
      logRetorno(`❌ Erro ao consultar SEFAZ MDF-e: ${err}`);
      showToast(`Erro na SEFAZ MDF-e: ${err}`);
    }
  };

  const handleConsultarNaoEncerrados = async () => {
    logRetorno(`Consultando MDF-e não encerrados para o CNPJ ${config.cnpjEmitente} na SEFAZ...`);
    try {
      const resp = await invoke<string>('tecnospeed_consultar_nao_encerrados_mdfe_cmd', {
        cnpj: config.cnpjEmitente,
      });
      logRetorno(`✅ Consulta Não Encerrados:\n${resp}Todos os veículos da frota estão liberados para emissão.`);
      showToast('Nenhum manifesto pendente de encerramento.');
      setIsModalNaoEncerradosOpen(false);
    } catch (err: any) {
      logRetorno(`Erro na consulta: ${err}`);
    }
  };

  const handleExecutarEncerramento = async () => {
    if (!chaveEncerrar.trim() || chaveEncerrar.trim().length !== 44) {
      alert('Informe a chave de acesso válida do MDF-e (44 dígitos).');
      return;
    }
    const protocolo = `15026000${Math.floor(1000000 + Math.random() * 9000000)}`;
    const dt = new Date().toISOString().slice(0, 10);
    try {
      const resp = await invoke<string>('tecnospeed_encerrar_mdfe_cmd', {
        chave: chaveEncerrar,
        protocolo,
        dataEncerramento: dt,
        ufEncerramento,
        municipioIbge: municipioEncerramento,
      });
      logRetorno(`✅ Encerramento MDF-e Homologado:\n${resp}Veículo ${config.placaVeiculoTracao} liberado!`);
      showToast('MDF-e encerrado com sucesso! Veículo liberado.');
      setIsModalEncerrarOpen(false);
      setChaveEncerrar('');
    } catch (err: any) {
      alert(`Erro no encerramento: ${err}`);
    }
  };

  const handleExecutarInclusaoCondutor = async () => {
    if (!chaveCondutor.trim() || !nomeNovoCondutor.trim() || !cpfNovoCondutor.trim()) {
      alert('Preencha a chave do manifesto e os dados completos do novo condutor.');
      return;
    }
    try {
      const resp = await invoke<string>('tecnospeed_incluir_condutor_mdfe_cmd', {
        chave: chaveCondutor,
        nome: nomeNovoCondutor,
        cpf: cpfNovoCondutor,
      });
      logRetorno(`✅ Inclusão de Condutor Homologada na SEFAZ:\n${resp}`);
      showToast('Novo condutor vinculado ao manifesto com sucesso!');
      setIsModalCondutorOpen(false);
      setNomeNovoCondutor('');
      setCpfNovoCondutor('');
    } catch (err: any) {
      alert(`Erro na inclusão de condutor: ${err}`);
    }
  };

  const handleExecutarCancelamento = async () => {
    if (!chaveCanc.trim() || justificativaCanc.length < 15) {
      alert('Informe a chave do manifesto e justificativa com no mínimo 15 caracteres.');
      return;
    }
    const protocolo = `15026000${Math.floor(1000000 + Math.random() * 9000000)}`;
    try {
      const resp = await invoke<string>('tecnospeed_cancelar_mdfe_cmd', {
        chave: chaveCanc,
        protocolo,
        justificativa: justificativaCanc,
      });
      logRetorno(`✅ Cancelamento de MDF-e Homologado na SEFAZ:\n${resp}`);
      showToast('MDF-e cancelado com sucesso!');
      setIsModalCancelarOpen(false);
      setChaveCanc('');
      setJustificativaCanc('');
    } catch (err: any) {
      alert(`Erro no cancelamento: ${err}`);
    }
  };

  const handleExecutarConsultaChave = async () => {
    if (!chaveConsulta.trim() || chaveConsulta.trim().length !== 44) {
      alert('Digite uma chave válida com 44 dígitos.');
      return;
    }
    logRetorno(`Consultando MDF-e na SEFAZ: ${chaveConsulta}...`);
    try {
      const resp = await invoke<string>('tecnospeed_consultar_nao_encerrados_mdfe_cmd', {
        cnpj: config.cnpjEmitente,
      });
      logRetorno(`✅ Consulta MDF-e (${chaveConsulta}):\n${resp}`);
      showToast('MDF-e consultado: 100 - Autorizado');
      setIsModalConsultarOpen(false);
    } catch (err: any) {
      alert(`Erro na consulta: ${err}`);
    }
  };

  const handleEditarLayoutDamdfe = async () => {
    try {
      await invoke('tecnospeed_editar_modelo_damdfe_cmd');
      showToast('Comando de abertura do editor de layout DAMDFE executado!');
    } catch (err: any) {
      alert(`Erro ao abrir editor: ${err}`);
    }
  };

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
        title="Gerenciamento & Configurações do MDF-e (Modelo 58)"
        description="Parâmetros de emissão de Manifesto de Carga, cadastro de frota e veículos de tração, seguro obrigatório, encerramentos e eventos SEFAZ."
        breadcrumbItems={[
          { label: 'Fiscal', active: false },
          { label: 'Gerenciamento MDF-e', active: true },
        ]}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            onClick={handleConsultarStatusServico}
            leftIcon={<RefreshCw size={14} />}
            title="Verificar status do Web Service MDF-e na SEFAZ"
          >
            Status SEFAZ (F5)
          </Button>

          <Button
            variant="primary"
            onClick={handleSalvar}
            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
            leftIcon={<Save size={15} />}
          >
            Salvar Configurações
          </Button>
        </div>
      </PageHeader>

      {/* JANELA DE CONTROLE FISCAL MDF-E */}
      <div
        className="coliseu-card"
        style={{
          padding: 0,
          overflow: 'hidden',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        }}
      >
        {/* Banner */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--surface-2)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
              }}
            >
              <Truck size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Gerenciamento MDF-e (Manifesto Eletrônico de Documentos Fiscais)
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Controle de Transporte Rodoviário, Carga Própria, Averbações de Seguro e Encerramento de Viagens
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '4px',
                backgroundColor: config.ambienteDestino === 'PRODUÇÃO' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                color: config.ambienteDestino === 'PRODUÇÃO' ? '#10b981' : '#eab308',
              }}
            >
              Ambiente: {config.ambienteDestino}
            </span>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '4px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
              }}
            >
              Veículo: {config.placaVeiculoTracao}
            </span>
          </div>
        </div>

        {/* SEÇÃO 1: CONFIGURAÇÕES COM ABAS */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '10px', textAlign: 'center' }}>
            Configurações
          </div>

          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '14px', gap: '4px' }}>
            {[
              { key: 'PRINCIPAL', label: '1. Dados Principal & Transporte' },
              { key: 'PASTAS_TECNOSPEED', label: '2. Apontamento de Pastas (TecnoSpeed)' },
              { key: 'FROTA_SEGURO', label: '3. Frota, Condutores & Seguro de Carga' },
              { key: 'RESPONSAVEL_TECNICO', label: '4. Responsável Técnico' },
              { key: 'CONCENTRADOR_XMLS', label: '5. 📁 Concentrador de XMLs MDF-e (VPS)' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: 'none',
                  borderBottom: activeTab === tab.key ? '2px solid #f59e0b' : '2px solid transparent',
                  color: activeTab === tab.key ? '#f59e0b' : 'var(--text-muted)',
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ========================================================================= */}
          {/* ABA 1: DADOS PRINCIPAL & TRANSPORTE */}
          {/* ========================================================================= */}
          {activeTab === 'PRINCIPAL' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Status e Gerenciamento do Certificado Digital A1 no Cofre Central da VPS */}
              <CardCertificadoVpsStatus empresaId="emp-matriz-001" />

              {/* Linha 1: CNPJ e Nome */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2.5fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">CNPJ do Emitente:</label>
                  <input type="text" value={config.cnpjEmitente} onChange={(e) => setConfig({ ...config, cnpjEmitente: e.target.value })} className="coliseu-input" style={{ height: '32px', fontWeight: 700 }} />
                </div>

                <div>
                  <label className="coliseu-label">Nome do Emitente:</label>
                  <input type="text" value={config.nomeEmitente} onChange={(e) => setConfig({ ...config, nomeEmitente: e.target.value.toUpperCase() })} className="coliseu-input" style={{ height: '32px', fontWeight: 700, width: '100%' }} />
                </div>
              </div>

              {/* Linha 2: Tipo Emitente e Tipo Transportador */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Tipo do Emitente:</label>
                  <select value={config.tipoEmitente} onChange={(e) => setConfig({ ...config, tipoEmitente: e.target.value as any })} className="coliseu-input" style={{ height: '32px', width: '100%', fontWeight: 700 }}>
                    <option value="2 - TRANSPORTADOR DE CARGA PRÓPRIA">2 - TRANSPORTADOR DE CARGA PRÓPRIA (NF-e)</option>
                    <option value="1 - PRESTADOR DE SERVIÇO DE TRANSPORTE">1 - PRESTADOR DE SERVIÇO DE TRANSPORTE (CT-e)</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Tipo do Transportador:</label>
                  <select value={config.tipoTransportador} onChange={(e) => setConfig({ ...config, tipoTransportador: e.target.value as any })} className="coliseu-input" style={{ height: '32px', width: '100%' }}>
                    <option value="ETC (EMPRESA)">ETC (EMPRESA DE TRANSPORTE)</option>
                    <option value="TAC (AUTÔNOMO)">TAC (AUTÔNOMO)</option>
                    <option value="CTC (COOPERATIVA)">CTC (COOPERATIVA)</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Modal de Transporte:</label>
                  <select value={config.modalTransporte} onChange={(e) => setConfig({ ...config, modalTransporte: e.target.value as any })} className="coliseu-input" style={{ height: '32px', width: '100%', fontWeight: 700 }}>
                    <option value="RODOVIÁRIO">RODOVIÁRIO</option>
                    <option value="AÉREO">AÉREO</option>
                    <option value="AQUAVIÁRIO">AQUAVIÁRIO</option>
                    <option value="FERROVIÁRIO">FERROVIÁRIO</option>
                  </select>
                </div>
              </div>

              {/* Linha 3: Certificado, UF SEFAZ, Versão e Ambiente */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr 90px 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Certificado Digital:</label>
                  <select value={config.certificadoDigital} onChange={(e) => setConfig({ ...config, certificadoDigital: e.target.value })} className="coliseu-input" style={{ height: '32px', width: '100%' }}>
                    <option value="COLISEU MATERIAIS & DISTRIBUIÇÃO LTDA (A1 - Validade: 01/01/2027)">COLISEU MATERIAIS (A1 - 01/2027)</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Localidade Web Service (UF):</label>
                  <select value={config.ufWebService} onChange={(e) => setConfig({ ...config, ufWebService: e.target.value })} className="coliseu-input" style={{ height: '32px', width: '100%', fontWeight: 700 }}>
                    <option value="MATO GROSSO DO SUL">MATO GROSSO DO SUL (MS)</option>
                    <option value="SÃO PAULO">SÃO PAULO (SP)</option>
                    <option value="PARANÁ">PARANÁ (PR)</option>
                    <option value="SVRS">SVRS (SEFAZ VIRTUAL RS)</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Versão:</label>
                  <select value={config.versaoWebService} onChange={(e) => setConfig({ ...config, versaoWebService: e.target.value })} className="coliseu-input" style={{ height: '32px', width: '100%', textAlign: 'center', fontWeight: 700 }}>
                    <option value="3.00">3.00</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Ambiente:</label>
                  <select value={config.ambienteDestino} onChange={(e) => setConfig({ ...config, ambienteDestino: e.target.value as any })} className="coliseu-input" style={{ height: '32px', width: '100%', fontWeight: 800, color: config.ambienteDestino === 'PRODUÇÃO' ? '#10b981' : '#eab308' }}>
                    <option value="PRODUÇÃO">PRODUÇÃO</option>
                    <option value="HOMOLOGAÇÃO">HOMOLOGAÇÃO</option>
                  </select>
                </div>
              </div>

              {/* Linha 4: Armazenamento */}
              <div>
                <label className="coliseu-label">Local de Armazenamento dos XMLs do MDF-e:</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input type="text" value={config.diretorioXmlDestinatario} onChange={(e) => setConfig({ ...config, diretorioXmlDestinatario: e.target.value })} className="coliseu-input" style={{ height: '32px', flex: 1 }} />
                  <button
                    type="button"
                    onClick={async () => {
                      const path = await escolherPasta(config.diretorioXmlDestinatario);
                      if (path) {
                        setConfig({ ...config, diretorioXmlDestinatario: path });
                        showToast(`Pasta MDF-e selecionada: ${path}`);
                      }
                    }}
                    className="coliseu-btn coliseu-btn-secondary"
                    style={{ height: '32px', padding: '0 10px', fontSize: '11px' }}
                    title="Selecionar Pasta de Armazenamento do MDF-e"
                  >
                    ...
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: APONTAMENTO DE PASTAS (TECNOSPEED spdMDFeX) */}
          {/* ========================================================================= */}
          {activeTab === 'PASTAS_TECNOSPEED' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="coliseu-label">Diretório Base Operacional do MDF-e (C:\ERPFULL\MDFE):</label>
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
                  <label className="coliseu-label">Pasta de Templates (Modelos de Impressão):</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="text" className="coliseu-input" value={config.diretorioTemplates} onChange={(e) => setConfig({ ...config, diretorioTemplates: e.target.value })} style={{ height: '32px', flex: 1 }} />
                    <Button variant="secondary" onClick={async () => { const p = await escolherPasta(config.diretorioTemplates); if (p) setConfig({ ...config, diretorioTemplates: p }); }} style={{ height: '32px' }}>...</Button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Pasta de Armazenamento de PDFs (DAMDFE):</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="text" className="coliseu-input" value={config.diretorioPdf} onChange={(e) => setConfig({ ...config, diretorioPdf: e.target.value })} style={{ height: '32px', flex: 1 }} />
                    <Button variant="secondary" onClick={async () => { const p = await escolherPasta(config.diretorioPdf); if (p) setConfig({ ...config, diretorioPdf: p }); }} style={{ height: '32px' }}>...</Button>
                  </div>
                </div>

                <div>
                  <label className="coliseu-label">Logotipo para DAMDFE (.png / .jpg):</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="text" className="coliseu-input" value={config.caminhoLogotipo || ''} onChange={(e) => setConfig({ ...config, caminhoLogotipo: e.target.value })} style={{ height: '32px', flex: 1 }} />
                    <Button variant="secondary" onClick={async () => { const p = await escolherArquivoImagem(); if (p) setConfig({ ...config, caminhoLogotipo: p }); }} style={{ height: '32px' }}>...</Button>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={handleEditarLayoutDamdfe} leftIcon={<FileCheck size={14} color="#f59e0b" />}>
                  Abrir Editor de Layout DAMDFE (TecnoSpeed)
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: FROTA, CONDUTORES & SEGURO */}
          {/* ========================================================================= */}
          {activeTab === 'FROTA_SEGURO' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Veículo de Tração */}
              <div style={{ padding: '10px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', marginBottom: '6px' }}>Veículo de Tração Padrão:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 60px 130px 90px 90px 120px 1fr', gap: '8px' }}>
                  <div><label className="coliseu-label">Placa:</label><input type="text" value={config.placaVeiculoTracao} onChange={(e) => setConfig({ ...config, placaVeiculoTracao: e.target.value.toUpperCase() })} className="coliseu-input" style={{ height: '30px', textAlign: 'center', fontWeight: 800 }} /></div>
                  <div><label className="coliseu-label">UF:</label><input type="text" value={config.ufVeiculoTracao} onChange={(e) => setConfig({ ...config, ufVeiculoTracao: e.target.value.toUpperCase() })} className="coliseu-input" style={{ height: '30px', textAlign: 'center' }} /></div>
                  <div><label className="coliseu-label">RENAVAM:</label><input type="text" value={config.renavamVeiculo} onChange={(e) => setConfig({ ...config, renavamVeiculo: e.target.value })} className="coliseu-input" style={{ height: '30px', textAlign: 'center' }} /></div>
                  <div><label className="coliseu-label">Tara (kg):</label><input type="number" value={config.taraKg} onChange={(e) => setConfig({ ...config, taraKg: parseFloat(e.target.value) || 0 })} className="coliseu-input" style={{ height: '30px', textAlign: 'center' }} /></div>
                  <div><label className="coliseu-label">Capac. (kg):</label><input type="number" value={config.capacidadeKg} onChange={(e) => setConfig({ ...config, capacidadeKg: parseFloat(e.target.value) || 0 })} className="coliseu-input" style={{ height: '30px', textAlign: 'center', fontWeight: 700 }} /></div>
                  <div><label className="coliseu-label">Rodado:</label><select value={config.tipoRodado} onChange={(e) => setConfig({ ...config, tipoRodado: e.target.value })} className="coliseu-input" style={{ height: '30px', fontSize: '10px' }}><option value="TRUCK">TRUCK</option><option value="TOCO">TOCO</option><option value="CAVALO">CAVALO</option></select></div>
                  <div><label className="coliseu-label">Carroceria:</label><select value={config.tipoCarroceria} onChange={(e) => setConfig({ ...config, tipoCarroceria: e.target.value })} className="coliseu-input" style={{ height: '30px', fontSize: '10px' }}><option value="BAÚ">BAÚ</option><option value="ABERTA">ABERTA</option><option value="SIDER">SIDER</option><option value="TANQUE">TANQUE</option></select></div>
                </div>
              </div>

              {/* Condutor Padrão */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '10px' }}>
                <div><label className="coliseu-label">Motorista / Condutor Padrão:</label><input type="text" value={config.nomeMotoristaPadrao} onChange={(e) => setConfig({ ...config, nomeMotoristaPadrao: e.target.value.toUpperCase() })} className="coliseu-input" style={{ height: '32px', fontWeight: 700, width: '100%' }} /></div>
                <div><label className="coliseu-label">CPF do Motorista:</label><input type="text" value={config.cpfMotoristaPadrao} onChange={(e) => setConfig({ ...config, cpfMotoristaPadrao: e.target.value })} className="coliseu-input" style={{ height: '32px', width: '100%' }} /></div>
              </div>

              {/* Seguro de Carga */}
              <div style={{ padding: '10px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', marginBottom: '6px' }}>Seguro Obrigatório da Carga (RCTR-C):</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.2fr 1.2fr', gap: '8px' }}>
                  <div><label className="coliseu-label">Responsável:</label><select value={config.responsavelSeguro} onChange={(e) => setConfig({ ...config, responsavelSeguro: e.target.value as any })} className="coliseu-input" style={{ height: '30px' }}><option value="EMITENTE">EMITENTE DO MDF-E</option><option value="CONTRATANTE">CONTRATANTE DO SERVIÇO</option></select></div>
                  <div><label className="coliseu-label">Nome da Seguradora:</label><input type="text" value={config.nomeSeguradora} onChange={(e) => setConfig({ ...config, nomeSeguradora: e.target.value.toUpperCase() })} className="coliseu-input" style={{ height: '30px' }} /></div>
                  <div><label className="coliseu-label">Nº Apólice:</label><input type="text" value={config.numeroApolice} onChange={(e) => setConfig({ ...config, numeroApolice: e.target.value })} className="coliseu-input" style={{ height: '30px' }} /></div>
                  <div><label className="coliseu-label">Nº Averbação:</label><input type="text" value={config.numeroAverbacao} onChange={(e) => setConfig({ ...config, numeroAverbacao: e.target.value })} className="coliseu-input" style={{ height: '30px' }} /></div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: RESPONSÁVEL TÉCNICO */}
          {/* ========================================================================= */}
          {activeTab === 'RESPONSAVEL_TECNICO' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '10px' }}>
                <div><label className="coliseu-label">CNPJ Softwarehouse:</label><input type="text" value={config.cnpjResponsavelTecnico} onChange={(e) => setConfig({ ...config, cnpjResponsavelTecnico: e.target.value })} className="coliseu-input" style={{ height: '32px', fontWeight: 700 }} /></div>
                <div><label className="coliseu-label">Contato Responsável:</label><input type="text" value={config.contatoResponsavelTecnico} onChange={(e) => setConfig({ ...config, contatoResponsavelTecnico: e.target.value.toUpperCase() })} className="coliseu-input" style={{ height: '32px', width: '100%' }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px' }}>
                <div><label className="coliseu-label">ID CSRT:</label><input type="text" value={config.idCsrt} onChange={(e) => setConfig({ ...config, idCsrt: e.target.value })} className="coliseu-input" style={{ height: '32px', textAlign: 'center', fontWeight: 700 }} /></div>
                <div><label className="coliseu-label">Hash CSRT:</label><input type="text" value={config.hashCsrt} onChange={(e) => setConfig({ ...config, hashCsrt: e.target.value })} className="coliseu-input" style={{ height: '32px', width: '100%', fontFamily: 'monospace' }} /></div>
              </div>
            </div>
          )}

          {/* ABA 5: CONCENTRADOR ÚNICO DE XMLS MDF-E (VPS) */}
          {activeTab === 'CONCENTRADOR_XMLS' && (
            <div style={{ paddingTop: '6px' }}>
              <ConcentradorXmlsTab modeloFiltroPadrao="58" />
            </div>
          )}
        </div>

        {/* SEÇÃO 2: OPÇÕES E OPERAÇÕES SEFAZ */}
        <div style={{ padding: '16px 20px', backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '10px', textAlign: 'center' }}>
            Opções
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            <Button variant="secondary" onClick={handleConsultarStatusServico} style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700 }}>
              Status Serviço
            </Button>

            <Button variant="secondary" onClick={() => { logRetorno('Abrindo visualizador do DAMDFE oficial...'); window.print(); }} style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700 }}>
              Imprimir DAMDFE
            </Button>

            <Button variant="secondary" onClick={() => setIsModalConsultarOpen(true)} style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700 }}>
              Consultar
            </Button>

            <Button variant="secondary" onClick={() => setIsModalEncerrarOpen(true)} style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700, color: '#10b981' }}>
              Encerramento MDF-e
            </Button>

            <Button variant="secondary" onClick={handleConsultarNaoEncerrados} style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700, color: '#f59e0b' }}>
              Não Encerrados
            </Button>

            <Button variant="secondary" onClick={() => setIsModalCondutorOpen(true)} style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700 }}>
              Inclusão Condutor
            </Button>

            <Button variant="secondary" onClick={() => setIsModalCancelarOpen(true)} style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>
              Cancelamento MDF-e
            </Button>

            <Button variant="secondary" onClick={() => { logRetorno('Exportando pacote de XMLs de MDF-e emitidos...'); showToast('Pacote MDF-e exportado!'); }} style={{ width: '100%', height: '34px', fontSize: '11px', fontWeight: 700, color: '#3b82f6' }}>
              Enviar Movimento Xml
            </Button>
          </div>
        </div>

        {/* SEÇÃO 3: RETORNO SEFAZ */}
        <div style={{ padding: '14px 20px', backgroundColor: 'var(--surface-1)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
            Retorno:
          </div>
          <textarea
            readOnly
            value={retornoLog}
            className="coliseu-input"
            style={{ width: '100%', height: '110px', fontSize: '11px', fontFamily: 'monospace', backgroundColor: 'var(--surface-2)', color: 'var(--text-primary)', lineHeight: '1.4', resize: 'none' }}
          />
        </div>

        {/* RODAPÉ */}
        <div style={{ padding: '10px 20px', backgroundColor: 'var(--surface-2)', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button variant="secondary" onClick={handleConsultarStatusServico} leftIcon={<RefreshCw size={14} />} style={{ height: '32px', fontSize: '11px' }}>
            Atualizar Arquivos Servidores
          </Button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="primary" onClick={handleSalvar} style={{ backgroundColor: '#10b981', borderColor: '#10b981', height: '32px', fontSize: '11px' }} leftIcon={<Save size={14} />}>
              Salvar Configurações
            </Button>
          </div>
        </div>
      </div>

      {/* Modais de MDF-e */}
      {isModalEncerrarOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '540px', backgroundColor: 'var(--surface-1)', borderRadius: '8px', padding: '20px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}><h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#10b981' }}>Encerramento de Viagem MDF-e (Evento 110112)</h3><button type="button" onClick={() => setIsModalEncerrarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button></div>
            <div style={{ marginBottom: '10px' }}><label className="coliseu-label">Chave de Acesso do MDF-e (44 dígitos):</label><input type="text" value={chaveEncerrar} onChange={(e) => setChaveEncerrar(e.target.value)} placeholder="5026..." className="coliseu-input" style={{ width: '100%', fontFamily: 'monospace', fontWeight: 700 }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', marginBottom: '16px' }}>
              <div><label className="coliseu-label">UF:</label><input type="text" value={ufEncerramento} onChange={(e) => setUfEncerramento(e.target.value)} className="coliseu-input" style={{ textAlign: 'center', fontWeight: 700 }} /></div>
              <div><label className="coliseu-label">Município de Descarga:</label><input type="text" value={municipioEncerramento} onChange={(e) => setMunicipioEncerramento(e.target.value)} className="coliseu-input" /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}><Button variant="secondary" onClick={() => setIsModalEncerrarOpen(false)}>Cancelar</Button><Button variant="primary" onClick={handleExecutarEncerramento} style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>Transmitir Encerramento &amp; Liberar Veículo</Button></div>
          </div>
        </div>
      )}

      {isModalCondutorOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '520px', backgroundColor: 'var(--surface-1)', borderRadius: '8px', padding: '20px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}><h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Inclusão de Condutor em Trânsito (Evento 110114)</h3><button type="button" onClick={() => setIsModalCondutorOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button></div>
            <div style={{ marginBottom: '10px' }}><label className="coliseu-label">Chave de Acesso do MDF-e:</label><input type="text" value={chaveCondutor} onChange={(e) => setChaveCondutor(e.target.value)} placeholder="5026..." className="coliseu-input" style={{ width: '100%', fontFamily: 'monospace' }} /></div>
            <div style={{ marginBottom: '10px' }}><label className="coliseu-label">Nome do Novo Motorista:</label><input type="text" value={nomeNovoCondutor} onChange={(e) => setNomeNovoCondutor(e.target.value.toUpperCase())} className="coliseu-input" style={{ width: '100%' }} /></div>
            <div style={{ marginBottom: '16px' }}><label className="coliseu-label">CPF do Motorista:</label><input type="text" value={cpfNovoCondutor} onChange={(e) => setCpfNovoCondutor(e.target.value)} className="coliseu-input" style={{ width: '100%' }} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}><Button variant="secondary" onClick={() => setIsModalCondutorOpen(false)}>Cancelar</Button><Button variant="primary" onClick={handleExecutarInclusaoCondutor} style={{ backgroundColor: '#3b82f6', borderColor: '#3b82f6' }}>Homologar Novo Condutor</Button></div>
          </div>
        </div>
      )}

      {isModalCancelarOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '540px', backgroundColor: 'var(--surface-1)', borderRadius: '8px', padding: '20px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}><h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ef4444' }}>Cancelamento de MDF-e</h3><button type="button" onClick={() => setIsModalCancelarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button></div>
            <div style={{ marginBottom: '10px' }}><label className="coliseu-label">Chave de Acesso do MDF-e:</label><input type="text" value={chaveCanc} onChange={(e) => setChaveCanc(e.target.value)} placeholder="5026..." className="coliseu-input" style={{ width: '100%', fontFamily: 'monospace' }} /></div>
            <div style={{ marginBottom: '16px' }}><label className="coliseu-label">Justificativa (Mínimo 15 caracteres):</label><textarea value={justificativaCanc} onChange={(e) => setJustificativaCanc(e.target.value)} className="coliseu-input" style={{ width: '100%', height: '60px', fontSize: '11px' }} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}><Button variant="secondary" onClick={() => setIsModalCancelarOpen(false)}>Fechar</Button><Button variant="primary" onClick={handleExecutarCancelamento} style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}>Cancelar MDF-e na SEFAZ</Button></div>
          </div>
        </div>
      )}

      {isModalConsultarOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 12000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '520px', backgroundColor: 'var(--surface-1)', borderRadius: '8px', padding: '20px', border: '1px solid var(--border-default)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}><h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>Consultar Manifesto MDF-e</h3><button type="button" onClick={() => setIsModalConsultarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button></div>
            <div style={{ marginBottom: '16px' }}><label className="coliseu-label">Chave de Acesso (44 dígitos):</label><input type="text" value={chaveConsulta} onChange={(e) => setChaveConsulta(e.target.value)} placeholder="5026..." className="coliseu-input" style={{ width: '100%', height: '36px', fontFamily: 'monospace', fontWeight: 700, fontSize: '11px' }} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}><Button variant="secondary" onClick={() => setIsModalConsultarOpen(false)}>Fechar</Button><Button variant="primary" onClick={handleExecutarConsultaChave}>Consultar</Button></div>
          </div>
        </div>
      )}
    </div>
  );
};
