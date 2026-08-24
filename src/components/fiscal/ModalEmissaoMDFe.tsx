import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import {
  Truck,
  Send,
  Plus,
  CheckCircle2,
  X,
  FileText,
  MapPin,
  User,
  Package,
  Search,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  DocumentoFiscalItem,
  salvarDocumentoFiscal,
  getDocumentosFiscais,
} from '../../lib/dfe';
import { getCertificadoConfig } from '../../lib/certificadoA1';
import { TransporteService, NfeDocumentoItem } from '../../lib/transporte';

interface ModalEmissaoMDFeProps {
  isOpen: boolean;
  onClose: () => void;
  onEmissaoSucesso: (doc: DocumentoFiscalItem) => void;
}

export const ModalEmissaoMDFe: React.FC<ModalEmissaoMDFeProps> = ({
  isOpen,
  onClose,
  onEmissaoSucesso,
}) => {
  const certConfig = getCertificadoConfig();

  // Estados do MDF-e
  const [ufCarregamento, setUfCarregamento] = useState('MS');
  const [municipioCarregamento, setMunicipioCarregamento] = useState('DOURADOS');
  const [ufDescarregamento, setUfDescarregamento] = useState('MS');
  const [municipioDescarregamento, setMunicipioDescarregamento] = useState('CAMPO GRANDE');

  // Veículo & Motorista
  const [placaVeiculo, setPlacaVeiculo] = useState('RTE-8A99');
  const [renavamVeiculo, setRenavamVeiculo] = useState('01298371892');
  const [rntrc, setRntrc] = useState(certConfig.rntrcEmpresa || '09812345');
  const [motoristaNome, setMotoristaNome] = useState('JOAO PEDRO DE OLIVEIRA');
  const [motoristaCpf, setMotoristaCpf] = useState('123.456.789-00');
  const [pesoBrutoCargaKg, setPesoBrutoCargaKg] = useState<number>(1850.50);

  // Documentos fiscais carregados do sistema
  const [documentosDisponiveis, setDocumentosDisponiveis] = useState<NfeDocumentoItem[]>([]);
  const [buscaDoc, setBuscaDoc] = useState('');
  const [filtroCidade, setFiltroCidade] = useState('');
  const [filtroUf, setFiltroUf] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState<'TODOS' | 'HOJE' | '7_DIAS' | '30_DIAS'>('TODOS');
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Seleção de NF-e vinculadas
  const [chavesSelecionadas, setChavesSelecionadas] = useState<string[]>([]);
  const [isTransmitting, setIsTransmitting] = useState(false);

  // Cidades e UFs únicas disponíveis nos documentos
  const cidadesDisponiveis = useMemo(() => {
    const cidades = Array.from(new Set(documentosDisponiveis.map((d) => d.destinatario_cidade).filter(Boolean)));
    return cidades.sort();
  }, [documentosDisponiveis]);

  const ufsDisponiveis = useMemo(() => {
    const ufs = Array.from(new Set(documentosDisponiveis.map((d) => d.destinatario_uf).filter(Boolean)));
    return ufs.sort();
  }, [documentosDisponiveis]);

  useEffect(() => {
    if (!isOpen) return;

    const carregarDocs = async () => {
      setIsLoadingDocs(true);
      try {
        const docsBackend = await TransporteService.listarNfesDisponiveisTransporte();
        const dfeLocal = getDocumentosFiscais();

        const chavesExistentes = new Set(docsBackend.map((d: NfeDocumentoItem) => d.chave_acesso));
        const docsLocalFormatados: NfeDocumentoItem[] = dfeLocal
          .filter((d: DocumentoFiscalItem) => d.modelo === '55_NFE' && d.statusSefaz === 'AUTORIZADA')
          .filter((d: DocumentoFiscalItem) => !chavesExistentes.has(d.chaveAcesso) && !d.id.startsWith('DFE-') && !d.chaveAcesso?.includes('1234567800019055'))
          .map((d: DocumentoFiscalItem) => ({
            id: d.id,
            modelo: '55_NFE',
            numero: d.numero,
            serie: d.serie,
            chave_acesso: d.chaveAcesso,
            data_emissao: d.dataEmissao,
            destinatario_nome: d.destinatarioNome,
            destinatario_cpf_cnpj: d.destinatarioCpfCnpj,
            destinatario_cidade: d.destinatarioMunicipio || 'DOURADOS',
            destinatario_uf: d.destinatarioUf || 'MS',
            valor_total: d.valorTotal,
            status: d.statusSefaz,
            tipo_origem: 'DFE_LOCAL',
          }));

        const docsUnificados = [...docsBackend, ...docsLocalFormatados];
        setDocumentosDisponiveis(docsUnificados);

        if (chavesSelecionadas.length === 0 && docsUnificados.length === 1) {
          setChavesSelecionadas([docsUnificados[0].chave_acesso]);
        }
      } catch (err) {
        console.error('Erro ao carregar notas fiscais:', err);
      } finally {
        setIsLoadingDocs(false);
      }
    };

    carregarDocs();
  }, [isOpen]);

  const documentosFiltrados = useMemo(() => {
    const hoje = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];

    return documentosDisponiveis.filter((doc) => {
      if (filtroCidade && doc.destinatario_cidade.toUpperCase() !== filtroCidade.toUpperCase()) {
        return false;
      }
      if (filtroUf && doc.destinatario_uf.toUpperCase() !== filtroUf.toUpperCase()) {
        return false;
      }
      if (filtroPeriodo !== 'TODOS') {
        const dataDoc = doc.data_emissao;
        if (filtroPeriodo === 'HOJE') {
          if (!dataDoc.includes(hojeStr) && !dataDoc.includes(hoje.toLocaleDateString('pt-BR'))) {
            return false;
          }
        }
      }
      if (buscaDoc) {
        const q = buscaDoc.toLowerCase();
        const matchNum = String(doc.numero).includes(q);
        const matchDest = doc.destinatario_nome.toLowerCase().includes(q);
        const matchChave = doc.chave_acesso.toLowerCase().includes(q);
        const matchCidade = (doc.destinatario_cidade || '').toLowerCase().includes(q);
        const matchCpf = (doc.destinatario_cpf_cnpj || '').toLowerCase().includes(q);
        if (!matchNum && !matchDest && !matchChave && !matchCidade && !matchCpf) return false;
      }
      return true;
    });
  }, [documentosDisponiveis, buscaDoc, filtroCidade, filtroUf, filtroPeriodo]);

  // Valor total da carga somado das NF-es selecionadas
  const valorTotalCarga = documentosDisponiveis
    .filter((n) => chavesSelecionadas.includes(n.chave_acesso))
    .reduce((acc, n) => acc + n.valor_total, 0);

  const toggleChave = (chave: string) => {
    if (chavesSelecionadas.includes(chave)) {
      setChavesSelecionadas(chavesSelecionadas.filter((c) => c !== chave));
    } else {
      setChavesSelecionadas([...chavesSelecionadas, chave]);
    }
  };

  const handleToggleSelectAll = () => {
    const chavesVisiveis = documentosFiltrados.map((d) => d.chave_acesso);
    const todasSelecionadas = chavesVisiveis.every((ch) => chavesSelecionadas.includes(ch));
    if (todasSelecionadas) {
      setChavesSelecionadas(chavesSelecionadas.filter((ch) => !chavesVisiveis.includes(ch)));
    } else {
      const novas = Array.from(new Set([...chavesSelecionadas, ...chavesVisiveis]));
      setChavesSelecionadas(novas);
    }
  };

  const handleSelecionarPorCidade = (cidade: string) => {
    const docsCidade = documentosDisponiveis.filter((d) => d.destinatario_cidade.toUpperCase() === cidade.toUpperCase());
    const chavesCidade = docsCidade.map((d) => d.chave_acesso);
    setChavesSelecionadas(Array.from(new Set([...chavesSelecionadas, ...chavesCidade])));

    if (docsCidade.length > 0) {
      setMunicipioDescarregamento(cidade.toUpperCase());
      setUfDescarregamento(docsCidade[0].destinatario_uf.toUpperCase());
    }
  };

  const handleTransmitirMDFe = () => {
    if (!placaVeiculo || !motoristaNome || !motoristaCpf) {
      alert('Preencha os dados do Veículo e do Condutor.');
      return;
    }
    if (chavesSelecionadas.length === 0) {
      alert('Vincule pelo menos 1 documento ao Manifesto de Carga.');
      return;
    }

    setIsTransmitting(true);

    setTimeout(() => {
      setIsTransmitting(false);

      const proximoNumero = certConfig.mdfeNumeroAtual + 1;
      const serie = certConfig.mdfeSerie;
      const chaveAcesso = `5026081234567800019058${String(serie).padStart(3, '0')}${String(proximoNumero).padStart(9, '0')}1${Math.floor(10000000 + Math.random() * 90000000)}`;

      const novoDoc: DocumentoFiscalItem = {
        id: `DFE-MDFE-${Date.now()}`,
        modelo: '58_MDFE',
        numero: proximoNumero,
        serie,
        chaveAcesso,
        dataEmissao: new Date().toLocaleDateString('pt-BR'),
        horaEmissao: new Date().toLocaleTimeString('pt-BR'),
        naturezaOperacao: 'TRANSPORTE DE CARGA PROPRIA ENTRE FILIAIS E CLIENTES',
        tipoOperacao: 'SAIDA',
        destinatarioNome: `CARGA MULTIPLA - ${ufDescarregamento}`,
        destinatarioCpfCnpj: certConfig.cnpjTitular,
        destinatarioUf: ufDescarregamento,
        destinatarioMunicipio: municipioDescarregamento.toUpperCase(),
        valorProdutos: valorTotalCarga,
        valorFrete: 0,
        valorSeguro: 0,
        valorOutrasDespesas: 0,
        valorDesconto: 0,
        valorTotal: valorTotalCarga > 0 ? valorTotalCarga : 18500.0,
        valorBaseIcms: 0,
        valorIcms: 0,
        valorIcmsSt: 0,
        valorIpi: 0,
        valorPis: 0,
        valorCofins: 0,
        statusSefaz: 'AUTORIZADA',
        mensagemSefaz: '100 - Autorizado o uso do MDF-e (Manifesto Eletrônico de Documentos Fiscais)',
        protocoloAutorizacao: `15026000${Math.floor(100000 + Math.random() * 900000)}`,
        dataAutorizacao: new Date().toLocaleString('pt-BR'),
        cartasCorrecao: [],
        itens: [],
        dadosMdfe: {
          ufCarregamento,
          municipioCarregamento: municipioCarregamento.toUpperCase(),
          ufDescarregamento,
          municipioDescarregamento: municipioDescarregamento.toUpperCase(),
          placaVeiculo: placaVeiculo.toUpperCase(),
          renavamVeiculo,
          rntrc,
          motoristaNome: motoristaNome.toUpperCase(),
          motoristaCpf,
          pesoBrutoCargaKg,
          valorTotalCarga: valorTotalCarga > 0 ? valorTotalCarga : 18500.0,
          chavesNfeVinculadas: chavesSelecionadas,
        },
      };

      salvarDocumentoFiscal(novoDoc);
      onEmissaoSucesso(novoDoc);
      onClose();
    }, 1200);
  };

  const todasVisiveisSelecionadas =
    documentosFiltrados.length > 0 &&
    documentosFiltrados.every((d) => chavesSelecionadas.includes(d.chave_acesso));

  if (!isOpen) return null;

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
          maxWidth: '960px',
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
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
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
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Emissão de MDF-e (Manifesto de Carga — Modelo 58)
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Vinculação de NF-es emitidas pelo sistema, dados do veículo de tração e condutor para trânsito fiscal.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Rota & Percurso */}
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={15} color="#f59e0b" /> Rota & Percurso da Carga
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '80px 1.5fr 80px 1.5fr', gap: '12px' }}>
              <div>
                <label className="coliseu-label">UF Carreg.</label>
                <input
                  type="text"
                  className="coliseu-input"
                  value={ufCarregamento}
                  onChange={(e) => setUfCarregamento(e.target.value.toUpperCase())}
                  maxLength={2}
                  style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700 }}
                />
              </div>
              <div>
                <label className="coliseu-label">Município de Carregamento *</label>
                <input
                  type="text"
                  className="coliseu-input"
                  value={municipioCarregamento}
                  onChange={(e) => setMunicipioCarregamento(e.target.value.toUpperCase())}
                  style={{ height: '36px', width: '100%' }}
                />
              </div>
              <div>
                <label className="coliseu-label">UF Descar.</label>
                <input
                  type="text"
                  className="coliseu-input"
                  value={ufDescarregamento}
                  onChange={(e) => setUfDescarregamento(e.target.value.toUpperCase())}
                  maxLength={2}
                  style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700 }}
                />
              </div>
              <div>
                <label className="coliseu-label">Município de Descarregamento *</label>
                <input
                  type="text"
                  className="coliseu-input"
                  value={municipioDescarregamento}
                  onChange={(e) => setMunicipioDescarregamento(e.target.value.toUpperCase())}
                  style={{ height: '36px', width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Seleção de Notas Fiscais (NF-e) Transportadas */}
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    NF-e / CT-e Emitidas no Sistema ({chavesSelecionadas.length} de {documentosFiltrados.length} selecionadas):
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#f59e0b',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    {todasVisiveisSelecionadas ? <CheckSquare size={12} /> : <Square size={12} />}
                    {todasVisiveisSelecionadas ? 'Desmarcar Todas' : 'Selecionar Todas'}
                  </button>

                  {filtroCidade && (
                    <button
                      type="button"
                      onClick={() => handleSelecionarPorCidade(filtroCidade)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        cursor: 'pointer',
                      }}
                    >
                      ⚡ Vincular todas de {filtroCidade}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                    Valor Carga: {formatCurrency(valorTotalCarga)}
                  </span>
                </div>
              </div>

              {/* Barra de Filtros Inteligentes */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1fr 90px 110px auto',
                  gap: '8px',
                  backgroundColor: 'var(--surface-2)',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  alignItems: 'center',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="coliseu-input"
                    placeholder="Buscar NF-e, cliente, chave, CPF..."
                    value={buscaDoc}
                    onChange={(e) => setBuscaDoc(e.target.value)}
                    style={{ height: '28px', paddingLeft: '26px', fontSize: '11px' }}
                  />
                </div>

                <div>
                  <select
                    className="coliseu-input"
                    value={filtroCidade}
                    onChange={(e) => setFiltroCidade(e.target.value)}
                    style={{ height: '28px', fontSize: '11px' }}
                  >
                    <option value="">🏢 Todas as Cidades ({cidadesDisponiveis.length})</option>
                    {cidadesDisponiveis.map((cidade) => (
                      <option key={cidade} value={cidade}>
                        {cidade}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    className="coliseu-input"
                    value={filtroUf}
                    onChange={(e) => setFiltroUf(e.target.value)}
                    style={{ height: '28px', fontSize: '11px' }}
                  >
                    <option value="">UF (Todas)</option>
                    {ufsDisponiveis.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    className="coliseu-input"
                    value={filtroPeriodo}
                    onChange={(e) => setFiltroPeriodo(e.target.value as any)}
                    style={{ height: '28px', fontSize: '11px' }}
                  >
                    <option value="TODOS">📅 Todas as Datas</option>
                    <option value="HOJE">Hoje</option>
                    <option value="7_DIAS">Últimos 7 dias</option>
                    <option value="30_DIAS">Este Mês</option>
                  </select>
                </div>

                {(buscaDoc || filtroCidade || filtroUf || filtroPeriodo !== 'TODOS') && (
                  <button
                    type="button"
                    onClick={() => {
                      setBuscaDoc('');
                      setFiltroCidade('');
                      setFiltroUf('');
                      setFiltroPeriodo('TODOS');
                    }}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#ef4444',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '2px 6px',
                    }}
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            <div className="coliseu-table-container" style={{ maxHeight: '220px', overflowY: 'auto' }}>
              <table className="coliseu-table" style={{ fontSize: '11px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>Vincular</th>
                    <th style={{ width: '90px' }}>Tipo / Doc</th>
                    <th style={{ width: '100px' }}>Data Emissão</th>
                    <th>Destinatário</th>
                    <th style={{ width: '120px' }}>Destino (Cidade/UF)</th>
                    <th style={{ width: '110px', textAlign: 'right' }}>Valor Total</th>
                    <th>Chave de Acesso</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingDocs ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                        Carregando notas fiscais do banco de dados...
                      </td>
                    </tr>
                  ) : documentosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                        Nenhuma NF-e encontrada com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    documentosFiltrados.map((nfe) => {
                      const isChecked = chavesSelecionadas.includes(nfe.chave_acesso);

                      return (
                        <tr
                          key={nfe.id || nfe.chave_acesso}
                          style={{
                            backgroundColor: isChecked ? 'rgba(245, 158, 11, 0.06)' : 'transparent',
                            cursor: 'pointer',
                          }}
                          onClick={() => toggleChave(nfe.chave_acesso)}
                        >
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleChave(nfe.chave_acesso)}
                            />
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '1px 6px',
                                borderRadius: '3px',
                                fontSize: '10px',
                                fontWeight: 700,
                                backgroundColor: nfe.modelo === '57_CTE' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: nfe.modelo === '57_CTE' ? '#3b82f6' : '#d97706',
                              }}
                            >
                              {nfe.modelo === '57_CTE' ? 'CT-e' : 'NF-e'} {nfe.numero}
                            </span>
                          </td>
                          <td>{nfe.data_emissao}</td>
                          <td style={{ fontWeight: 600, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {nfe.destinatario_nome}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>
                            {nfe.destinatario_cidade || 'DOURADOS'}/{nfe.destinatario_uf || 'MS'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                            {formatCurrency(nfe.valor_total)}
                          </td>
                          <td className="text-mono" style={{ fontSize: '9px', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {nfe.chave_acesso}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Manifesto: <strong>{chavesSelecionadas.length}</strong> documento(s) vinculado(s) • Total:{' '}
            <strong style={{ color: '#10b981' }}>{formatCurrency(valorTotalCarga)}</strong>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={onClose} disabled={isTransmitting}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleTransmitirMDFe}
              disabled={isTransmitting}
              style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}
              leftIcon={<Send size={15} />}
            >
              {isTransmitting ? 'Transmitindo à SEFAZ...' : 'Transmitir MDF-e e Gerar DAMDFE'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
