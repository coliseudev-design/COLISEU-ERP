import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { formatCurrency, formatDate } from '../lib/formatters';
import {
  FileText,
  FileCheck,
  Truck,
  Plus,
  Search,
  Filter,
  Printer,
  FileEdit,
  XCircle,
  CheckCircle2,
  AlertTriangle,
  Download,
  Settings,
  ShieldCheck,
  X,
  Wifi,
  Sparkles,
  Wrench,
  Store,
} from 'lucide-react';
import {
  DocumentoFiscalItem,
  ModeloDFe,
  getDocumentosFiscais,
} from '../lib/dfe';
import { getCertificadoConfig, CertificadoA1Config } from '../lib/certificadoA1';
import { ModalConfiguracaoCertificado } from '../components/fiscal/ModalConfiguracaoCertificado';
import { ModalEmissaoNFe } from '../components/fiscal/ModalEmissaoNFe';
import { ModalEmissaoMDFe } from '../components/fiscal/ModalEmissaoMDFe';
import { ModalCartaCorrecao } from '../components/fiscal/ModalCartaCorrecao';
import { ModalVisualizadorDanfe } from '../components/fiscal/ModalVisualizadorDanfe';

export const DfePage: React.FC = () => {
  const [tabModelo, setTabModelo] = useState<'TODOS' | '55_NFE' | '65_NFCE' | '58_MDFE'>('TODOS');
  const [busca, setBusca] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estados dos Modais
  const [isModalCertOpen, setIsModalCertOpen] = useState(false);
  const [isModalEmissaoNfeOpen, setIsModalEmissaoNfeOpen] = useState(false);
  const [isModalEmissaoMdfeOpen, setIsModalEmissaoMdfeOpen] = useState(false);
  const [isModalDanfeOpen, setIsModalDanfeOpen] = useState(false);
  const [isModalEventoOpen, setIsModalEventoOpen] = useState(false);
  const [tipoEvento, setTipoEvento] = useState<'CARTA_CORRECAO' | 'CANCELAMENTO' | 'ENCERRAMENTO_MDFE'>('CARTA_CORRECAO');

  const [docSelecionado, setDocSelecionado] = useState<DocumentoFiscalItem | null>(null);
  const [modeloParaEmissao, setModeloParaEmissao] = useState<'55_NFE' | '65_NFCE'>('55_NFE');

  const [documentos, setDocumentos] = useState<DocumentoFiscalItem[]>(getDocumentosFiscais);
  const [certConfig, setCertConfig] = useState<CertificadoA1Config>(getCertificadoConfig);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const handleUpdate = () => {
      setDocumentos(getDocumentosFiscais());
      setCertConfig(getCertificadoConfig());
    };
    window.addEventListener('coliseu_dfe_updated', handleUpdate);
    window.addEventListener('coliseu_cert_updated', handleUpdate);
    return () => {
      window.removeEventListener('coliseu_dfe_updated', handleUpdate);
      window.removeEventListener('coliseu_cert_updated', handleUpdate);
    };
  }, []);

  // Filtragem
  const documentosFiltrados = useMemo(() => {
    return documentos.filter((doc) => {
      if (tabModelo !== 'TODOS' && doc.modelo !== tabModelo) return false;
      if (busca) {
        const q = busca.toLowerCase();
        const mNum = String(doc.numero).includes(q);
        const mDest = doc.destinatarioNome.toLowerCase().includes(q);
        const mChave = doc.chaveAcesso.toLowerCase().includes(q);
        if (!mNum && !mDest && !mChave) return false;
      }
      return true;
    });
  }, [documentos, tabModelo, busca]);

  // Estatísticas
  const stats = useMemo(() => {
    const totalNfe = documentos.filter((d) => d.modelo === '55_NFE' && d.statusSefaz === 'AUTORIZADA').length;
    const totalNfce = documentos.filter((d) => d.modelo === '65_NFCE' && d.statusSefaz === 'AUTORIZADA').length;
    const totalMdfe = documentos.filter((d) => d.modelo === '58_MDFE' && d.statusSefaz === 'AUTORIZADA').length;
    const faturamentoNfe = documentos
      .filter((d) => d.statusSefaz === 'AUTORIZADA')
      .reduce((acc, d) => acc + d.valorTotal, 0);

    return {
      totalNfe,
      totalNfce,
      totalMdfe,
      faturamentoNfe,
    };
  }, [documentos]);

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

      {/* Header com Ações Rápidas */}
      <PageHeader
        title="Central de Documentos Fiscais Eletrônicos (DF-e)"
        description="Emissão, transmissão direta SEFAZ, impressão de DANFE/DAMDFE, cancelamentos, cartas de correção e gestão de manifesto de carga."
        breadcrumbItems={[
          { label: 'Fiscal', active: false },
          { label: 'Emissão DF-e & MDF-e', active: true },
        ]}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            onClick={() => window.location.hash = '#/gerenciamento_nfe'}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px', color: '#3b82f6' }}
            title="Abrir Central de Gerenciamento e Configuração de NF-e"
          >
            <Wrench size={15} /> Config. NF-e
          </Button>

          <Button
            variant="secondary"
            onClick={() => window.location.hash = '#/gerenciamento_nfce'}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px', color: '#10b981' }}
            title="Abrir Central de Gerenciamento e Configuração de NFC-e"
          >
            <Store size={15} /> Config. NFC-e
          </Button>

          <Button
            variant="secondary"
            onClick={() => window.location.hash = '#/gerenciamento_mdfe'}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px', color: '#f59e0b' }}
            title="Abrir Central de Gerenciamento e Configuração de MDF-e"
          >
            <Truck size={15} /> Config. MDF-e
          </Button>

          <Button
            variant="secondary"
            onClick={() => setIsModalCertOpen(true)}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px' }}
          >
            <Settings size={15} /> Certificado A1 ({certConfig.ambiente})
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              setModeloParaEmissao('65_NFCE');
              setIsModalEmissaoNfeOpen(true);
            }}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px', backgroundColor: '#10b981', borderColor: '#10b981' }}
          >
            <Plus size={15} /> Emitir NFC-e (Mod. 65)
          </Button>

          <Button
            variant="primary"
            onClick={() => {
              setModeloParaEmissao('55_NFE');
              setIsModalEmissaoNfeOpen(true);
            }}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px' }}
          >
            <Plus size={15} /> Emitir NF-e (Mod. 55)
          </Button>

          <Button
            variant="primary"
            onClick={() => setIsModalEmissaoMdfeOpen(true)}
            style={{ display: 'inline-flex', gap: '6px', fontSize: '12px', backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}
          >
            <Truck size={15} /> Emitir MDF-e (Manifesto)
          </Button>
        </div>
      </PageHeader>

      {/* Métricas e Status SEFAZ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginBottom: '16px',
        }}
      >
        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Faturado no Mês (DF-e)</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace', margin: '4px 0' }}>
            {formatCurrency(stats.faturamentoNfe)}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Notas autorizadas na SEFAZ</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>NF-e Grandes (Mod. 55)</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6', margin: '4px 0' }}>
            {stats.totalNfe} emitidas
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Vendas PJ e Transporte</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>NFC-e Consumidor (Mod. 65)</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', margin: '4px 0' }}>
            {stats.totalNfce} emitidas
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cupons emitidos no PDV</div>
        </div>

        <div className="coliseu-card" style={{ padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>MDF-e (Manifesto de Carga)</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b', margin: '4px 0' }}>
            {stats.totalMdfe} ativos
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cargas em trânsito</div>
        </div>
      </div>

      {/* Barra de Abas e Busca */}
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
        <div style={{ display: 'flex', backgroundColor: 'var(--surface-3)', borderRadius: '6px', padding: '2px', gap: '2px' }}>
          {[
            { key: 'TODOS', label: 'Todos os Documentos' },
            { key: '55_NFE', label: 'NF-e (Mod. 55)' },
            { key: '65_NFCE', label: 'NFC-e (Mod. 65)' },
            { key: '58_MDFE', label: 'MDF-e (Manifesto Mod. 58)' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTabModelo(tab.key as any)}
              style={{
                border: 'none',
                background: tabModelo === tab.key ? 'var(--surface-1)' : 'transparent',
                color: tabModelo === tab.key ? '#3b82f6' : 'var(--text-muted)',
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

        <div style={{ width: '320px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por número, destinatário ou chave..."
              className="coliseu-input"
              style={{ paddingLeft: '30px', height: '34px', fontSize: '11px' }}
            />
          </div>
        </div>
      </div>

      {/* Tabela de Documentos Fiscais */}
      <div className="coliseu-card">
        <div className="coliseu-table-container">
          <table className="coliseu-table" style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Modelo</th>
                <th style={{ width: '90px' }}>Número / Série</th>
                <th style={{ width: '130px' }}>Emissão</th>
                <th>Destinatário / Carga</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Valor Total (R$)</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Status SEFAZ</th>
                <th style={{ width: '240px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {documentosFiltrados.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor:
                          doc.modelo === '55_NFE'
                            ? 'rgba(59, 130, 246, 0.15)'
                            : doc.modelo === '65_NFCE'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(245, 158, 11, 0.15)',
                        color:
                          doc.modelo === '55_NFE'
                            ? '#3b82f6'
                            : doc.modelo === '65_NFCE'
                            ? '#10b981'
                            : '#f59e0b',
                      }}
                    >
                      {doc.modelo === '55_NFE' ? 'NF-e 55' : doc.modelo === '65_NFCE' ? 'NFC-e 65' : 'MDF-e 58'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-link)', fontSize: '11px' }}>
                      Nº {doc.numero}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Série {doc.serie}</div>
                  </td>
                  <td>
                    <div className="tabular-nums">{formatDate(doc.dataEmissao)}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{doc.horaEmissao}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.destinatarioNome}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="text-mono">
                      Chave: {doc.chaveAcesso.substring(0, 20)}...
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: '#10b981' }}>
                    {formatCurrency(doc.valorTotal)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor:
                          doc.statusSefaz === 'AUTORIZADA'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : doc.statusSefaz === 'CANCELADA'
                            ? 'rgba(239, 68, 68, 0.15)'
                            : doc.statusSefaz === 'ENCERRADO'
                            ? 'rgba(107, 114, 128, 0.15)'
                            : 'var(--surface-3)',
                        color:
                          doc.statusSefaz === 'AUTORIZADA'
                            ? '#10b981'
                            : doc.statusSefaz === 'CANCELADA'
                            ? '#ef4444'
                            : doc.statusSefaz === 'ENCERRADO'
                            ? '#6b7280'
                            : 'var(--text-secondary)',
                      }}
                    >
                      {doc.statusSefaz}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      {/* Botão Imprimir DANFE/DAMDFE */}
                      <button
                        type="button"
                        onClick={() => {
                          setDocSelecionado(doc);
                          setIsModalDanfeOpen(true);
                        }}
                        className="coliseu-btn coliseu-btn-secondary"
                        style={{ padding: '0 8px', height: '28px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        title="Imprimir DANFE / DAMDFE"
                      >
                        <Printer size={12} /> Imprimir
                      </button>

                      {/* Botão CC-e (Apenas NF-e autorizada) */}
                      {doc.modelo === '55_NFE' && doc.statusSefaz === 'AUTORIZADA' && (
                        <button
                          type="button"
                          onClick={() => {
                            setDocSelecionado(doc);
                            setTipoEvento('CARTA_CORRECAO');
                            setIsModalEventoOpen(true);
                          }}
                          className="coliseu-btn coliseu-btn-secondary"
                          style={{ padding: '0 6px', height: '28px', fontSize: '11px' }}
                          title="Emitir Carta de Correção (CC-e)"
                        >
                          <FileEdit size={12} /> CC-e
                        </button>
                      )}

                      {/* Botão Cancelar (Apenas se autorizada) */}
                      {doc.statusSefaz === 'AUTORIZADA' && doc.modelo !== '58_MDFE' && (
                        <button
                          type="button"
                          onClick={() => {
                            setDocSelecionado(doc);
                            setTipoEvento('CANCELAMENTO');
                            setIsModalEventoOpen(true);
                          }}
                          className="coliseu-btn coliseu-btn-secondary"
                          style={{ padding: '0 6px', height: '28px', fontSize: '11px', color: '#ef4444' }}
                          title="Cancelar NF-e na SEFAZ"
                        >
                          <XCircle size={12} />
                        </button>
                      )}

                      {/* Botão Encerrar MDF-e */}
                      {doc.modelo === '58_MDFE' && doc.statusSefaz === 'AUTORIZADA' && (
                        <button
                          type="button"
                          onClick={() => {
                            setDocSelecionado(doc);
                            setTipoEvento('ENCERRAMENTO_MDFE');
                            setIsModalEventoOpen(true);
                          }}
                          className="coliseu-btn coliseu-btn-secondary"
                          style={{ padding: '0 8px', height: '28px', fontSize: '11px', color: '#10b981', fontWeight: 600 }}
                          title="Encerrar MDF-e na SEFAZ após entrega da carga"
                        >
                          Encerrar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {documentosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Nenhum documento fiscal encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Certificado A1 */}
      {isModalCertOpen && (
        <ModalConfiguracaoCertificado
          isOpen={isModalCertOpen}
          onClose={() => setIsModalCertOpen(false)}
          onSuccess={() => {
            showToast('✅ Configurações de Certificado A1 e Séries atualizadas!');
          }}
        />
      )}

      {/* Modal Emissão NF-e / NFC-e */}
      {isModalEmissaoNfeOpen && (
        <ModalEmissaoNFe
          isOpen={isModalEmissaoNfeOpen}
          onClose={() => setIsModalEmissaoNfeOpen(false)}
          modeloPreDefinido={modeloParaEmissao}
          onEmissaoSucesso={(doc) => {
            showToast(`✅ ${doc.modelo === '55_NFE' ? 'NF-e' : 'NFC-e'} Nº ${doc.numero} autorizada pela SEFAZ!`);
            setDocSelecionado(doc);
            setIsModalDanfeOpen(true);
          }}
        />
      )}

      {/* Modal Emissão MDF-e */}
      {isModalEmissaoMdfeOpen && (
        <ModalEmissaoMDFe
          isOpen={isModalEmissaoMdfeOpen}
          onClose={() => setIsModalEmissaoMdfeOpen(false)}
          onEmissaoSucesso={(doc) => {
            showToast(`✅ MDF-e Nº ${doc.numero} autorizado pela SEFAZ!`);
            setDocSelecionado(doc);
            setIsModalDanfeOpen(true);
          }}
        />
      )}

      {/* Modal Visualizador DANFE / DAMDFE */}
      {isModalDanfeOpen && (
        <ModalVisualizadorDanfe
          isOpen={isModalDanfeOpen}
          onClose={() => setIsModalDanfeOpen(false)}
          doc={docSelecionado}
        />
      )}

      {/* Modal Eventos (CC-e, Cancelamento, Encerramento MDF-e) */}
      {isModalEventoOpen && (
        <ModalCartaCorrecao
          isOpen={isModalEventoOpen}
          onClose={() => setIsModalEventoOpen(false)}
          tipoAcao={tipoEvento}
          doc={docSelecionado}
          onSuccess={(doc) => {
            showToast(`✅ Evento fiscal homologado com sucesso!`);
          }}
        />
      )}
    </div>
  );
};
