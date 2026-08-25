import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import {
  FileText,
  Download,
  Search,
  RefreshCw,
  Copy,
  CheckCircle2,
  Package,
  Calendar,
  Layers,
  Archive,
  Eye,
  Check,
} from 'lucide-react';
import {
  fiscalCloudService,
  DocumentoFiscalConcentrador,
} from '../../lib/fiscalCloudService';
import { formatCurrency, formatDate, formatCnpjCpf } from '../../lib/formatters';

interface ConcentradorXmlsTabProps {
  modeloFiltroPadrao?: string;
}

export const ConcentradorXmlsTab: React.FC<ConcentradorXmlsTabProps> = ({
  modeloFiltroPadrao = 'TODOS',
}) => {
  const [documentos, setDocumentos] = useState<DocumentoFiscalConcentrador[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroModelo, setFiltroModelo] = useState<string>(modeloFiltroPadrao);
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [anoExport, setAnoExport] = useState<string>(new Date().getFullYear().toString());
  const [mesExport, setMesExport] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const carregarDocumentos = async () => {
    setIsLoading(true);
    try {
      const data = await fiscalCloudService.fetchDocumentosFiscais({
        modelo: filtroModelo,
        status: filtroStatus,
        busca: busca.trim(),
        limit: 200,
      });
      setDocumentos(data);
    } catch {
      setDocumentos([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarDocumentos();
  }, [filtroModelo, filtroStatus]);

  const handleCopiarChave = (chave: string) => {
    navigator.clipboard.writeText(chave);
    setCopiedKey(chave);
    showToast('Chave de acesso copiada!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleBaixarXml = async (chave: string) => {
    try {
      await fiscalCloudService.downloadXmlOficial(chave);
      showToast('Download do XML oficial iniciado!');
    } catch {
      showToast('Erro ao baixar XML.');
    }
  };

  const handleExportarMes = async () => {
    showToast(`📦 Gerando pacote fiscal consolidado (${mesExport}/${anoExport})...`);
    try {
      const res = await fiscalCloudService.exportarLoteMensal(anoExport, mesExport, filtroModelo);
      if (res.totalDocumentos === 0) {
        showToast('⚠️ Nenhum documento fiscal localizado no período selecionado.');
        return;
      }

      // Converte o lote em arquivo JSON/XML pronto para o contador
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Lote_Fiscal_${mesExport}_${anoExport}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`✅ Pacote com ${res.totalDocumentos} documentos fiscais exportado com sucesso!`);
    } catch (err: any) {
      showToast(`Erro na exportação: ${err.message}`);
    }
  };

  const docFiltrados = useMemo(() => {
    if (!busca) return documentos;
    const q = busca.toLowerCase().trim();
    return documentos.filter((d) => {
      return (
        d.chave_acesso.toLowerCase().includes(q) ||
        (d.destinatario_nome && d.destinatario_nome.toLowerCase().includes(q)) ||
        (d.destinatario_cpf_cnpj && d.destinatario_cpf_cnpj.includes(q)) ||
        String(d.numero).includes(q)
      );
    });
  }, [documentos, busca]);

  const totalValor = docFiltrados.reduce((acc, d) => acc + (Number(d.valor_total) || 0), 0);

  const getModeloLabel = (mod: string) => {
    switch (mod) {
      case '55':
        return 'NF-e (55)';
      case '65':
        return 'NFC-e (65)';
      case '57':
        return 'CT-e (57)';
      case '58':
        return 'MDF-e (58)';
      default:
        return `Mod. ${mod}`;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {toastMsg && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <CheckCircle2 size={16} color="#10b981" />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{toastMsg}</span>
          </div>
        </div>
      )}

      {/* Barra de Filtros e Exportação Contábil */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '320px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por Chave de Acesso, Destinatário, CPF/CNPJ ou Nº da Nota..."
              className="coliseu-input"
              style={{ height: '34px', paddingLeft: '32px', fontSize: '12px', width: '100%' }}
            />
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          </div>

          <select
            value={filtroModelo}
            onChange={(e) => setFiltroModelo(e.target.value)}
            className="coliseu-select"
            style={{ height: '34px', fontSize: '12px', fontWeight: 600, width: '130px' }}
          >
            <option value="TODOS">Todos Modelos</option>
            <option value="55">NF-e (55)</option>
            <option value="65">NFC-e (65)</option>
            <option value="57">CT-e (57)</option>
            <option value="58">MDF-e (58)</option>
          </select>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="coliseu-select"
            style={{ height: '34px', fontSize: '12px', fontWeight: 600, width: '130px' }}
          >
            <option value="TODOS">Todos Status</option>
            <option value="AUTORIZADO">Autorizados</option>
            <option value="CANCELADO">Cancelados</option>
            <option value="DENEGADO">Denegados</option>
            <option value="REJEITADO">Rejeitados</option>
          </select>

          <Button
            variant="secondary"
            size="sm"
            onClick={carregarDocumentos}
            disabled={isLoading}
            title="Recarregar concentrador de XMLs da VPS"
            style={{ height: '34px', padding: '0 10px' }}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </Button>
        </div>

        {/* Bloco de Exportação Mensal (.ZIP / Contabilidade) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={13} color="var(--text-muted)" />
            <select
              value={mesExport}
              onChange={(e) => setMesExport(e.target.value)}
              className="coliseu-select"
              style={{ height: '34px', fontSize: '11px', fontWeight: 700 }}
            >
              <option value="01">01 - Jan</option>
              <option value="02">02 - Fev</option>
              <option value="03">03 - Mar</option>
              <option value="04">04 - Abr</option>
              <option value="05">05 - Mai</option>
              <option value="06">06 - Jun</option>
              <option value="07">07 - Jul</option>
              <option value="08">08 - Ago</option>
              <option value="09">09 - Set</option>
              <option value="10">10 - Out</option>
              <option value="11">11 - Nov</option>
              <option value="12">12 - Dez</option>
            </select>
            <select
              value={anoExport}
              onChange={(e) => setAnoExport(e.target.value)}
              className="coliseu-select"
              style={{ height: '34px', fontSize: '11px', fontWeight: 700 }}
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportarMes}
            leftIcon={<Package size={13} />}
            style={{ height: '34px', fontSize: '11.5px', fontWeight: 700, backgroundColor: '#3b82f6' }}
            title="Compacta todos os XMLs do mês para envio à contabilidade"
          >
            Exportar Lote Mensal (.ZIP)
          </Button>
        </div>
      </div>

      {/* Faixa de Totais Rápidos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Exibindo <strong>{docFiltrados.length}</strong> documento(s) fiscal(is) no concentrador central
        </span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Valor Total Autorizado: <span style={{ color: '#10b981' }}>{formatCurrency(totalValor)}</span>
        </span>
      </div>

      {/* Tabela de XMLs Concentrados */}
      <div
        style={{
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: 'var(--surface-1)',
        }}
      >
        <div style={{ overflowX: 'auto', maxHeight: '480px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-2)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Modelo</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Série / Nº</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Emissão</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Destinatário</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>CPF / CNPJ</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Valor Total</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Chave de Acesso</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Status</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {docFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {isLoading ? 'Carregando documentos da VPS...' : 'Nenhum documento fiscal gravado no concentrador.'}
                  </td>
                </tr>
              ) : (
                docFiltrados.map((doc) => (
                  <tr
                    key={doc.id || doc.chave_acesso}
                    style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
                  >
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(59, 130, 246, 0.15)',
                          color: '#3b82f6',
                        }}
                      >
                        {getModeloLabel(doc.modelo)}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 700 }}>
                      Série {doc.serie} - Nº {String(doc.numero).padStart(6, '0')}
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                      {formatDate(doc.data_emissao, 'datetime')}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.destinatario_nome || 'CONSUMIDOR FINAL'}
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '11px' }}>
                      {formatCnpjCpf(doc.destinatario_cpf_cnpj)}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: 'monospace', color: '#10b981' }}>
                      {formatCurrency(doc.valor_total)}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          {doc.chave_acesso ? `${doc.chave_acesso.slice(0, 6)}...${doc.chave_acesso.slice(-6)}` : '-'}
                        </span>
                        {doc.chave_acesso && (
                          <button
                            onClick={() => handleCopiarChave(doc.chave_acesso)}
                            title="Copiar Chave de Acesso Completa (44 dígitos)"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                          >
                            {copiedKey === doc.chave_acesso ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor:
                            doc.status === 'AUTORIZADO'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : doc.status === 'CANCELADO'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : 'rgba(234, 179, 8, 0.15)',
                          color:
                            doc.status === 'AUTORIZADO'
                              ? '#10b981'
                              : doc.status === 'CANCELADO'
                              ? '#ef4444'
                              : '#eab308',
                        }}
                      >
                        {doc.status || 'AUTORIZADO'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleBaixarXml(doc.chave_acesso)}
                        leftIcon={<Download size={12} />}
                        style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
                        title="Baixar arquivo XML oficial da SEFAZ gravado no servidor"
                      >
                        Baixar XML
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
