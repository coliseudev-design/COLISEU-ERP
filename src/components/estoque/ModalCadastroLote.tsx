import React, { useState } from 'react';
import { Button } from '../ui/Button';
import {
  Boxes,
  Save,
  X,
  Sprout,
  ShieldCheck,
  Calendar,
  Layers,
  MapPin,
  FileText,
  User,
  FlaskConical,
  AlertTriangle,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import {
  LoteItem,
  SegmentoLote,
  StatusLote,
  CategoriaSemente,
  ClasseToxicolgica,
  ClasseAmbiental,
  salvarLote,
} from '../../lib/lotes';

interface ModalCadastroLoteProps {
  isOpen: boolean;
  onClose: () => void;
  loteEdicao?: LoteItem | null;
  onSaveSuccess: (lote: LoteItem) => void;
}

export const ModalCadastroLote: React.FC<ModalCadastroLoteProps> = ({
  isOpen,
  onClose,
  loteEdicao,
  onSaveSuccess,
}) => {
  const [segmento, setSegmento] = useState<SegmentoLote>(loteEdicao?.segmento || 'SEMENTES_GRAOS');
  const [numeroLote, setNumeroLote] = useState(loteEdicao?.numeroLote || '');
  const [produtoSku, setProdutoSku] = useState(loteEdicao?.produtoSku || '');
  const [produtoDescricao, setProdutoDescricao] = useState(loteEdicao?.produtoDescricao || '');
  const [quantidadeInicial, setQuantidadeInicial] = useState(loteEdicao?.quantidadeInicial || 100);
  const [quantidadeAtual, setQuantidadeAtual] = useState(loteEdicao?.quantidadeAtual || 100);
  const [unidadeMedida, setUnidadeMedida] = useState(loteEdicao?.unidadeMedida || 'SC');
  const [localizacaoWms, setLocalizacaoWms] = useState(loteEdicao?.localizacaoWms || 'DEPÓSITO SEMENTES - BARRACÃO 01');
  const [dataFabricacao, setDataFabricacao] = useState(loteEdicao?.dataFabricacao || new Date().toLocaleDateString('pt-BR'));
  const [dataValidade, setDataValidade] = useState(loteEdicao?.dataValidade || '18/08/2027');
  const [status, setStatus] = useState<StatusLote>(loteEdicao?.status || 'LIBERADO');
  const [custoUnitario, setCustoUnitario] = useState(loteEdicao?.custoUnitario || 0);
  const [precoVendaUnitario, setPrecoVendaUnitario] = useState(loteEdicao?.precoVendaUnitario || 0);

  // Campos Específicos para Sementes (MAPA / RENASEM)
  const [renasem, setRenasem] = useState(loteEdicao?.dadosSementes?.renasemProdutor || 'MS-04123/2026');
  const [especieCultivar, setEspecieCultivar] = useState(loteEdicao?.dadosSementes?.especieCultivar || 'SOJA - BRASMAX COMPASSO IPRO');
  const [categoria, setCategoria] = useState<CategoriaSemente>(loteEdicao?.dadosSementes?.categoria || 'C1');
  const [safra, setSafra] = useState(loteEdicao?.dadosSementes?.safra || '2025/2026');
  const [peneira, setPeneira] = useState(loteEdicao?.dadosSementes?.peneira || '6.0mm Redonda (P6.0R)');
  const [germinacao, setGerminacao] = useState(loteEdicao?.dadosSementes?.germinacaoPercent || 92.0);
  const [pureza, setPureza] = useState(loteEdicao?.dadosSementes?.purezaPercent || 99.8);
  const [vigor, setVigor] = useState(loteEdicao?.dadosSementes?.vigorPercent || 88.0);
  const [pms, setPms] = useState(loteEdicao?.dadosSementes?.pmsGramas || 165.40);
  const [tratamentoTSI, setTratamentoTSI] = useState(loteEdicao?.dadosSementes?.tratamentoTSI || 'CRUISER + MAXIM ADVANCED');
  const [numeroBAS, setNumeroBAS] = useState(loteEdicao?.dadosSementes?.numeroBAS || 'BAS-LAB-2026-98124');
  const [campoProducao, setCampoProducao] = useState(loteEdicao?.dadosSementes?.campoProducao || 'FAZENDA SANTA MARIA - TALHÃO 04');
  const [rtNome, setRtNome] = useState(loteEdicao?.dadosSementes?.responsavelTecnicoNome || 'ENG. AGR. RODRIGO MENDES');
  const [rtCrea, setRtCrea] = useState(loteEdicao?.dadosSementes?.responsavelTecnicoCrea || 'CREA-MS 14892/D');

  // Campos Específicos para Químicos & Defensivos (ANTT / PF / Exército / FISPQ)
  const [controladoPF, setControladoPF] = useState(loteEdicao?.dadosQuimicos?.controladoPoliciaFederal || false);
  const [licencaPF, setLicencaPF] = useState(loteEdicao?.dadosQuimicos?.licencaPoliciaFederal || 'DPF/MS-098812/2026');
  const [controladoEB, setControladoEB] = useState(loteEdicao?.dadosQuimicos?.controladoExercito || false);
  const [crEB, setCrEB] = useState(loteEdicao?.dadosQuimicos?.certificadoRegistroExercito || 'CR-EB-239912');
  const [receituarioAgronomico, setReceituarioAgronomico] = useState(loteEdicao?.dadosQuimicos?.receituarioAgronomicoObrigatorio || false);
  const [numeroOnu, setNumeroOnu] = useState(loteEdicao?.dadosQuimicos?.numeroOnu || '1263');
  const [classeRisco, setClasseRisco] = useState(loteEdicao?.dadosQuimicos?.classeRisco || '3 - Líquidos Inflamáveis');
  const [numeroRisco, setNumeroRisco] = useState(loteEdicao?.dadosQuimicos?.numeroRisco || '33');
  const [grupoEmbalagem, setGrupoEmbalagem] = useState<'I' | 'II' | 'III'>(loteEdicao?.dadosQuimicos?.grupoEmbalagem || 'II');
  const [nomeEmbarque, setNomeEmbarque] = useState(loteEdicao?.dadosQuimicos?.nomeApropriadoEmbarque || 'TINTA OU MATERIAL RELACIONADO COM TINTAS');
  const [principioAtivo, setPrincipioAtivo] = useState(loteEdicao?.dadosQuimicos?.principioAtivo || 'RESINA POLIÉSTER + ISOCIANATO');
  const [concentracao, setConcentracao] = useState(loteEdicao?.dadosQuimicos?.concentracao || '99.5%');
  const [grupoQuimico, setGrupoQuimico] = useState(loteEdicao?.dadosQuimicos?.grupoQuimico || 'HIDROCARBONETOS');
  const [densidade, setDensidade] = useState(loteEdicao?.dadosQuimicos?.densidadeGcm3 || 0.985);
  const [viscosidade, setViscosidade] = useState(loteEdicao?.dadosQuimicos?.viscosidadeSeg || 22.0);
  const [teorSolidos, setTeorSolidos] = useState(loteEdicao?.dadosQuimicos?.teorSolidosPercent || 48.0);
  const [ph, setPh] = useState(loteEdicao?.dadosQuimicos?.ph || 7.0);
  const [pontoFulgor, setPontoFulgor] = useState(loteEdicao?.dadosQuimicos?.pontoFulgorCelsius || 27.0);
  const [responsavelQuimico, setResponsavelQuimico] = useState(loteEdicao?.dadosQuimicos?.responsavelTecnicoQuimico || 'DR. MARCELO NOGUEIRA (CRQ IV)');
  const [crq, setCrq] = useState(loteEdicao?.dadosQuimicos?.crqNumero || 'CRQ-MS 042918');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!numeroLote || !produtoDescricao) {
      alert('Informe o Número do Lote e a Descrição do Produto.');
      return;
    }

    const isQuimico = segmento === 'QUIMICO_TINTAS' || segmento === 'DEFENSIVO_AGRICOLA';

    const novoLote: LoteItem = {
      id: loteEdicao?.id || `LOTE-${Date.now()}`,
      numeroLote: numeroLote.toUpperCase(),
      produtoSku: (produtoSku || (segmento === 'SEMENTES_GRAOS' ? 'SEM-001' : 'QUI-001')).toUpperCase(),
      produtoDescricao: produtoDescricao.toUpperCase(),
      segmento,
      dataFabricacao,
      dataValidade,
      diasParaVencer: 365,
      quantidadeInicial,
      quantidadeAtual,
      unidadeMedida: unidadeMedida.toUpperCase(),
      localizacaoWms: localizacaoWms.toUpperCase(),
      status,
      registroAnvisaMapa: segmento === 'SEMENTES_GRAOS' ? `MAPA ${renasem}` : isQuimico ? `ONU ${numeroOnu}` : undefined,
      custoUnitario,
      precoVendaUnitario,
      historicoMovimentacoes: loteEdicao?.historicoMovimentacoes || [
        {
          id: `M-${Date.now()}`,
          dataHora: new Date().toLocaleString('pt-BR'),
          tipo: 'ENTRADA_COMPRA',
          documentoRef: 'CADASTRO MANUAL',
          entidadeNome: 'ENTRADA DE ESTOQUE',
          quantidade: quantidadeAtual,
          unidade: unidadeMedida,
          saldoApos: quantidadeAtual,
        },
      ],
      dadosSementes:
        segmento === 'SEMENTES_GRAOS'
          ? {
              renasemProdutor: renasem.toUpperCase(),
              especieCultivar: especieCultivar.toUpperCase(),
              categoria,
              safra,
              peneira: peneira.toUpperCase(),
              germinacaoPercent: germinacao,
              purezaPercent: pureza,
              vigorPercent: vigor,
              pmsGramas: pms,
              tratamentoTSI: tratamentoTSI.toUpperCase(),
              numeroBAS: numeroBAS.toUpperCase(),
              dataAnaliseGerminacao: dataFabricacao,
              validadeTesteGerminacao: dataValidade,
              campoProducao: campoProducao.toUpperCase(),
              termoConformidadeNum: `TC-${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
              responsavelTecnicoNome: rtNome.toUpperCase(),
              responsavelTecnicoCrea: rtCrea.toUpperCase(),
            }
          : undefined,
      dadosQuimicos:
        isQuimico
          ? {
              controladoPoliciaFederal: controladoPF,
              licencaPoliciaFederal: controladoPF ? licencaPF.toUpperCase() : undefined,
              controladoExercito: controladoEB,
              certificadoRegistroExercito: controladoEB ? crEB.toUpperCase() : undefined,
              receituarioAgronomicoObrigatorio: receituarioAgronomico,
              numeroOnu,
              classeRisco: classeRisco.toUpperCase(),
              numeroRisco,
              grupoEmbalagem,
              nomeApropriadoEmbarque: nomeEmbarque.toUpperCase(),
              principioAtivo: principioAtivo.toUpperCase(),
              concentracao,
              grupoQuimico: grupoQuimico.toUpperCase(),
              densidadeGcm3: densidade,
              viscosidadeSeg: viscosidade,
              teorSolidosPercent: teorSolidos,
              ph,
              pontoFulgorCelsius: pontoFulgor,
              laudoCqNumero: `CQ-LAB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
              responsavelTecnicoQuimico: responsavelQuimico.toUpperCase(),
              crqNumero: crq.toUpperCase(),
            }
          : undefined,
    };

    salvarLote(novoLote);
    onSaveSuccess(novoLote);
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
          maxWidth: '920px',
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
            {segmento === 'SEMENTES_GRAOS' ? (
              <Sprout size={22} color="#10b981" />
            ) : segmento === 'QUIMICO_TINTAS' || segmento === 'DEFENSIVO_AGRICOLA' ? (
              <FlaskConical size={22} color="#f97316" />
            ) : (
              <Boxes size={22} color="#3b82f6" />
            )}
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {loteEdicao ? `Editar Lote: ${loteEdicao.numeroLote}` : 'Novo Cadastro de Lote & Rastreabilidade'}
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Controle de Validades, FEFO, Peneiras MAPA, Químicos Controlados PF/EB e FISPQ ANTT.
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
          {/* Segmento & Identificação Geral */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 180px 1fr 140px', gap: '10px' }}>
            <div>
              <label className="coliseu-label">Segmento do Lote *</label>
              <select
                className="coliseu-input"
                value={segmento}
                onChange={(e) => setSegmento(e.target.value as any)}
                style={{ height: '38px', width: '100%', fontWeight: 700 }}
              >
                <option value="SEMENTES_GRAOS">🌱 SEMENTES & GRÃOS (MAPA)</option>
                <option value="QUIMICO_TINTAS">🧪 QUÍMICO & TINTAS (ANTT/PF)</option>
                <option value="DEFENSIVO_AGRICOLA">🌾 DEFENSIVOS & AGROTÓXICOS</option>
                <option value="FARMACEUTICO">💊 FARMACÊUTICO (ANVISA)</option>
                <option value="ALIMENTICIO">🍞 ALIMENTÍCIO</option>
                <option value="GERAL">📦 GERAL</option>
              </select>
            </div>

            <div>
              <label className="coliseu-label">Número do Lote *</label>
              <input
                type="text"
                className="coliseu-input"
                value={numeroLote}
                onChange={(e) => setNumeroLote(e.target.value.toUpperCase())}
                placeholder="Ex: LT-QUI-2026-01"
                style={{ height: '38px', width: '100%', fontWeight: 700 }}
                required
              />
            </div>

            <div>
              <label className="coliseu-label">Descrição do Produto *</label>
              <input
                type="text"
                className="coliseu-input"
                value={produtoDescricao}
                onChange={(e) => setProdutoDescricao(e.target.value.toUpperCase())}
                placeholder="Ex: TOLUENO PURO GRAU INDUSTRIAL..."
                style={{ height: '38px', width: '100%' }}
                required
              />
            </div>

            <div>
              <label className="coliseu-label">Status CQ *</label>
              <select
                className="coliseu-input"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                style={{ height: '38px', width: '100%', fontWeight: 700 }}
              >
                <option value="LIBERADO">LIBERADO</option>
                <option value="QUARENTENA">QUARENTENA</option>
                <option value="REPROVADO">REPROVADO</option>
                <option value="ESGOTADO">ESGOTADO</option>
              </select>
            </div>
          </div>

          {/* Saldos, Datas e WMS */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 80px 140px 140px 1fr', gap: '10px' }}>
            <div>
              <label className="coliseu-label">Qtd Atual *</label>
              <input
                type="number"
                step="0.01"
                className="coliseu-input"
                value={quantidadeAtual}
                onChange={(e) => setQuantidadeAtual(parseFloat(e.target.value) || 0)}
                style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700 }}
                required
              />
            </div>

            <div>
              <label className="coliseu-label">Unidade</label>
              <select
                className="coliseu-input"
                value={unidadeMedida}
                onChange={(e) => setUnidadeMedida(e.target.value.toUpperCase())}
                style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700 }}
              >
                <option value="UN">UN</option>
                <option value="L">L</option>
                <option value="KG">KG</option>
                <option value="BAG">BAG</option>
                <option value="SC">SC</option>
                <option value="TAMBOR">TAMBOR</option>
              </select>
            </div>

            <div>
              <label className="coliseu-label">Data Fabricação</label>
              <input
                type="text"
                className="coliseu-input"
                value={dataFabricacao}
                onChange={(e) => setDataFabricacao(e.target.value)}
                placeholder="DD/MM/AAAA"
                style={{ height: '36px', width: '100%', textAlign: 'center' }}
              />
            </div>

            <div>
              <label className="coliseu-label">Data Validade *</label>
              <input
                type="text"
                className="coliseu-input"
                value={dataValidade}
                onChange={(e) => setDataValidade(e.target.value)}
                placeholder="DD/MM/AAAA"
                style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700, color: '#10b981' }}
                required
              />
            </div>

            <div>
              <label className="coliseu-label">Localização Armazém (WMS)</label>
              <input
                type="text"
                className="coliseu-input"
                value={localizacaoWms}
                onChange={(e) => setLocalizacaoWms(e.target.value.toUpperCase())}
                placeholder="Ex: ALMOXARIFADO QUÍMICO - BOX 02"
                style={{ height: '36px', width: '100%' }}
              />
            </div>
          </div>

          {/* PAINEL ESPECÍFICO DE QUÍMICOS, TINTAS & DEFENSIVOS (ANTT / PF / EXÉRCITO / FISPQ) */}
          {(segmento === 'QUIMICO_TINTAS' || segmento === 'DEFENSIVO_AGRICOLA') && (
            <div
              style={{
                backgroundColor: 'var(--surface-2)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f97316', fontWeight: 700, fontSize: '13px' }}>
                  <Flame size={16} /> Classificação ANTT (Produtos Perigosos), Órgãos de Controle (PF/EB) & FISPQ
                </div>

                <div style={{ display: 'flex', gap: '16px', fontSize: '11px', fontWeight: 600 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#ef4444' }}>
                    <input type="checkbox" checked={controladoPF} onChange={(e) => setControladoPF(e.target.checked)} />
                    Controlado Polícia Federal
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#d97706' }}>
                    <input type="checkbox" checked={controladoEB} onChange={(e) => setControladoEB(e.target.checked)} />
                    Controlado Exército
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#10b981' }}>
                    <input type="checkbox" checked={receituarioAgronomico} onChange={(e) => setReceituarioAgronomico(e.target.checked)} />
                    Receituário Agronômico
                  </label>
                </div>
              </div>

              {/* Classificação ANTT de Transporte */}
              <div style={{ display: 'grid', gridTemplateColumns: '100px 180px 100px 110px 1.5fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Nº ONU *</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={numeroOnu}
                    onChange={(e) => setNumeroOnu(e.target.value)}
                    placeholder="1263"
                    style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700, color: '#f97316' }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Classe de Risco *</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={classeRisco}
                    onChange={(e) => setClasseRisco(e.target.value.toUpperCase())}
                    placeholder="3 - Líquidos Inflamáveis"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Nº Risco</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={numeroRisco}
                    onChange={(e) => setNumeroRisco(e.target.value)}
                    placeholder="33"
                    style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Grupo Emb.</label>
                  <select
                    className="coliseu-input"
                    value={grupoEmbalagem}
                    onChange={(e) => setGrupoEmbalagem(e.target.value as any)}
                    style={{ height: '36px', width: '100%', fontWeight: 700, textAlign: 'center' }}
                  >
                    <option value="I">I (Alto)</option>
                    <option value="II">II (Médio)</option>
                    <option value="III">III (Baixo)</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Nome Apropriado para Embarque *</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={nomeEmbarque}
                    onChange={(e) => setNomeEmbarque(e.target.value.toUpperCase())}
                    placeholder="TINTA OU MATERIAL RELACIONADO COM TINTAS"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>
              </div>

              {/* Princípio Ativo e Especificações */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 120px 1.2fr 100px 100px', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Princípio Ativo / Composição</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={principioAtivo}
                    onChange={(e) => setPrincipioAtivo(e.target.value.toUpperCase())}
                    placeholder="GLIFOSATO OU RESINA POLIURETANO"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Concentração</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={concentracao}
                    onChange={(e) => setConcentracao(e.target.value)}
                    placeholder="480 G/L"
                    style={{ height: '36px', width: '100%', textAlign: 'center' }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Grupo Químico</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={grupoQuimico}
                    onChange={(e) => setGrupoQuimico(e.target.value.toUpperCase())}
                    placeholder="HIDROCARBONETO AROMÁTICO"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Densidade (g/cm³)</label>
                  <input
                    type="number"
                    step="0.001"
                    className="coliseu-input"
                    value={densidade}
                    onChange={(e) => setDensidade(parseFloat(e.target.value) || 0)}
                    style={{ height: '36px', width: '100%', textAlign: 'right' }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Ponto Fulgor (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="coliseu-input"
                    value={pontoFulgor}
                    onChange={(e) => setPontoFulgor(parseFloat(e.target.value) || 0)}
                    style={{ height: '36px', width: '100%', textAlign: 'right' }}
                  />
                </div>
              </div>

              {/* Responsável Técnico CRQ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 140px', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Químico Responsável (CQ)</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={responsavelQuimico}
                    onChange={(e) => setResponsavelQuimico(e.target.value.toUpperCase())}
                    placeholder="DR. MARCELO NOGUEIRA"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Nº CRQ / Região</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={crq}
                    onChange={(e) => setCrq(e.target.value.toUpperCase())}
                    placeholder="CRQ-MS 042918"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* PAINEL ESPECÍFICO DE SEMENTES & AGRONEGÓCIO (MAPA / RENASEM) */}
          {segmento === 'SEMENTES_GRAOS' && (
            <div
              style={{
                backgroundColor: 'var(--surface-2)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 700, fontSize: '13px' }}>
                <Sprout size={16} /> Certificação & Parâmetros Fisiológicos do Lote (MAPA / SNSM)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '160px 1.5fr 110px 100px 160px', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">RENASEM Produtor *</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={renasem}
                    onChange={(e) => setRenasem(e.target.value.toUpperCase())}
                    placeholder="MS-04123/2026"
                    style={{ height: '36px', width: '100%', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Espécie e Cultivar *</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={especieCultivar}
                    onChange={(e) => setEspecieCultivar(e.target.value.toUpperCase())}
                    placeholder="SOJA - BRASMAX COMPASSO IPRO"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Categoria *</label>
                  <select
                    className="coliseu-input"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as any)}
                    style={{ height: '36px', width: '100%', fontWeight: 700 }}
                  >
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                    <option value="BASICA">BÁSICA</option>
                    <option value="GENETICA">GENÉTICA</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Safra</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={safra}
                    onChange={(e) => setSafra(e.target.value)}
                    placeholder="2025/2026"
                    style={{ height: '36px', width: '100%', textAlign: 'center' }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Peneira / Calibre *</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={peneira}
                    onChange={(e) => setPeneira(e.target.value.toUpperCase())}
                    placeholder="6.0mm Redonda (P6.0R)"
                    style={{ height: '36px', width: '100%', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Índices Fisiológicos Laboratoriais */}
              <div style={{ display: 'grid', gridTemplateColumns: '110px 110px 110px 130px 1.5fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Germinação (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    className="coliseu-input"
                    value={germinacao}
                    onChange={(e) => setGerminacao(parseFloat(e.target.value) || 0)}
                    style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700, color: '#10b981' }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Pureza (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    className="coliseu-input"
                    value={pureza}
                    onChange={(e) => setPureza(parseFloat(e.target.value) || 0)}
                    style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Vigor (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="coliseu-input"
                    value={vigor}
                    onChange={(e) => setVigor(parseFloat(e.target.value) || 0)}
                    style={{ height: '36px', width: '100%', textAlign: 'center' }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">PMS (g) - Mil Sementes</label>
                  <input
                    type="number"
                    step="0.01"
                    className="coliseu-input"
                    value={pms}
                    onChange={(e) => setPms(parseFloat(e.target.value) || 0)}
                    style={{ height: '36px', width: '100%', textAlign: 'right', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Tratamento Industrial (TSI)</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={tratamentoTSI}
                    onChange={(e) => setTratamentoTSI(e.target.value.toUpperCase())}
                    placeholder="CRUISER + MAXIM ADVANCED"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>
              </div>

              {/* Laudo BAS e Responsável Técnico */}
              <div style={{ display: 'grid', gridTemplateColumns: '180px 1.5fr 1.2fr 140px', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Boletim BAS (Laudo)</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={numeroBAS}
                    onChange={(e) => setNumeroBAS(e.target.value.toUpperCase())}
                    placeholder="BAS-LAB-2026-98124"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Campo de Produção / Origem</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={campoProducao}
                    onChange={(e) => setCampoProducao(e.target.value.toUpperCase())}
                    placeholder="FAZENDA SANTA MARIA - TALHÃO 04"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Eng. Agrônomo (RT)</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={rtNome}
                    onChange={(e) => setRtNome(e.target.value.toUpperCase())}
                    placeholder="ENG. AGR. RODRIGO MENDES"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">CREA do RT</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={rtCrea}
                    onChange={(e) => setRtCrea(e.target.value.toUpperCase())}
                    placeholder="CREA-MS 14892/D"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer de Ação */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" leftIcon={<Save size={16} />}>
              {loteEdicao ? 'Salvar Alterações' : 'Cadastrar Lote & Ativar Rastreabilidade'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
