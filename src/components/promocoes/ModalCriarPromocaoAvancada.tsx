import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import {
  Tag,
  Save,
  X,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Barcode,
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  Percent,
  DollarSign,
} from 'lucide-react';
import {
  CampanhaPromocional,
  MecanicaPromocao,
  ItemPromocionalRegra,
  salvarCampanhaPromocional,
} from '../../lib/promocoesAvancadas';

interface ModalCriarPromocaoAvancadaProps {
  isOpen: boolean;
  onClose: () => void;
  campanhaEdicao?: CampanhaPromocional | null;
  onSaveSuccess: (campanha: CampanhaPromocional) => void;
}

const MOCK_PRODUTOS_CATALOGO = [
  { id: 'prod-001', codigoSku: 'VERNIZ-PU-8100', codigoBarras: '7891991000803', descricao: 'Verniz Poliuretano Alto Sólidos 5L', precoVenda: 200.00, marca: 'CORAL', categoria: 'TINTAS AUTOMOTIVAS' },
  { id: 'prod-002', codigoSku: 'PRIMER-EP-310', codigoBarras: '7896006700018', descricao: 'Primer Epóxi Cinza Automotivo 3.6L', precoVenda: 150.00, marca: 'CORAL', categoria: 'TINTAS AUTOMOTIVAS' },
  { id: 'prod-003', codigoSku: 'TINTA-BASE-POL', codigoBarras: '7896006700025', descricao: 'Tinta Base Poliéster Prata Lunar 900ml', precoVenda: 130.00, marca: 'LAZZURIL', categoria: 'TINTAS AUTOMOTIVAS' },
  { id: 'prod-004', codigoSku: 'DILUENTE-PU-500', codigoBarras: '7891000240105', descricao: 'Diluente para Poliuretano e Poliéster 5L', precoVenda: 90.00, marca: 'CORAL', categoria: 'SOLVENTES & QUÍMICOS' },
  { id: 'prod-005', codigoSku: 'MASSA-PLAST-1KG', codigoBarras: '7891000300052', descricao: 'Massa Plástica com Catalisador 1kg', precoVenda: 35.00, marca: 'IBERÊ', categoria: 'COMPLEMENTOS' },
  { id: 'prod-006', codigoSku: 'LIXA-AGUA-600', codigoBarras: '7896006700100', descricao: 'Lixa d Água Grão 600 Folha', precoVenda: 5.50, marca: '3M', categoria: 'ABRASIVOS' },
];

