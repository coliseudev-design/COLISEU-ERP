import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency, parseNumber } from '../../lib/formatters';
import {
  FileCheck,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Sparkles,
  Truck,
  DollarSign,
  AlertCircle,
  Building,
  User,
} from 'lucide-react';
import {
  DocumentoFiscalItem,
  ItemDFe,
  salvarDocumentoFiscal,
} from '../../lib/dfe';
import { getCertificadoConfig } from '../../lib/certificadoA1';

interface ModalEmissaoNFeProps {
  isOpen: boolean;
  onClose: () => void;
  modeloPreDefinido?: '55_NFE' | '65_NFCE';
  onEmissaoSucesso: (doc: DocumentoFiscalItem) => void;
}

export const ModalEmissaoNFe: React.FC<ModalEmissaoNFeProps> = ({
  isOpen,
  onClose,
  modeloPreDefinido = '55_NFE',
  onEmissaoSucesso,
}) => {
  const certConfig = getCertificadoConfig();
  const [modelo, setModelo] = useState<'55_NFE' | '65_NFCE'>(modeloPreDefinido);
  const [naturezaOperacao, setNaturezaOperacao] = useState('VENDA DE MERCADORIA ADQUIRIDA DE TERCEIROS');
  const [destinatarioNome, setDestinatarioNome] = useState('');
  const [destinatarioCpfCnpj, setDestinatarioCpfCnpj] = useState('');
  const [destinatarioUf, setDestinatarioUf] = useState('MS');
  const [destinatarioMunicipio, setDestinatarioMunicipio] = useState('DOURADOS');
  const [valorFrete, setValorFrete] = useState(0);
  const [valorDesconto, setValorDesconto] = useState(0);

  // Itens da Nota
  const [itens, setItens] = useState<ItemDFe[]>([
    {
      id: 'IT-1',
      sku: '00001',
      descricao: 'TINTA POLIURETANO AUTOMOTIVA 900ML',
      ncm: '32082019',
      cfop: '5102',
      cst: '000',
      quantidade: 5,
      unidade: 'UN',
      valorUnitario: 120.00,
      valorTotal: 600.00,
      aliquotaIcms: 12,
      valorIcms: 72.00,
    },
  ]);

  // Novo Item Input
  const [novoItemSku, setNovoItemSku] = useState('');
  const [novoItemDesc, setNovoItemDesc] = useState('');
  const [novoItemNcm, setNovoItemNcm] = useState('32082019');
  const [novoItemCfop, setNovoItemCfop] = useState('5102');
  const [novoItemQtd, setNovoItemQtd] = useState(1);
  const [novoItemVlUnit, setNovoItemVlUnit] = useState(0);

  const [isTransmitting, setIsTransmitting] = useState(false);

  if (!isOpen) return null;

  const totalProdutos = itens.reduce((acc, it) => acc + it.valorTotal, 0);
  const totalIcms = itens.reduce((acc, it) => acc + it.valorIcms, 0);
  const totalNota = Math.max(0, totalProdutos + valorFrete - valorDesconto);

  const handleAdicionarItem = () => {
    if (!novoItemDesc) return;
    const vlTot = Math.round(novoItemQtd * novoItemVlUnit * 100) / 100;
    const vlIcms = Math.round(vlTot * 0.12 * 100) / 100;

    const item: ItemDFe = {
      id: `IT-${Date.now()}`,
      sku: novoItemSku || '00099',
      descricao: novoItemDesc.toUpperCase(),
      ncm: novoItemNcm || '32082019',
      cfop: novoItemCfop || '5102',
      cst: '000',
      quantidade: novoItemQtd,
      unidade: 'UN',
      valorUnitario: novoItemVlUnit,
      valorTotal: vlTot,
      aliquotaIcms: 12,
      valorIcms: vlIcms,
    };

    setItens([...itens, item]);
    setNovoItemSku('');
    setNovoItemDesc('');
    setNovoItemQtd(1);
    setNovoItemVlUnit(0);
  };

  const handleRemoverItem = (id: string) => {
    setItens(itens.filter((it) => it.id !== id));
  };

  const handleTransmitirSefaz = () => {
    if (!destinatarioNome && modelo === '55_NFE') {
      alert('Para NF-e Modelo 55, o Destinatário é obrigatório.');
      return;
    }
    if (itens.length === 0) {
      alert('Adicione pelo menos 1 item na nota fiscal.');
      return;
    }

    setIsTransmitting(true);

    setTimeout(() => {
      setIsTransmitting(false);

      const proximoNumero = modelo === '55_NFE' ? certConfig.nfeNumeroAtual + 1 : certConfig.nfceNumeroAtual + 1;
      const serie = modelo === '55_NFE' ? certConfig.nfeSerie : certConfig.nfceSerie;
      const chaveAcesso = `50260812345678000190${modelo === '55_NFE' ? '55' : '65'}${String(serie).padStart(3, '0')}${String(proximoNumero).padStart(9, '0')}1${Math.floor(10000000 + Math.random() * 90000000)}`;

      const novoDoc: DocumentoFiscalItem = {
        id: `DFE-${Date.now()}`,
        modelo,
        numero: proximoNumero,
        serie,
        chaveAcesso,
        dataEmissao: new Date().toLocaleDateString('pt-BR'),
        horaEmissao: new Date().toLocaleTimeString('pt-BR'),
        naturezaOperacao: naturezaOperacao.toUpperCase(),
        tipoOperacao: 'SAIDA',
        destinatarioNome: (destinatarioNome || 'CONSUMIDOR FINAL').toUpperCase(),
        destinatarioCpfCnpj: destinatarioCpfCnpj || '000.000.000-00',
        destinatarioUf,
        destinatarioMunicipio: destinatarioMunicipio.toUpperCase(),
        valorProdutos: totalProdutos,
        valorFrete,
        valorSeguro: 0,
        valorOutrasDespesas: 0,
        valorDesconto,
        valorTotal: totalNota,
        valorBaseIcms: totalProdutos,
        valorIcms: totalIcms,
        valorIcmsSt: 0,
        valorIpi: 0,
        valorPis: Math.round(totalProdutos * 0.0065 * 100) / 100,
        valorCofins: Math.round(totalProdutos * 0.03 * 100) / 100,
        statusSefaz: 'AUTORIZADA',
        mensagemSefaz: `100 - Autorizado o uso da ${modelo === '55_NFE' ? 'NF-e' : 'NFC-e'}`,
        protocoloAutorizacao: `15026000${Math.floor(100000 + Math.random() * 900000)}`,
        dataAutorizacao: new Date().toLocaleString('pt-BR'),
        cartasCorrecao: [],
        itens,
      };

      salvarDocumentoFiscal(novoDoc);
      onEmissaoSucesso(novoDoc);
      onClose();
    }, 1200);
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
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileCheck size={20} color="#3b82f6" />
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Emissão Direta de {modelo === '55_NFE' ? 'NF-e (Nota Fiscal Mod. 55)' : 'NFC-e (Cupom Fiscal Mod. 65)'}
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Ambiente: <strong style={{ color: certConfig.ambiente === 'PRODUCAO' ? '#10b981' : '#eab308' }}>{certConfig.ambiente}</strong> • Certificado: {certConfig.nomeTitular}
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

        {/* Form Body com Scroll */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Modelo & Natureza */}
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '12px' }}>
            <div>
              <label className="coliseu-label">Modelo Fiscal *</label>
              <select
                className="coliseu-input"
                value={modelo}
                onChange={(e) => setModelo(e.target.value as any)}
                style={{ height: '38px', width: '100%', fontWeight: 700 }}
              >
                <option value="55_NFE">NF-e (Mod. 55 - Grande/Transporte)</option>
                <option value="65_NFCE">NFC-e (Mod. 65 - Consumidor/PDV)</option>
              </select>
            </div>

            <div>
              <label className="coliseu-label">Natureza da Operação *</label>
              <input
                type="text"
                className="coliseu-input"
                value={naturezaOperacao}
                onChange={(e) => setNaturezaOperacao(e.target.value.toUpperCase())}
                style={{ height: '38px', width: '100%' }}
              />
            </div>
          </div>

          {/* Destinatário */}
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
              <User size={15} color="#3b82f6" /> Destinatário / Tomador da Nota
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 80px 1.2fr', gap: '10px' }}>
              <div>
                <label className="coliseu-label">Nome / Razão Social *</label>
                <input
                  type="text"
                  className="coliseu-input"
                  value={destinatarioNome}
                  onChange={(e) => setDestinatarioNome(e.target.value.toUpperCase())}
                  placeholder="Ex: AGROPECUARIA PANTANAL LTDA ou CONSUMIDOR FINAL"
                  style={{ height: '36px', width: '100%' }}
                />
              </div>
              <div>
                <label className="coliseu-label">CNPJ / CPF</label>
                <input
                  type="text"
                  className="coliseu-input"
                  value={destinatarioCpfCnpj}
                  onChange={(e) => setDestinatarioCpfCnpj(e.target.value)}
                  placeholder="12.345.678/0001-90"
                  style={{ height: '36px', width: '100%' }}
                />
              </div>
              <div>
                <label className="coliseu-label">UF</label>
                <input
                  type="text"
                  className="coliseu-input"
                  value={destinatarioUf}
                  onChange={(e) => setDestinatarioUf(e.target.value.toUpperCase())}
                  maxLength={2}
                  style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700 }}
                />
              </div>
              <div>
                <label className="coliseu-label">Município</label>
                <input
                  type="text"
                  className="coliseu-input"
                  value={destinatarioMunicipio}
                  onChange={(e) => setDestinatarioMunicipio(e.target.value.toUpperCase())}
                  placeholder="DOURADOS"
                  style={{ height: '36px', width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Tabela de Itens e Adição */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Itens da Mercadoria & Tributação (ICMS / PIS / COFINS)
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 2fr 100px 80px 70px 110px auto',
                gap: '6px',
                alignItems: 'flex-end',
                backgroundColor: 'var(--surface-2)',
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '10px',
              }}
            >
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SKU</label>
                <input
                  type="text"
                  value={novoItemSku}
                  onChange={(e) => setNovoItemSku(e.target.value.toUpperCase())}
                  placeholder="00001"
                  className="coliseu-input"
                  style={{ height: '32px', width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Descrição do Produto *</label>
                <input
                  type="text"
                  value={novoItemDesc}
                  onChange={(e) => setNovoItemDesc(e.target.value.toUpperCase())}
                  placeholder="Descrição da mercadoria..."
                  className="coliseu-input"
                  style={{ height: '32px', width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>NCM</label>
                <input
                  type="text"
                  value={novoItemNcm}
                  onChange={(e) => setNovoItemNcm(e.target.value)}
                  placeholder="32082019"
                  className="coliseu-input"
                  style={{ height: '32px', width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CFOP</label>
                <input
                  type="text"
                  value={novoItemCfop}
                  onChange={(e) => setNovoItemCfop(e.target.value)}
                  placeholder="5102"
                  className="coliseu-input"
                  style={{ height: '32px', width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Qtd</label>
                <input
                  type="number"
                  min="1"
                  value={novoItemQtd}
                  onChange={(e) => setNovoItemQtd(parseInt(e.target.value, 10) || 1)}
                  className="coliseu-input"
                  style={{ height: '32px', width: '100%', textAlign: 'center' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Vl. Unit (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={novoItemVlUnit}
                  onChange={(e) => setNovoItemVlUnit(parseFloat(e.target.value) || 0)}
                  className="coliseu-input"
                  style={{ height: '32px', width: '100%', textAlign: 'right' }}
                />
              </div>
              <Button type="button" variant="primary" size="sm" onClick={handleAdicionarItem} style={{ height: '32px' }}>
                <Plus size={14} />
              </Button>
            </div>

            <div className="coliseu-table-container">
              <table className="coliseu-table" style={{ fontSize: '11px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>SKU</th>
                    <th>Descrição da Mercadoria</th>
                    <th style={{ width: '80px' }}>NCM</th>
                    <th style={{ width: '60px' }}>CFOP</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>Qtd</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>Vl. Unit</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>Total</th>
                    <th style={{ width: '80px', textAlign: 'right' }}>ICMS</th>
                    <th style={{ width: '50px', textAlign: 'center' }}>X</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((it) => (
                    <tr key={it.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-link)' }}>{it.sku}</td>
                      <td style={{ fontWeight: 600 }}>{it.descricao}</td>
                      <td className="text-mono">{it.ncm}</td>
                      <td className="text-mono">{it.cfop}</td>
                      <td style={{ textAlign: 'center' }}>{it.quantidade} {it.unidade}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(it.valorUnitario)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{formatCurrency(it.valorTotal)}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#10b981' }}>{formatCurrency(it.valorIcms)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoverItem(it.id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totais e Tributos */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1.5fr',
              gap: '14px',
              backgroundColor: 'var(--surface-2)',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
            }}
          >
            <div>
              <label className="coliseu-label">Frete (R$)</label>
              <input
                type="number"
                step="0.01"
                value={valorFrete}
                onChange={(e) => setValorFrete(parseFloat(e.target.value) || 0)}
                className="coliseu-input"
                style={{ height: '34px', width: '100%', textAlign: 'right' }}
              />
            </div>

            <div>
              <label className="coliseu-label">Desconto (R$)</label>
              <input
                type="number"
                step="0.01"
                value={valorDesconto}
                onChange={(e) => setValorDesconto(parseFloat(e.target.value) || 0)}
                className="coliseu-input"
                style={{ height: '34px', width: '100%', textAlign: 'right', color: '#ef4444' }}
              />
            </div>

            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Base ICMS: {formatCurrency(totalProdutos)} • ICMS Total: {formatCurrency(totalIcms)}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                TOTAL DA NOTA: {formatCurrency(totalNota)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer de Transmissão */}
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
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Certificado: <strong style={{ color: '#10b981' }}>{certConfig.nomeTitular}</strong>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" onClick={onClose} disabled={isTransmitting}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleTransmitirSefaz}
              disabled={isTransmitting}
              leftIcon={<Send size={16} />}
            >
              {isTransmitting ? 'Transmitindo para SEFAZ...' : `Transmitir ${modelo === '55_NFE' ? 'NF-e' : 'NFC-e'} (F10)`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
