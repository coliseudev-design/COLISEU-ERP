import React, { useState, useMemo } from 'react';
import { Button } from '../ui/Button';
import { X, MapPin, Check, Plus, Layers, ArrowRight } from 'lucide-react';
import { adicionarEnderecoRapido, formatarEnderecoSlug, EnderecoItem, getEnderecos } from '../../lib/enderecos';

interface ModalCadastroRapidoEnderecoProps {
  isOpen: boolean;
  onClose: () => void;
  onEnderecoCadastrado: (endereco: EnderecoItem) => void;
  sugestaoDeposito?: string;
}

export const ModalCadastroRapidoEndereco: React.FC<ModalCadastroRapidoEnderecoProps> = ({
  isOpen,
  onClose,
  onEnderecoCadastrado,
  sugestaoDeposito = 'DEPÓSITO PRINCIPAL',
}) => {
  const [deposito, setDeposito] = useState(sugestaoDeposito);
  const [rua, setRua] = useState('RUA A');
  const [prateleira, setPrateleira] = useState('PRATELEIRA 01');
  const [nivel, setNivel] = useState('NÍVEL 1 (CHÃO)');
  const [posicao, setPosicao] = useState('VÃO 01');
  const [tipoLocacao, setTipoLocacao] = useState<'PICKING' | 'PULMAO' | 'MOSTRUARIO' | 'GERAL'>('PICKING');
  const [error, setError] = useState<string | null>(null);

  const previewSlug = useMemo(() => {
    return formatarEnderecoSlug(deposito, rua, prateleira, nivel, posicao);
  }, [deposito, rua, prateleira, nivel, posicao]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deposito.trim()) {
      setError('Por favor, selecione ou informe o Depósito / Setor.');
      return;
    }

    const novo = adicionarEnderecoRapido(deposito, rua, prateleira, nivel, posicao, tipoLocacao);
    onEnderecoCadastrado(novo);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 11000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--surface-2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MapPin size={17} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Cadastrar Local do Produto (WMS)
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                Endereçamento físico para balanço, conferência e busca rápida
              </p>
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
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '4px',
                color: '#ef4444',
                fontSize: '11px',
              }}
            >
              {error}
            </div>
          )}

          {/* Prévia do Endereço Formatado */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase' }}>
              Endereço Formatado (Como aparecerá nas etiquetas e relatórios):
            </span>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              📍 {previewSlug || 'INFORME OS CAMPOS ABAIXO'}
            </div>
          </div>

          {/* Setor / Depósito & Tipo de Locação */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
            <div>
              <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                Depósito / Setor Principal *
              </label>
              <input
                type="text"
                list="depositos-predefinidos"
                required
                placeholder="Ex: DEPÓSITO PRINCIPAL, LOJA..."
                value={deposito}
                onChange={(e) => {
                  setDeposito(e.target.value.toUpperCase());
                  setError(null);
                }}
                className="coliseu-input"
                style={{ height: '36px', fontSize: '12px' }}
              />
              <datalist id="depositos-predefinidos">
                <option value="DEPÓSITO PRINCIPAL" />
                <option value="LOJA / FRENTE" />
                <option value="MOSTRUÁRIO" />
                <option value="PÁTIO EXTERNO" />
                <option value="PULMÃO DE ESTOQUE" />
              </datalist>
            </div>

            <div>
              <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                Tipo de Locação
              </label>
              <select
                value={tipoLocacao}
                onChange={(e) => setTipoLocacao(e.target.value as any)}
                className="coliseu-input"
                style={{ height: '36px', fontSize: '12px' }}
              >
                <option value="PICKING">PICKING (Venda / Balcão)</option>
                <option value="PULMAO">PULMÃO (Reserva Aérea)</option>
                <option value="MOSTRUARIO">MOSTRUÁRIO (Vitrine)</option>
                <option value="GERAL">GERAL (Pátio / Chão)</option>
              </select>
            </div>
          </div>

          {/* Rua / Corredor & Prateleira / Gôndola */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                Rua / Corredor
              </label>
              <input
                type="text"
                list="ruas-predefinidas"
                placeholder="Ex: RUA A, CORREDOR 01"
                value={rua}
                onChange={(e) => setRua(e.target.value.toUpperCase())}
                className="coliseu-input"
                style={{ height: '36px', fontSize: '12px' }}
              />
              <datalist id="ruas-predefinidas">
                <option value="RUA A" />
                <option value="RUA B" />
                <option value="RUA C" />
                <option value="CORREDOR CENTRAL" />
                <option value="ENTRADA PRINCIPAL" />
              </datalist>
            </div>

            <div>
              <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                Prateleira / Gôndola / Estante
              </label>
              <input
                type="text"
                list="prateleiras-predefinidas"
                placeholder="Ex: PRATELEIRA 01, GÔNDOLA 02"
                value={prateleira}
                onChange={(e) => setPrateleira(e.target.value.toUpperCase())}
                className="coliseu-input"
                style={{ height: '36px', fontSize: '12px' }}
              />
              <datalist id="prateleiras-predefinidas">
                <option value="PRATELEIRA 01" />
                <option value="PRATELEIRA 02" />
                <option value="PRATELEIRA 03" />
                <option value="GÔNDOLA 01" />
                <option value="GÔNDOLA 02" />
                <option value="VITRINE 01" />
                <option value="ESTANTE ALTA" />
              </datalist>
            </div>
          </div>

          {/* Nível / Andar & Posição / Vão / Gaveta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                Nível / Andar
              </label>
              <input
                type="text"
                list="niveis-predefinidos"
                placeholder="Ex: NÍVEL 1 (CHÃO), NÍVEL 2"
                value={nivel}
                onChange={(e) => setNivel(e.target.value.toUpperCase())}
                className="coliseu-input"
                style={{ height: '36px', fontSize: '12px' }}
              />
              <datalist id="niveis-predefinidos">
                <option value="NÍVEL 1 (CHÃO)" />
                <option value="NÍVEL 2" />
                <option value="NÍVEL 3 (AÉREO)" />
                <option value="PISO" />
              </datalist>
            </div>

            <div>
              <label className="coliseu-label" style={{ fontSize: '11px', marginBottom: '4px' }}>
                Posição / Vão / Gaveta
              </label>
              <input
                type="text"
                list="posicoes-predefinidas"
                placeholder="Ex: VÃO 01, COLUNA 02"
                value={posicao}
                onChange={(e) => setPosicao(e.target.value.toUpperCase())}
                className="coliseu-input"
                style={{ height: '36px', fontSize: '12px' }}
              />
              <datalist id="posicoes-predefinidas">
                <option value="VÃO 01" />
                <option value="VÃO 02" />
                <option value="COLUNA 01" />
                <option value="COLUNA 02" />
                <option value="GAVETA A" />
                <option value="PALETE 01" />
                <option value="FRENTE" />
              </datalist>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '14px',
              marginTop: '4px',
            }}
          >
            <Button variant="secondary" size="md" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" size="md" type="submit" leftIcon={<Check size={16} />}>
              Salvar & Selecionar Local
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