export const ModalCriarPromocaoAvancada: React.FC<ModalCriarPromocaoAvancadaProps> = ({
  isOpen,
  onClose,
  campanhaEdicao,
  onSaveSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'MECANICA' | 'ITENS' | 'VIGENCIA' | 'CONDICOES'>('MECANICA');

  // Estados
  const [titulo, setTitulo] = useState(campanhaEdicao?.titulo || '');
  const [descricao, setDescricao] = useState(campanhaEdicao?.descricao || '');
  const [mecanica, setMecanica] = useState<MecanicaPromocao>(campanhaEdicao?.mecanica || 'DESCONTO_ITEM');
  
  // Alvos
  const [marcaAlvo, setMarcaAlvo] = useState(campanhaEdicao?.marcaAlvo || 'CORAL');
  const [categoriaAlvo, setCategoriaAlvo] = useState(campanhaEdicao?.categoriaAlvo || 'TINTAS AUTOMOTIVAS');
  const [percentualDescontoGeral, setPercentualDescontoGeral] = useState(campanhaEdicao?.percentualDescontoGeral || 15.0);
  const [leveQtd, setLeveQtd] = useState(campanhaEdicao?.leveQuantidade || 3);
  const [pagueQtd, setPagueQtd] = useState(campanhaEdicao?.pagueQuantidade || 2);
  const [codigoCupom, setCodigoCupom] = useState(campanhaEdicao?.codigoCupom || 'OFERTA10');

  // Itens Promocionais
  const [itens, setItens] = useState<ItemPromocionalRegra[]>(campanhaEdicao?.itensPromocionais || []);
  const [barcodeInput, setBarcodeInput] = useState('');

  // Vigência
  const [dataInicio, setDataInicio] = useState(campanhaEdicao?.condicoes.dataInicio || '18/08/2026');
  const [dataFim, setDataFim] = useState(campanhaEdicao?.condicoes.dataFim || '31/08/2026');
  const [horaInicio, setHoraInicio] = useState(campanhaEdicao?.condicoes.horaInicio || '08:00');
  const [horaFim, setHoraFim] = useState(campanhaEdicao?.condicoes.horaFim || '20:00');
  const [diasSemana, setDiasSemana] = useState<number[]>(campanhaEdicao?.condicoes.diasSemanaHabilitados || [0, 1, 2, 3, 4, 5, 6]);

  // Condições
  const [valorMinimoPedido, setValorMinimoPedido] = useState(campanhaEdicao?.condicoes.valorMinimoPedido || 0);
  const [limiteUsosPorCliente, setLimiteUsosPorCliente] = useState(campanhaEdicao?.condicoes.limiteUsosPorCliente || 0);
  const [acumulativa, setAcumulativa] = useState(campanhaEdicao?.condicoes.acumulativaComOutras ?? false);

  if (!isOpen) return null;

  const handleAddProdutoPorBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const match = MOCK_PRODUTOS_CATALOGO.find(
      (p) => p.codigoBarras === barcodeInput.trim() || p.codigoSku.toUpperCase() === barcodeInput.trim().toUpperCase()
    );

    if (match) {
      if (itens.some((i) => i.produtoId === match.id)) {
        alert('Este produto já foi adicionado na promoção.');
        setBarcodeInput('');
        return;
      }

      const precoPromocional = Math.round(match.precoVenda * 0.85 * 100) / 100;
      const novoItem: ItemPromocionalRegra = {
        produtoId: match.id,
        codigoSku: match.codigoSku,
        codigoBarras: match.codigoBarras,
        descricao: match.descricao,
        precoDeTabela: match.precoVenda,
        precoPromocional: precoPromocional,
        percentualDesconto: 15.0,
      };

      setItens([...itens, novoItem]);
      setBarcodeInput('');
    } else {
      alert(`Produto com código/barras '${barcodeInput}' não encontrado no catálogo.`);
    }
  };

  const handleUpdateItemPreco = (index: number, novoPrecoPromocional: number) => {
    const atualizados = [...itens];
    const item = atualizados[index];
    item.precoPromocional = novoPrecoPromocional;
    item.percentualDesconto = Math.round(((item.precoDeTabela - novoPrecoPromocional) / item.precoDeTabela) * 1000) / 10;
    setItens(atualizados);
  };

  const handleRemoveItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const toggleDiaSemana = (dia: number) => {
    if (diasSemana.includes(dia)) {
      setDiasSemana(diasSemana.filter((d) => d !== dia));
    } else {
      setDiasSemana([...diasSemana, dia]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo) {
      alert('Informe o título da campanha promocional.');
      return;
    }

    const campanha: CampanhaPromocional = {
      id: campanhaEdicao?.id || `PROMO-${Date.now()}`,
      codigo: campanhaEdicao?.codigo || `OFERTA-00${Math.floor(10 + Math.random() * 90)}`,
      titulo: titulo.toUpperCase(),
      descricao,
      mecanica,
      status: campanhaEdicao?.status || 'ATIVA',
      marcaAlvo: mecanica === 'DESCONTO_MARCA' ? marcaAlvo.toUpperCase() : undefined,
      categoriaAlvo: mecanica === 'DESCONTO_CATEGORIA' ? categoriaAlvo.toUpperCase() : undefined,
      percentualDescontoGeral: (mecanica === 'DESCONTO_MARCA' || mecanica === 'DESCONTO_CATEGORIA' || mecanica === 'CUPOM_DESCONTO') ? percentualDescontoGeral : undefined,
      leveQuantidade: mecanica === 'LEVE_X_PAGUE_Y' ? leveQtd : undefined,
      pagueQuantidade: mecanica === 'LEVE_X_PAGUE_Y' ? pagueQtd : undefined,
      codigoCupom: mecanica === 'CUPOM_DESCONTO' ? codigoCupom.toUpperCase() : undefined,
      itensPromocionais: itens,
      condicoes: {
        dataInicio,
        dataFim,
        horaInicio,
        horaFim,
        diasSemanaHabilitados: diasSemana,
        valorMinimoPedido: valorMinimoPedido > 0 ? valorMinimoPedido : undefined,
        limiteUsosPorCliente: limiteUsosPorCliente > 0 ? limiteUsosPorCliente : undefined,
        acumulativaComOutras: acumulativa,
      },
      totalVendasImpactadas: campanhaEdicao?.totalVendasImpactadas || 0,
      totalDescontoConcedido: campanhaEdicao?.totalDescontoConcedido || 0,
      qtdUsosNoCaixa: campanhaEdicao?.qtdUsosNoCaixa || 0,
    };

    salvarCampanhaPromocional(campanha);
    onSaveSuccess(campanha);
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
          maxWidth: '900px',
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
            <Tag size={20} color="#f59e0b" />
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {campanhaEdicao ? `Editar Campanha: ${campanhaEdicao.titulo}` : 'Criar Nova Campanha Promocional & Ofertas'}
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Configuração avançada por Item, Marca, Categoria, Leve X Pague Y, Atacado ou Cupom.
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

        {/* Abas */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-2)', padding: '0 16px' }}>
          {[
            { key: 'MECANICA', label: '1. Tipo & Mecânica da Oferta' },
            { key: 'ITENS', label: '2. Itens & Abrangência' },
            { key: 'VIGENCIA', label: '3. Vigência, Horários & Dias' },
            { key: 'CONDICOES', label: '4. Condições & Regras de Checkout' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: '10px 14px',
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* ABA 1: TIPO & MECÂNICA */}
          {activeTab === 'MECANICA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="coliseu-label">Título da Campanha Promocional *</label>
                <input
                  type="text"
                  className="coliseu-input"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value.toUpperCase())}
                  placeholder="Ex: FESTIVAL DE TINTAS AUTOMOTIVAS - 20% OFF"
                  style={{ height: '38px', width: '100%', fontWeight: 700 }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                <div>
                  <label className="coliseu-label">Mecânica Promocional *</label>
                  <select
                    className="coliseu-input"
                    value={mecanica}
                    onChange={(e) => setMecanica(e.target.value as any)}
                    style={{ height: '38px', width: '100%', fontWeight: 700 }}
                  >
                    <option value="DESCONTO_ITEM">🏷️ Desconto por Item Individual (Código de Barras / SKU)</option>
                    <option value="DESCONTO_MARCA">🏢 Desconto em Toda a Marca (Linha Completa)</option>
                    <option value="DESCONTO_CATEGORIA">📂 Desconto em Toda a Categoria / Departamento</option>
                    <option value="LEVE_X_PAGUE_Y">🎁 Leve X Pague Y (Ex: Compre 3 Pague 2)</option>
                    <option value="DESCONTO_PROGRESSIVO_QTD">📈 Desconto Progressivo por Quantidade (Atacado)</option>
                    <option value="CUPOM_DESCONTO">🎟️ Cupom Promocional (Código no Checkout)</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Descrição / Chamada no Encarte</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Ex: Válido até o fim do estoque"
                    style={{ height: '38px', width: '100%' }}
                  />
                </div>
              </div>

              {/* Opções Contextuais por Mecânica */}
              {mecanica === 'DESCONTO_MARCA' && (
                <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="coliseu-label">Marca Alvo Selecionada *</label>
                    <select className="coliseu-input" value={marcaAlvo} onChange={(e) => setMarcaAlvo(e.target.value)} style={{ height: '36px', width: '100%', fontWeight: 700 }}>
                      <option value="CORAL">CORAL TINTAS</option>
                      <option value="SUVINIL">SUVINIL</option>
                      <option value="LAZZURIL">LAZZURIL</option>
                      <option value="3M">3M ABRASIVOS</option>
                      <option value="DEKALB">DEKALB SEMENTES</option>
                      <option value="BAYER">BAYER DEFENSIVOS</option>
                    </select>
                  </div>
                  <div>
                    <label className="coliseu-label">Desconto Aplicado na Marca (%) *</label>
                    <input type="number" step="0.5" value={percentualDescontoGeral} onChange={(e) => setPercentualDescontoGeral(parseFloat(e.target.value) || 0)} className="coliseu-input" style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700, color: '#10b981' }} />
                  </div>
                </div>
              )}

              {mecanica === 'DESCONTO_CATEGORIA' && (
                <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="coliseu-label">Categoria Alvo Selecionada *</label>
                    <select className="coliseu-input" value={categoriaAlvo} onChange={(e) => setCategoriaAlvo(e.target.value)} style={{ height: '36px', width: '100%', fontWeight: 700 }}>
                      <option value="TINTAS AUTOMOTIVAS">TINTAS AUTOMOTIVAS</option>
                      <option value="SOLVENTES & QUÍMICOS">SOLVENTES & QUÍMICOS</option>
                      <option value="SEMENTES & GRÃOS">SEMENTES & GRÃOS</option>
                      <option value="ABRASIVOS & LIXAS">ABRASIVOS & LIXAS</option>
                      <option value="FERRAMENTAS">FERRAMENTAS & ACESSÓRIOS</option>
                    </select>
                  </div>
                  <div>
                    <label className="coliseu-label">Desconto na Categoria (%) *</label>
                    <input type="number" step="0.5" value={percentualDescontoGeral} onChange={(e) => setPercentualDescontoGeral(parseFloat(e.target.value) || 0)} className="coliseu-input" style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700, color: '#10b981' }} />
                  </div>
                </div>
              )}

              {mecanica === 'LEVE_X_PAGUE_Y' && (
                <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="coliseu-label">Compre / Leve Quantidade (X) *</label>
                    <input type="number" min="2" value={leveQtd} onChange={(e) => setLeveQtd(parseInt(e.target.value, 10) || 2)} className="coliseu-input" style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700 }} />
                  </div>
                  <div>
                    <label className="coliseu-label">Pague Apenas Quantidade (Y) *</label>
                    <input type="number" min="1" value={pagueQtd} onChange={(e) => setPagueQtd(parseInt(e.target.value, 10) || 1)} className="coliseu-input" style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700, color: '#10b981' }} />
                  </div>
                </div>
              )}

              {mecanica === 'CUPOM_DESCONTO' && (
                <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="coliseu-label">Código Alfa-Numérico do Cupom *</label>
                    <input type="text" value={codigoCupom} onChange={(e) => setCodigoCupom(e.target.value.toUpperCase())} className="coliseu-input" style={{ height: '36px', width: '100%', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '1px' }} />
                  </div>
                  <div>
                    <label className="coliseu-label">Desconto do Cupom (%) *</label>
                    <input type="number" step="0.5" value={percentualDescontoGeral} onChange={(e) => setPercentualDescontoGeral(parseFloat(e.target.value) || 0)} className="coliseu-input" style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700, color: '#10b981' }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABA 2: ITENS & ABRANGÊNCIA */}
          {activeTab === 'ITENS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Leitor de Código de Barras / Bipador */}
              <div style={{ padding: '14px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Barcode size={16} color="#3b82f6" /> Inserção Rápida por Código de Barras (EAN / GTIN) ou SKU
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Bipe com o leitor ou digite o código de barras (Ex: 7891991000803)..."
                    style={{ flex: 1, height: '36px', fontFamily: 'monospace' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddProdutoPorBarcode(e);
                      }
                    }}
                  />
                  <Button type="button" variant="primary" onClick={handleAddProdutoPorBarcode} leftIcon={<Plus size={14} />}>
                    Adicionar Produto
                  </Button>
                </div>
              </div>

              {/* Tabela de Produtos Participantes */}
              <div className="coliseu-table-container">
                <table className="coliseu-table" style={{ fontSize: '11px' }}>
                  <thead>
                    <tr>
                      <th>Produto / SKU</th>
                      <th style={{ width: '130px' }}>Código Barras</th>
                      <th style={{ width: '110px', textAlign: 'right' }}>Preço Tabela</th>
                      <th style={{ width: '120px', textAlign: 'right' }}>Preço Promocional</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>% OFF</th>
                      <th style={{ width: '50px', textAlign: 'center' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, idx) => (
                      <tr key={item.produtoId}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.descricao}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SKU: {item.codigoSku}</div>
                        </td>
                        <td style={{ fontFamily: 'monospace' }}>{item.codigoBarras}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(item.precoDeTabela)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <input
                            type="number"
                            step="0.1"
                            value={item.precoPromocional}
                            onChange={(e) => handleUpdateItemPreco(idx, parseFloat(e.target.value) || 0)}
                            className="coliseu-input"
                            style={{ height: '28px', width: '90px', textAlign: 'right', fontWeight: 700, color: '#10b981' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#10b981' }}>
                          {item.percentualDesconto}%
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {itens.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                          Nenhum produto individual adicionado ainda. (Se a mecânica for por Marca ou Categoria, todos os itens da linha participam automaticamente).
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA 3: VIGÊNCIA, HORÁRIOS & DIAS */}
          {activeTab === 'VIGENCIA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Data Início *</label>
                  <input type="text" className="coliseu-input" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={{ height: '36px', width: '100%', textAlign: 'center' }} />
                </div>
                <div>
                  <label className="coliseu-label">Data Fim *</label>
                  <input type="text" className="coliseu-input" value={dataFim} onChange={(e) => setDataFim(e.target.value)} style={{ height: '36px', width: '100%', textAlign: 'center' }} />
                </div>
                <div>
                  <label className="coliseu-label">Hora Início (Happy Hour)</label>
                  <input type="time" className="coliseu-input" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} style={{ height: '36px', width: '100%', textAlign: 'center' }} />
                </div>
                <div>
                  <label className="coliseu-label">Hora Fim</label>
                  <input type="time" className="coliseu-input" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} style={{ height: '36px', width: '100%', textAlign: 'center' }} />
                </div>
              </div>

              {/* Dias da Semana Habilitados */}
              <div style={{ padding: '14px', backgroundColor: 'var(--surface-2)', borderRadius: '6px' }}>
                <label className="coliseu-label" style={{ marginBottom: '8px' }}>Dias da Semana em que a Oferta é Válida</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { dia: 0, label: 'Domingo' },
                    { dia: 1, label: 'Segunda' },
                    { dia: 2, label: 'Terça' },
                    { dia: 3, label: 'Quarta' },
                    { dia: 4, label: 'Quinta' },
                    { dia: 5, label: 'Sexta' },
                    { dia: 6, label: 'Sábado' },
                  ].map((d) => (
                    <button
                      key={d.dia}
                      type="button"
                      onClick={() => toggleDiaSemana(d.dia)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: diasSemana.includes(d.dia) ? '1px solid #10b981' : '1px solid var(--border-default)',
                        backgroundColor: diasSemana.includes(d.dia) ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-1)',
                        color: diasSemana.includes(d.dia) ? '#10b981' : 'var(--text-muted)',
                        fontWeight: 700,
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: CONDIÇÕES & REGRAS */}
          {activeTab === 'CONDICOES' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="coliseu-label">Valor Mínimo do Pedido / Carrinho (R$)</label>
                  <input
                    type="number"
                    step="10"
                    value={valorMinimoPedido || ''}
                    onChange={(e) => setValorMinimoPedido(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="coliseu-input"
                    style={{ height: '36px', width: '100%', textAlign: 'right' }}
                  />
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Deixe 0 para aplicar sem exigência de valor mínimo.
                  </div>
                </div>

                <div>
                  <label className="coliseu-label">Limite de Usos por Cliente (CPF)</label>
                  <input
                    type="number"
                    min="0"
                    value={limiteUsosPorCliente || ''}
                    onChange={(e) => setLimiteUsosPorCliente(parseInt(e.target.value, 10) || 0)}
                    placeholder="Ilimitado"
                    className="coliseu-input"
                    style={{ height: '36px', width: '100%', textAlign: 'center' }}
                  />
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Evita compras em massa por revendedores.
                  </div>
                </div>
              </div>

              <div style={{ padding: '14px', backgroundColor: 'var(--surface-2)', borderRadius: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={acumulativa}
                    onChange={(e) => setAcumulativa(e.target.checked)}
                  />
                  Permitir cumulatividade com outros cupons ou promoções ativas no caixa
                </label>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" leftIcon={<Save size={16} />}>
              Gravar Campanha Promocional
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
