import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import {
  Users,
  Save,
  X,
  Target,
  DollarSign,
  Phone,
  Mail,
  TrendingUp,
} from 'lucide-react';
import {
  VendedorItem,
  salvarVendedor,
} from '../../lib/comissoes';

interface ModalFichaVendedorMetaProps {
  isOpen: boolean;
  onClose: () => void;
  vendedorEdicao?: VendedorItem | null;
  onSuccess: (vendedor: VendedorItem) => void;
}

export const ModalFichaVendedorMeta: React.FC<ModalFichaVendedorMetaProps> = ({
  isOpen,
  onClose,
  vendedorEdicao,
  onSuccess,
}) => {
  const [nome, setNome] = useState(vendedorEdicao?.nome || '');
  const [email, setEmail] = useState(vendedorEdicao?.email || '');
  const [telefone, setTelefone] = useState(vendedorEdicao?.telefone || '');
  const [cargo, setCargo] = useState<any>(vendedorEdicao?.cargo || 'VENDEDOR_INTERNO');
  const [metaFaturamentoMensal, setMetaFaturamentoMensal] = useState(vendedorEdicao?.metaFaturamentoMensal || 80000);
  const [metaMargemLucroMinima, setMetaMargemLucroMinima] = useState(vendedorEdicao?.metaMargemLucroMinima || 25.0);
  const [chavePix, setChavePix] = useState(vendedorEdicao?.chavePix || '');
  const [bancoFavorecido, setBancoFavorecido] = useState(vendedorEdicao?.bancoFavorecido || '748 - SICREDI');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome) {
      alert('Preencha o Nome do Vendedor.');
      return;
    }

    const vendedor: VendedorItem = {
      id: vendedorEdicao?.id || `VEND-${Date.now()}`,
      codigo: vendedorEdicao?.codigo || `00${Math.floor(10 + Math.random() * 90)}`,
      nome: nome.toUpperCase(),
      email: email.toLowerCase(),
      telefone,
      cargo,
      ativo: true,
      metaFaturamentoMensal,
      metaMargemLucroMinima,
      totalVendidoMes: vendedorEdicao?.totalVendidoMes || 0,
      totalLucroGeradoMes: vendedorEdicao?.totalLucroGeradoMes || 0,
      margemMediaObtida: vendedorEdicao?.margemMediaObtida || 0,
      qtdVendasRealizadas: vendedorEdicao?.qtdVendasRealizadas || 0,
      percentualAtingimentoMeta: vendedorEdicao?.totalVendidoMes && metaFaturamentoMensal > 0
        ? Math.round((vendedorEdicao.totalVendidoMes / metaFaturamentoMensal) * 1000) / 10
        : 0,
      totalComissaoGerada: vendedorEdicao?.totalComissaoGerada || 0,
      totalComissaoLiberada: vendedorEdicao?.totalComissaoLiberada || 0,
      totalComissaoPaga: vendedorEdicao?.totalComissaoPaga || 0,
      totalComissaoPendente: vendedorEdicao?.totalComissaoPendente || 0,
      chavePix,
      bancoFavorecido,
    };

    salvarVendedor(vendedor);
    onSuccess(vendedor);
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
          maxWidth: '680px',
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
            <Target size={20} color="#10b981" />
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {vendedorEdicao ? `Meta & Vendedor: ${vendedorEdicao.nome}` : 'Novo Vendedor & Definição de Metas'}
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Metas comerciais de faturamento, margem mínima e chave PIX para comissionamento.
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
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '10px' }}>
            <div>
              <label className="coliseu-label">Nome Completo do Vendedor *</label>
              <input
                type="text"
                className="coliseu-input"
                value={nome}
                onChange={(e) => setNome(e.target.value.toUpperCase())}
                placeholder="Ex: CARLOS SILVA"
                style={{ height: '36px', width: '100%', fontWeight: 700 }}
                required
              />
            </div>
            <div>
              <label className="coliseu-label">Cargo / Função *</label>
              <select
                className="coliseu-input"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                style={{ height: '36px', width: '100%' }}
              >
                <option value="VENDEDOR_INTERNO">Vendedor Interno / Balcão</option>
                <option value="VENDEDOR_EXTERNO">Vendedor Externo / Campo</option>
                <option value="REPRESENTANTE">Representante Comercial</option>
                <option value="GERENTE_CONTAS">Gerente de Contas</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr', gap: '10px' }}>
            <div>
              <label className="coliseu-label">Telefone / WhatsApp</label>
              <input
                type="text"
                className="coliseu-input"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(67) 99999-9999"
                style={{ height: '36px', width: '100%' }}
              />
            </div>
            <div>
              <label className="coliseu-label">E-mail Corporativo</label>
              <input
                type="email"
                className="coliseu-input"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="vendedor@coliseuerp.com.br"
                style={{ height: '36px', width: '100%' }}
              />
            </div>
          </div>

          {/* PAINEL DE METAS */}
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--surface-2)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Target size={16} /> Metas Comerciais do Mês
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
              <div>
                <label className="coliseu-label">Meta de Faturamento Bruto (R$) *</label>
                <input
                  type="number"
                  step="1000"
                  className="coliseu-input"
                  value={metaFaturamentoMensal || ''}
                  onChange={(e) => setMetaFaturamentoMensal(parseFloat(e.target.value) || 0)}
                  placeholder="80000"
                  style={{ height: '36px', width: '100%', textAlign: 'right', fontWeight: 700, fontSize: '14px' }}
                  required
                />
              </div>

              <div>
                <label className="coliseu-label">Margem Mínima Alvo (%)</label>
                <input
                  type="number"
                  step="0.5"
                  className="coliseu-input"
                  value={metaMargemLucroMinima || ''}
                  onChange={(e) => setMetaMargemLucroMinima(parseFloat(e.target.value) || 0)}
                  placeholder="25.0"
                  style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700 }}
                />
              </div>
            </div>
          </div>

          {/* DADOS DE PAGAMENTO PIX */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr', gap: '10px' }}>
            <div>
              <label className="coliseu-label">Banco Favorecido</label>
              <input
                type="text"
                className="coliseu-input"
                value={bancoFavorecido}
                onChange={(e) => setBancoFavorecido(e.target.value.toUpperCase())}
                placeholder="748 - SICREDI"
                style={{ height: '36px', width: '100%' }}
              />
            </div>
            <div>
              <label className="coliseu-label">Chave PIX para Pagamento de Comissões</label>
              <input
                type="text"
                className="coliseu-input"
                value={chavePix}
                onChange={(e) => setChavePix(e.target.value)}
                placeholder="E-mail, CPF ou celular"
                style={{ height: '36px', width: '100%', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" leftIcon={<Save size={16} />}>
              Salvar Vendedor & Metas
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
