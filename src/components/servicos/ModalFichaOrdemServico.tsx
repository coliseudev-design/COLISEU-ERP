import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency, parseNumber } from '../../lib/formatters';
import {
  Wrench,
  Package,
  CheckSquare,
  FileText,
  DollarSign,
  User,
  Car,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  X,
  Clock,
  Printer,
  Sparkles,
  MapPin,
} from 'lucide-react';
import {
  OrdemServicoItem,
  ItemPecaOS,
  ItemServicoOS,
  ChecklistItem,
  StatusOS,
  salvarOrdemServico,
  gerarProximoNumeroOS,
  getDefaultChecklist,
} from '../../lib/ordensServico';
import migratedProdutosData from '../../data/migrated_produtos.json';

interface ModalFichaOrdemServicoProps {
  isOpen: boolean;
  onClose: () => void;
  ordemEdicao?: OrdemServicoItem | null;
  onSaveSuccess: (os: OrdemServicoItem) => void;
  onOpenImpressao: (os: OrdemServicoItem) => void;
}

export const ModalFichaOrdemServico: React.FC<ModalFichaOrdemServicoProps> = ({
  isOpen,
  onClose,
  ordemEdicao,
  onSaveSuccess,
  onOpenImpressao,
}) => {
  const [activeTab, setActiveTab] = useState<'DADOS' | 'PECAS' | 'SERVICOS' | 'CHECKLIST' | 'LAUDO' | 'TOTAIS'>('DADOS');

  // Estado da O.S.
  const [osData, setOsData] = useState<OrdemServicoItem>(() => {
    if (ordemEdicao) return JSON.parse(JSON.stringify(ordemEdicao));
    const next = gerarProximoNumeroOS();
    const hoje = new Date();
    const dataFormatada = hoje.toLocaleDateString('pt-BR');
    const horaFormatada = hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return {
      id: next.id,
      numeroOS: next.numeroOS,
      dataAbertura: dataFormatada,
      horaAbertura: horaFormatada,
      dataPrevisaoEntrega: dataFormatada,
      clienteNome: '',
      clienteCpfCnpj: '',
      clienteTelefone: '',
      clienteEmail: '',
      tipoObjeto: 'VEICULO',
      descricaoObjeto: '',
      marcaObjeto: '',
      modeloObjeto: '',
      placaOuSerie: '',
      corObjeto: '',
      kmOuHorimetro: '',
      acessoriosDeixados: '',
      defeitoRelatado: '',
      laudoTecnico: '',
      solucaoExecutada: '',
      tecnicoPrincipal: 'CARLOS SILVA',
      status: 'ORCAMENTO',
      prioridade: 'NORMAL',
      pecas: [],
      servicos: [],
      checklist: getDefaultChecklist(),
      totalPecas: 0,
      totalServicos: 0,
      desconto: 0,
      valorTotalOS: 0,
      garantiaDias: 90,
      termoGarantia: 'GARANTIA DE 90 DIAS SOBRE PEÇAS E SERVIÇOS, CONFORME ART. 26 DO CDC.',
      faturado: false,
    };
  });

  // Estado para adicionar nova peça
  const [novaPecaSku, setNovaPecaSku] = useState('');
  const [novaPecaDesc, setNovaPecaDesc] = useState('');
  const [novaPecaQtd, setNovaPecaQtd] = useState(1);
  const [novaPecaVlUnit, setNovaPecaVlUnit] = useState(0);

  // Estado para adicionar novo serviço
  const [novoServDesc, setNovoServDesc] = useState('');
  const [novoServHoras, setNovoServHoras] = useState(1.0);
  const [novoServVlUnit, setNovoServVlUnit] = useState(120.0);
  const [novoServTecnico, setNovoServTecnico] = useState('CARLOS SILVA');

  // Recalcular totais sempre que peças, serviços ou desconto mudarem
  useEffect(() => {
    const totalPecas = osData.pecas.reduce((acc, p) => acc + p.subtotal, 0);
    const totalServicos = osData.servicos.reduce((acc, s) => acc + s.subtotal, 0);
    const valorTotalOS = Math.max(0, totalPecas + totalServicos - (osData.desconto || 0));

    setOsData((prev) => ({
      ...prev,
      totalPecas,
      totalServicos,
      valorTotalOS,
    }));
  }, [osData.pecas, osData.servicos, osData.desconto]);

  if (!isOpen) return null;

  // Adicionar Peça
  const handleAdicionarPeca = () => {
    if (!novaPecaDesc) return;
    const subtotal = Math.round(novaPecaQtd * novaPecaVlUnit * 100) / 100;
    const item: ItemPecaOS = {
      id: `P-${Date.now()}`,
      sku: novaPecaSku || String(osData.pecas.length + 1).padStart(5, '0'),
      descricao: novaPecaDesc.toUpperCase(),
      quantidade: novaPecaQtd,
      unidade: 'UN',
      valorUnitario: novaPecaVlUnit,
      subtotal,
      localizacaoWms: 'DEPÓSITO - RUA A - PRAT 01',
    };

    setOsData((prev) => ({ ...prev, pecas: [...prev.pecas, item] }));
    setNovaPecaSku('');
    setNovaPecaDesc('');
    setNovaPecaQtd(1);
    setNovaPecaVlUnit(0);
  };

  // Remover Peça
  const handleRemoverPeca = (id: string) => {
    setOsData((prev) => ({ ...prev, pecas: prev.pecas.filter((p) => p.id !== id) }));
  };

  // Adicionar Serviço
  const handleAdicionarServico = () => {
    if (!novoServDesc) return;
    const subtotal = Math.round(novoServHoras * novoServVlUnit * 100) / 100;
    const item: ItemServicoOS = {
      id: `S-${Date.now()}`,
      codigo: `SRV-${String(osData.servicos.length + 1).padStart(2, '0')}`,
      descricao: novoServDesc.toUpperCase(),
      tempoHoras: novoServHoras,
      valorUnitario: novoServVlUnit,
      subtotal,
      tecnicoResponsavel: novoServTecnico.toUpperCase(),
    };

    setOsData((prev) => ({ ...prev, servicos: [...prev.servicos, item] }));
    setNovoServDesc('');
    setNovoServHoras(1.0);
  };

  // Remover Serviço
  const handleRemoverServico = (id: string) => {
    setOsData((prev) => ({ ...prev, servicos: prev.servicos.filter((s) => s.id !== id) }));
  };

  // Atualizar Checklist
  const handleUpdateChecklist = (id: string, status: ChecklistItem['status']) => {
    setOsData((prev) => ({
      ...prev,
      checklist: prev.checklist.map((c) => (c.id === id ? { ...c, status } : c)),
    }));
  };

  // Salvar O.S.
  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!osData.clienteNome) {
      alert('Por favor, informe o Nome do Cliente.');
      setActiveTab('DADOS');
      return;
    }
    if (!osData.descricaoObjeto) {
      alert('Por favor, informe a Descrição do Veículo ou Equipamento.');
      setActiveTab('DADOS');
      return;
    }

    salvarOrdemServico(osData);
    onSaveSuccess(osData);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1000px',
          maxHeight: '92vh',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        {/* Header do Modal */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--surface-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Wrench size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {ordemEdicao ? `Editar ${osData.numeroOS}` : `Nova Ordem de Serviço (${osData.numeroOS})`}
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor:
                      osData.status === 'ORCAMENTO'
                        ? 'rgba(234, 179, 8, 0.15)'
                        : osData.status === 'EM_EXECUCAO'
                        ? 'rgba(59, 130, 246, 0.15)'
                        : osData.status === 'CONCLUIDO' || osData.status === 'FATURADO'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'var(--surface-3)',
                    color:
                      osData.status === 'ORCAMENTO'
                        ? '#eab308'
                        : osData.status === 'EM_EXECUCAO'
                        ? '#3b82f6'
                        : osData.status === 'CONCLUIDO' || osData.status === 'FATURADO'
                        ? '#10b981'
                        : 'var(--text-secondary)',
                  }}
                >
                  {osData.status.replace('_', ' ')}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Abertura: {osData.dataAbertura} às {osData.horaAbertura} • Previsão: {osData.dataPrevisaoEntrega}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {ordemEdicao && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenImpressao(osData)}
                leftIcon={<Printer size={14} />}
              >
                Imprimir O.S.
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Barra de Abas */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-1)',
            padding: '0 12px',
            gap: '4px',
            overflowX: 'auto',
          }}
        >
          {[
            { key: 'DADOS', label: '1. Dados & Objeto', icon: <Car size={14} /> },
            { key: 'PECAS', label: `2. Peças (${osData.pecas.length})`, icon: <Package size={14} /> },
            { key: 'SERVICOS', label: `3. Serviços (${osData.servicos.length})`, icon: <Wrench size={14} /> },
            { key: 'CHECKLIST', label: '4. Checklist Entrada', icon: <CheckSquare size={14} /> },
            { key: 'LAUDO', label: '5. Laudo & Solução', icon: <FileText size={14} /> },
            { key: 'TOTAIS', label: '6. Faturamento', icon: <DollarSign size={14} /> },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 14px',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
                background: 'none',
                color: activeTab === tab.key ? '#3b82f6' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.key ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo das Abas com Scroll */}
        <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            {/* ABA 1: DADOS GERAIS & EQUIPAMENTO */}
            {activeTab === 'DADOS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="coliseu-label">Nome do Cliente *</label>
                    <input
                      type="text"
                      className="coliseu-input"
                      value={osData.clienteNome}
                      onChange={(e) => setOsData({ ...osData, clienteNome: e.target.value.toUpperCase() })}
                      required
                      placeholder="Ex: AGROPECUARIA PANTANAL LTDA"
                      style={{ height: '38px', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label className="coliseu-label">CPF / CNPJ</label>
                    <input
                      type="text"
                      className="coliseu-input"
                      value={osData.clienteCpfCnpj}
                      onChange={(e) => setOsData({ ...osData, clienteCpfCnpj: e.target.value })}
                      placeholder="00.000.000/0000-00"
                      style={{ height: '38px', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label className="coliseu-label">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      className="coliseu-input"
                      value={osData.clienteTelefone}
                      onChange={(e) => setOsData({ ...osData, clienteTelefone: e.target.value })}
                      placeholder="(67) 99999-0000"
                      style={{ height: '38px', width: '100%' }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--surface-2)',
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Car size={15} color="#3b82f6" /> Identificação do Veículo / Equipamento / Máquina
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label className="coliseu-label">Tipo de Objeto</label>
                      <select
                        className="coliseu-input"
                        value={osData.tipoObjeto}
                        onChange={(e) => setOsData({ ...osData, tipoObjeto: e.target.value as any })}
                        style={{ height: '38px', width: '100%' }}
                      >
                        <option value="VEICULO">Veículo / Caminhonete / Moto</option>
                        <option value="MAQUINA">Máquina / Compressor / Motor</option>
                        <option value="EQUIPAMENTO_TI">Informática / TI / Notebook</option>
                        <option value="ELETRODOMESTICO">Eletrodoméstico / Climatização</option>
                        <option value="OUTROS">Outros Equipamentos</option>
                      </select>
                    </div>

                    <div>
                      <label className="coliseu-label">Descrição do Objeto / Modelo *</label>
                      <input
                        type="text"
                        className="coliseu-input"
                        value={osData.descricaoObjeto}
                        onChange={(e) => setOsData({ ...osData, descricaoObjeto: e.target.value.toUpperCase() })}
                        required
                        placeholder="Ex: HILUX 2.8 DIESEL 4X4 ou COMPRESSOR 500L"
                        style={{ height: '38px', width: '100%' }}
                      />
                    </div>

                    <div>
                      <label className="coliseu-label">Marca / Fabricante</label>
                      <input
                        type="text"
                        className="coliseu-input"
                        value={osData.marcaObjeto}
                        onChange={(e) => setOsData({ ...osData, marcaObjeto: e.target.value.toUpperCase() })}
                        placeholder="TOYOTA / SCHULZ / DELL"
                        style={{ height: '38px', width: '100%' }}
                      />
                    </div>

                    <div>
                      <label className="coliseu-label">Placa ou Nº de Série</label>
                      <input
                        type="text"
                        className="coliseu-input"
                        value={osData.placaOuSerie}
                        onChange={(e) => setOsData({ ...osData, placaOuSerie: e.target.value.toUpperCase() })}
                        placeholder="RTE-4B12 ou SN-123456"
                        style={{ height: '38px', width: '100%', fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '12px' }}>
                    <div>
                      <label className="coliseu-label">Cor</label>
                      <input
                        type="text"
                        className="coliseu-input"
                        value={osData.corObjeto}
                        onChange={(e) => setOsData({ ...osData, corObjeto: e.target.value.toUpperCase() })}
                        placeholder="PRATA / PRETO / AZUL"
                        style={{ height: '38px', width: '100%' }}
                      />
                    </div>

                    <div>
                      <label className="coliseu-label">KM ou Horímetro</label>
                      <input
                        type="text"
                        className="coliseu-input"
                        value={osData.kmOuHorimetro}
                        onChange={(e) => setOsData({ ...osData, kmOuHorimetro: e.target.value.toUpperCase() })}
                        placeholder="84.250 KM ou 1.200 HORAS"
                        style={{ height: '38px', width: '100%' }}
                      />
                    </div>

                    <div>
                      <label className="coliseu-label">Acessórios Deixados com o Objeto</label>
                      <input
                        type="text"
                        className="coliseu-input"
                        value={osData.acessoriosDeixados}
                        onChange={(e) => setOsData({ ...osData, acessoriosDeixados: e.target.value.toUpperCase() })}
                        placeholder="Ex: CHAVE RESERVA, FONTE ORIGINAL, CABOS..."
                        style={{ height: '38px', width: '100%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Defeito Relatado e Gestão Operacional */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="coliseu-label">Defeito Relatado pelo Cliente *</label>
                    <textarea
                      className="coliseu-input"
                      value={osData.defeitoRelatado}
                      onChange={(e) => setOsData({ ...osData, defeitoRelatado: e.target.value.toUpperCase() })}
                      rows={2}
                      placeholder="Descreva o problema e sintomas informados pelo cliente..."
                      style={{ width: '100%', resize: 'none', padding: '8px' }}
                    />
                  </div>

                  <div>
                    <label className="coliseu-label">Status da O.S.</label>
                    <select
                      className="coliseu-input"
                      value={osData.status}
                      onChange={(e) => setOsData({ ...osData, status: e.target.value as any })}
                      style={{ height: '38px', width: '100%', fontWeight: 600 }}
                    >
                      <option value="ORCAMENTO">Orçamento (Aguardando)</option>
                      <option value="APROVADO">Aprovado pelo Cliente</option>
                      <option value="EM_EXECUCAO">Em Execução</option>
                      <option value="AGUARDANDO_PECAS">Aguardando Peças</option>
                      <option value="TESTES_QUALIDADE">Testes de Qualidade</option>
                      <option value="CONCLUIDO">Concluído (Pronto)</option>
                      <option value="FATURADO">Faturado / Entregue</option>
                      <option value="CANCELADO">Cancelado</option>
                    </select>
                  </div>

                  <div>
                    <label className="coliseu-label">Técnico Responsável</label>
                    <select
                      className="coliseu-input"
                      value={osData.tecnicoPrincipal}
                      onChange={(e) => setOsData({ ...osData, tecnicoPrincipal: e.target.value })}
                      style={{ height: '38px', width: '100%' }}
                    >
                      <option value="CARLOS SILVA">CARLOS SILVA (MECÂNICA)</option>
                      <option value="RICARDO OLIVEIRA">RICARDO OLIVEIRA (PNEUMÁTICA)</option>
                      <option value="FELIPE ANDRADE">FELIPE ANDRADE (ELÉTRICA/TI)</option>
                      <option value="MARCOS SOUZA">MARCOS SOUZA (GERAL)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: PEÇAS & MATERIAIS */}
            {activeTab === 'PECAS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 2fr 90px 120px auto',
                    gap: '8px',
                    alignItems: 'flex-end',
                    backgroundColor: 'var(--surface-2)',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <label className="coliseu-label" style={{ fontSize: '11px' }}>SKU / Código</label>
                    <input
                      type="text"
                      className="coliseu-input"
                      value={novaPecaSku}
                      onChange={(e) => setNovaPecaSku(e.target.value.toUpperCase())}
                      placeholder="00004"
                      style={{ height: '34px', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label className="coliseu-label" style={{ fontSize: '11px' }}>Descrição da Peça / Produto *</label>
                    <input
                      type="text"
                      className="coliseu-input"
                      value={novaPecaDesc}
                      onChange={(e) => setNovaPecaDesc(e.target.value.toUpperCase())}
                      placeholder="Ex: PASTILHA DE FREIO DIANTEIRA"
                      style={{ height: '34px', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label className="coliseu-label" style={{ fontSize: '11px' }}>Quantidade</label>
                    <input
                      type="number"
                      min="1"
                      className="coliseu-input"
                      value={novaPecaQtd}
                      onChange={(e) => setNovaPecaQtd(parseInt(e.target.value, 10) || 1)}
                      style={{ height: '34px', width: '100%', textAlign: 'center' }}
                    />
                  </div>
                  <div>
                    <label className="coliseu-label" style={{ fontSize: '11px' }}>Vl. Unitário (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="coliseu-input"
                      value={novaPecaVlUnit}
                      onChange={(e) => setNovaPecaVlUnit(parseFloat(e.target.value) || 0)}
                      style={{ height: '34px', width: '100%', textAlign: 'right' }}
                    />
                  </div>
                  <Button type="button" variant="primary" onClick={handleAdicionarPeca} style={{ height: '34px' }}>
                    <Plus size={15} /> Adicionar
                  </Button>
                </div>

                <div className="coliseu-table-container">
                  <table className="coliseu-table" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '90px' }}>SKU</th>
                        <th>Descrição da Peça Aplicada</th>
                        <th style={{ width: '160px' }}>Local WMS</th>
                        <th style={{ width: '80px', textAlign: 'center' }}>Qtd</th>
                        <th style={{ width: '110px', textAlign: 'right' }}>Vl. Unitário</th>
                        <th style={{ width: '110px', textAlign: 'right' }}>Subtotal</th>
                        <th style={{ width: '60px', textAlign: 'center' }}>Remover</th>
                      </tr>
                    </thead>
                    <tbody>
                      {osData.pecas.map((peca) => (
                        <tr key={peca.id}>
                          <td style={{ fontWeight: 700, color: 'var(--text-link)', fontSize: '11px' }}>{peca.sku}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{peca.descricao}</td>
                          <td style={{ color: '#10b981', fontSize: '11px' }}>📍 {peca.localizacaoWms || 'DEPÓSITO - RUA A'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{peca.quantidade} {peca.unidade}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(peca.valorUnitario)}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {formatCurrency(peca.subtotal)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoverPeca(peca.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {osData.pecas.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            Nenhuma peça ou material adicionado a esta Ordem de Serviço.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Total de Peças: {formatCurrency(osData.totalPecas)}
                </div>
              </div>
            )}

            {/* ABA 3: SERVIÇOS & MÃO DE OBRA */}
            {activeTab === 'SERVICOS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 100px 120px 1.5fr auto',
                    gap: '8px',
                    alignItems: 'flex-end',
                    backgroundColor: 'var(--surface-2)',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <label className="coliseu-label" style={{ fontSize: '11px' }}>Descrição do Serviço / Mão de Obra *</label>
                    <input
                      type="text"
                      className="coliseu-input"
                      value={novoServDesc}
                      onChange={(e) => setNovoServDesc(e.target.value.toUpperCase())}
                      placeholder="Ex: TROCA DE PASTILHAS E SANGRIA"
                      style={{ height: '34px', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label className="coliseu-label" style={{ fontSize: '11px' }}>Horas (h)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      className="coliseu-input"
                      value={novoServHoras}
                      onChange={(e) => setNovoServHoras(parseFloat(e.target.value) || 1)}
                      style={{ height: '34px', width: '100%', textAlign: 'center' }}
                    />
                  </div>
                  <div>
                    <label className="coliseu-label" style={{ fontSize: '11px' }}>Vl. Hora / Serviço (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="coliseu-input"
                      value={novoServVlUnit}
                      onChange={(e) => setNovoServVlUnit(parseFloat(e.target.value) || 0)}
                      style={{ height: '34px', width: '100%', textAlign: 'right' }}
                    />
                  </div>
                  <div>
                    <label className="coliseu-label" style={{ fontSize: '11px' }}>Técnico Executor</label>
                    <input
                      type="text"
                      className="coliseu-input"
                      value={novoServTecnico}
                      onChange={(e) => setNovoServTecnico(e.target.value.toUpperCase())}
                      placeholder="CARLOS SILVA"
                      style={{ height: '34px', width: '100%' }}
                    />
                  </div>
                  <Button type="button" variant="primary" onClick={handleAdicionarServico} style={{ height: '34px' }}>
                    <Plus size={15} /> Adicionar
                  </Button>
                </div>

                <div className="coliseu-table-container">
                  <table className="coliseu-table" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '90px' }}>Código</th>
                        <th>Descrição do Serviço Executado</th>
                        <th style={{ width: '140px' }}>Técnico</th>
                        <th style={{ width: '90px', textAlign: 'center' }}>Tempo (h)</th>
                        <th style={{ width: '110px', textAlign: 'right' }}>Vl. Hora</th>
                        <th style={{ width: '110px', textAlign: 'right' }}>Subtotal</th>
                        <th style={{ width: '60px', textAlign: 'center' }}>Remover</th>
                      </tr>
                    </thead>
                    <tbody>
                      {osData.servicos.map((srv) => (
                        <tr key={srv.id}>
                          <td style={{ fontWeight: 700, color: 'var(--text-link)', fontSize: '11px' }}>{srv.codigo}</td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{srv.descricao}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{srv.tecnicoResponsavel}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{srv.tempoHoras} h</td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(srv.valorUnitario)}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {formatCurrency(srv.subtotal)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoverServico(srv.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {osData.servicos.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            Nenhum serviço ou mão de obra cadastrado nesta O.S.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Total de Serviços: {formatCurrency(osData.totalServicos)}
                </div>
              </div>
            )}

            {/* ABA 4: CHECKLIST DE ENTRADA */}
            {activeTab === 'CHECKLIST' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Inspeção visual de avarias pré-existentes na entrada do veículo/equipamento na empresa:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {osData.checklist.map((chk) => (
                    <div
                      key={chk.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: 'var(--surface-2)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {chk.item}
                      </span>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {(['OK', 'AVARIADO', 'NAO_APLICA'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleUpdateChecklist(chk.id, st)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              backgroundColor:
                                chk.status === st
                                  ? st === 'OK'
                                    ? '#10b981'
                                    : st === 'AVARIADO'
                                    ? '#ef4444'
                                    : 'var(--surface-3)'
                                  : 'var(--surface-1)',
                              color: chk.status === st ? '#ffffff' : 'var(--text-muted)',
                            }}
                          >
                            {st === 'OK' ? '✓ Conforme' : st === 'AVARIADO' ? '⚠️ Avariado' : 'N/A'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ABA 5: LAUDO TÉCNICO & SOLUÇÃO */}
            {activeTab === 'LAUDO' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="coliseu-label">Laudo Técnico & Diagnóstico de Defeito *</label>
                  <textarea
                    className="coliseu-input"
                    rows={4}
                    value={osData.laudoTecnico}
                    onChange={(e) => setOsData({ ...osData, laudoTecnico: e.target.value.toUpperCase() })}
                    placeholder="Descreva detalhadamente a análise técnica, testes realizados e causa raiz do defeito..."
                    style={{ width: '100%', resize: 'none', padding: '10px' }}
                  />
                </div>

                <div>
                  <label className="coliseu-label">Solução Executada & Reparos Realizados</label>
                  <textarea
                    className="coliseu-input"
                    rows={4}
                    value={osData.solucaoExecutada}
                    onChange={(e) => setOsData({ ...osData, solucaoExecutada: e.target.value.toUpperCase() })}
                    placeholder="Descreva as intervenções realizadas, substituições de peças e calibrações..."
                    style={{ width: '100%', resize: 'none', padding: '10px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '12px' }}>
                  <div>
                    <label className="coliseu-label">Garantia (Dias)</label>
                    <input
                      type="number"
                      className="coliseu-input"
                      value={osData.garantiaDias}
                      onChange={(e) => setOsData({ ...osData, garantiaDias: parseInt(e.target.value, 10) || 90 })}
                      style={{ height: '38px', width: '100%', textAlign: 'center', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label className="coliseu-label">Termo de Garantia</label>
                    <input
                      type="text"
                      className="coliseu-input"
                      value={osData.termoGarantia}
                      onChange={(e) => setOsData({ ...osData, termoGarantia: e.target.value.toUpperCase() })}
                      style={{ height: '38px', width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ABA 6: TOTAIS & FATURAMENTO */}
            {activeTab === 'TOTAIS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    backgroundColor: 'var(--surface-2)',
                    padding: '18px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Subtotal Peças e Materiais:</span>
                    <strong style={{ fontFamily: 'monospace' }}>{formatCurrency(osData.totalPecas)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Subtotal Mão de Obra e Serviços:</span>
                    <strong style={{ fontFamily: 'monospace' }}>{formatCurrency(osData.totalServicos)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Desconto Comercial (R$):</span>
                    <input
                      type="number"
                      step="0.01"
                      value={osData.desconto}
                      onChange={(e) => setOsData({ ...osData, desconto: parseFloat(e.target.value) || 0 })}
                      className="coliseu-input"
                      style={{ width: '130px', height: '34px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>VALOR TOTAL DA O.S.:</span>
                    <span style={{ fontSize: '22px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                      {formatCurrency(osData.valorTotalOS)}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    padding: '14px',
                    backgroundColor: osData.faturado ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {osData.faturado ? '✓ O.S. Faturada no Financeiro' : 'O.S. Pronta para Faturamento'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {osData.faturado
                        ? `Faturamento realizado em ${osData.faturamentoData} via ${osData.faturamentoForma}`
                        : 'Ao concluir o serviço, você pode faturar e lançar automaticamente no Contas a Receber.'}
                    </div>
                  </div>

                  {!osData.faturado && (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        setOsData((prev) => ({
                          ...prev,
                          status: 'FATURADO',
                          faturado: true,
                          faturamentoData: new Date().toLocaleDateString('pt-BR'),
                          faturamentoForma: 'PIX / CARTÃO',
                        }));
                      }}
                      leftIcon={<CheckCircle2 size={16} />}
                    >
                      Faturar no Financeiro
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer de Ações */}
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--surface-2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
              Total: {formatCurrency(osData.valorTotalOS)}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button variant="secondary" type="button" onClick={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" leftIcon={<Save size={16} />}>
                Salvar Ordem de Serviço
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
