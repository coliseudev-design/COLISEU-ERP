import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { User, Save, X, AlertTriangle } from 'lucide-react';
import { MotoristaItem, transporteService } from '../../lib/transporte';
import { maskCpf } from '../../lib/formatters';

interface ModalCadastroMotoristaProps {
  isOpen: boolean;
  onClose: () => void;
  onSalvo: (motorista: MotoristaItem) => void;
  motoristaEditar?: MotoristaItem | null;
}

export const ModalCadastroMotorista: React.FC<ModalCadastroMotoristaProps> = ({
  isOpen,
  onClose,
  onSalvo,
  motoristaEditar,
}) => {
  const [cpf, setCpf] = useState(motoristaEditar?.cpf || '');
  const [nome, setNome] = useState(motoristaEditar?.nome || '');
  const [rg, setRg] = useState(motoristaEditar?.rg || '');
  const [cnhNumero, setCnhNumero] = useState(motoristaEditar?.cnh_numero || '');
  const [cnhCategoria, setCnhCategoria] = useState(motoristaEditar?.cnh_categoria || 'E');
  const [cnhValidade, setCnhValidade] = useState(motoristaEditar?.cnh_validade || '2028-12-31');
  const [cnhUfEmissao, setCnhUfEmissao] = useState(motoristaEditar?.cnh_uf_emissao || 'MS');
  const [rntrc, setRntrc] = useState(motoristaEditar?.rntrc || '');
  const [rntrcValidade, setRntrcValidade] = useState(motoristaEditar?.rntrc_validade || '');
  const [telefone, setTelefone] = useState(motoristaEditar?.telefone || '');
  const [celular, setCelular] = useState(motoristaEditar?.celular || '');
  const [email, setEmail] = useState(motoristaEditar?.email || '');
  const [cidade, setCidade] = useState(motoristaEditar?.cidade || 'DOURADOS');
  const [uf, setUf] = useState(motoristaEditar?.uf || 'MS');
  const [tipoVinculo, setTipoVinculo] = useState(motoristaEditar?.tipo_vinculo || 'PROPRIO');
  const [chavePix, setChavePix] = useState(motoristaEditar?.chave_pix || '');
  const [banco, setBanco] = useState(motoristaEditar?.banco || '');
  const [agencia, setAgencia] = useState(motoristaEditar?.agencia || '');
  const [conta, setConta] = useState(motoristaEditar?.conta || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const isCnhVencida = new Date(cnhValidade) < new Date();

  const handleSalvar = async () => {
    if (!cpf.trim() || !nome.trim() || !cnhNumero.trim()) {
      alert('Preencha CPF, Nome e Número da CNH.');
      return;
    }
    setIsSaving(true);
    try {
      const salvo = await transporteService.salvarMotorista({
        id: motoristaEditar?.id,
        empresa_id: 'emp_matriz_01',
        cpf: cpf.trim(),
        nome: nome.toUpperCase().trim(),
        rg: rg.trim(),
        cnh_numero: cnhNumero.trim(),
        cnh_categoria: cnhCategoria.toUpperCase().trim(),
        cnh_validade: cnhValidade,
        cnh_uf_emissao: cnhUfEmissao.toUpperCase().trim(),
        rntrc: rntrc.trim(),
        rntrc_validade: rntrcValidade,
        telefone: telefone.trim(),
        celular: celular.trim(),
        email: email.trim(),
        cidade: cidade.toUpperCase().trim(),
        uf: uf.toUpperCase().trim(),
        tipo_vinculo: tipoVinculo,
        chave_pix: chavePix.trim(),
        banco: banco.trim(),
        agencia: agencia.trim(),
        conta: conta.trim(),
        ativo: true,
      });
      onSalvo(salvo);
      onClose();
    } catch (err: any) {
      alert(`Erro ao salvar motorista: ${err}`);
    } finally {
      setIsSaving(false);
    }
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
          maxWidth: '740px',
          backgroundColor: 'var(--surface-1)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-default)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: 'var(--surface-2)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="#10b981" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {motoristaEditar ? 'Editar Condutor / Motorista' : 'Cadastrar Novo Motorista (Condutor)'}
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '75vh', overflowY: 'auto' }}>
          {isCnhVencida && (
            <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="#ef4444" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>
                Atenção: A CNH deste condutor está vencida. Não será possível emitir MDF-e ou CT-e.
              </span>
            </div>
          )}

          {/* Linha 1: CPF, Nome, RG */}
          <div style={{ display: 'grid', gridTemplateColumns: '150px 1.8fr 1.2fr', gap: '10px' }}>
            <div>
              <label className="coliseu-label">CPF *</label>
              <input
                type="text"
                className="coliseu-input"
                value={cpf}
                onChange={(e) => setCpf(maskCpf(e.target.value))}
                placeholder="000.000.000-00"
                style={{ height: '34px', fontWeight: 700 }}
              />
            </div>
            <div>
              <label className="coliseu-label">Nome Completo *</label>
              <input
                type="text"
                className="coliseu-input"
                value={nome}
                onChange={(e) => setNome(e.target.value.toUpperCase())}
                style={{ height: '34px', fontWeight: 700 }}
              />
            </div>
            <div>
              <label className="coliseu-label">RG</label>
              <input
                type="text"
                className="coliseu-input"
                value={rg}
                onChange={(e) => setRg(e.target.value)}
                style={{ height: '34px' }}
              />
            </div>
          </div>

          {/* Linha 2: CNH Número, Categoria, Validade, UF */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 100px 140px 70px', gap: '10px' }}>
            <div>
              <label className="coliseu-label">Nº CNH *</label>
              <input
                type="text"
                className="coliseu-input"
                value={cnhNumero}
                onChange={(e) => setCnhNumero(e.target.value)}
                style={{ height: '34px', fontWeight: 700 }}
              />
            </div>
            <div>
              <label className="coliseu-label">Cat. CNH *</label>
              <select
                className="coliseu-input"
                value={cnhCategoria}
                onChange={(e) => setCnhCategoria(e.target.value)}
                style={{ height: '34px', fontWeight: 700 }}
              >
                <option value="B">B (Leve)</option>
                <option value="C">C (Caminhão)</option>
                <option value="D">D (Ônibus/Micro)</option>
                <option value="E">E (Articulado/Carreta)</option>
                <option value="AE">AE (Carreta + Moto)</option>
              </select>
            </div>
            <div>
              <label className="coliseu-label">Validade CNH *</label>
              <input
                type="date"
                className="coliseu-input"
                value={cnhValidade}
                onChange={(e) => setCnhValidade(e.target.value)}
                style={{ height: '34px', fontWeight: 700 }}
              />
            </div>
            <div>
              <label className="coliseu-label">UF CNH</label>
              <input
                type="text"
                className="coliseu-input"
                value={cnhUfEmissao}
                onChange={(e) => setCnhUfEmissao(e.target.value.toUpperCase())}
                maxLength={2}
                style={{ height: '34px', textAlign: 'center', fontWeight: 700 }}
              />
            </div>
          </div>

          {/* Linha 3: RNTRC, Vínculo, Celular, E-mail */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.2fr 1.5fr', gap: '10px' }}>
            <div>
              <label className="coliseu-label">RNTRC (TAC/Condutor)</label>
              <input type="text" className="coliseu-input" value={rntrc} onChange={(e) => setRntrc(e.target.value)} style={{ height: '34px' }} />
            </div>
            <div>
              <label className="coliseu-label">Tipo de Vínculo</label>
              <select className="coliseu-input" value={tipoVinculo} onChange={(e) => setTipoVinculo(e.target.value)} style={{ height: '34px', fontWeight: 700 }}>
                <option value="PROPRIO">MOTORISTA PRÓPRIO (CLT)</option>
                <option value="TERCEIRO">TAC (AUTÔNOMO / TERCEIRO)</option>
                <option value="AGREGADO">AGREGADO</option>
              </select>
            </div>
            <div>
              <label className="coliseu-label">Celular / WhatsApp</label>
              <input type="text" className="coliseu-input" value={celular} onChange={(e) => setCelular(e.target.value)} style={{ height: '34px' }} />
            </div>
            <div>
              <label className="coliseu-label">E-mail</label>
              <input type="email" className="coliseu-input" value={email} onChange={(e) => setEmail(e.target.value)} style={{ height: '34px' }} />
            </div>
          </div>

          {/* Dados Financeiros / Depósito CIOT */}
          <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', marginBottom: '8px' }}>
              Dados Bancários para Depósito de Frete & Quitação CIOT:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 100px 120px', gap: '10px' }}>
              <div>
                <label className="coliseu-label">Chave PIX</label>
                <input type="text" className="coliseu-input" value={chavePix} onChange={(e) => setChavePix(e.target.value)} placeholder="CPF ou Chave" style={{ height: '32px' }} />
              </div>
              <div>
                <label className="coliseu-label">Banco</label>
                <input type="text" className="coliseu-input" value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="Ex: Banco do Brasil" style={{ height: '32px' }} />
              </div>
              <div>
                <label className="coliseu-label">Agência</label>
                <input type="text" className="coliseu-input" value={agencia} onChange={(e) => setAgencia(e.target.value)} style={{ height: '32px' }} />
              </div>
              <div>
                <label className="coliseu-label">Conta</label>
                <input type="text" className="coliseu-input" value={conta} onChange={(e) => setConta(e.target.value)} style={{ height: '32px' }} />
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--surface-2)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}
        >
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSalvar} disabled={isSaving} leftIcon={<Save size={14} />}>
            {isSaving ? 'Salvando...' : 'Salvar Motorista'}
          </Button>
        </div>
      </div>
    </div>
  );
};
