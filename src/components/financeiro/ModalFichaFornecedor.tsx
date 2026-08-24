import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/formatters';
import {
  Building,
  Save,
  X,
  CreditCard,
  Star,
  DollarSign,
  TrendingUp,
  Award,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  FornecedorItem,
  CategoriaFornecedor,
  StatusFornecedor,
  salvarFornecedor,
} from '../../lib/fornecedores';

interface ModalFichaFornecedorProps {
  isOpen: boolean;
  onClose: () => void;
  fornecedorEdicao?: FornecedorItem | null;
  onSaveSuccess: (fornecedor: FornecedorItem) => void;
}

export const ModalFichaFornecedor: React.FC<ModalFichaFornecedorProps> = ({
  isOpen,
  onClose,
  fornecedorEdicao,
  onSaveSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'CADASTRO' | 'BANCARIO' | 'SCORE' | 'FINANCEIRO'>('CADASTRO');

  // Estados do Formulário
  const [razaoSocial, setRazaoSocial] = useState(fornecedorEdicao?.razaoSocial || '');
  const [nomeFantasia, setNomeFantasia] = useState(fornecedorEdicao?.nomeFantasia || '');
  const [cnpjCpf, setCnpjCpf] = useState(fornecedorEdicao?.cnpjCpf || '');
  const [inscricaoEstadual, setInscricaoEstadual] = useState(fornecedorEdicao?.inscricaoEstadual || '');
  const [categoria, setCategoria] = useState<CategoriaFornecedor>(fornecedorEdicao?.categoria || 'MATERIA_PRIMA');
  const [status, setStatus] = useState<StatusFornecedor>(fornecedorEdicao?.status || 'HOMOLOGADO');
  const [email, setEmail] = useState(fornecedorEdicao?.email || '');
  const [telefone, setTelefone] = useState(fornecedorEdicao?.telefone || '');
  const [contatoResponsavel, setContatoResponsavel] = useState(fornecedorEdicao?.contatoResponsavel || '');
  const [cidade, setCidade] = useState(fornecedorEdicao?.cidade || 'DOURADOS');
  const [uf, setUf] = useState(fornecedorEdicao?.uf || 'MS');
  const [logradouro, setLogradouro] = useState(fornecedorEdicao?.logradouro || '');

  // Dados Bancários
  const [banco, setBanco] = useState(fornecedorEdicao?.dadosBancarios?.banco || '748 - SICREDI');
  const [agencia, setAgencia] = useState(fornecedorEdicao?.dadosBancarios?.agencia || '0718');
  const [conta, setConta] = useState(fornecedorEdicao?.dadosBancarios?.conta || '12345-6');
  const [tipoChavePix, setTipoChavePix] = useState(fornecedorEdicao?.dadosBancarios?.tipoChavePix || 'CNPJ');
  const [chavePix, setChavePix] = useState(fornecedorEdicao?.dadosBancarios?.chavePix || '');

  // Score
  const [scoreQualidade, setScoreQualidade] = useState(fornecedorEdicao?.scoreQualidade || 95);
  const [scorePontualidade, setScorePontualidade] = useState(fornecedorEdicao?.scorePontualidade || 92);
  const [scoreCompetitividade, setScoreCompetitividade] = useState(fornecedorEdicao?.scoreCompetitividade || 90);

  if (!isOpen) return null;

  const scoreGeralCalculado = Math.round((scoreQualidade * 0.4 + scorePontualidade * 0.4 + scoreCompetitividade * 0.2));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!razaoSocial || !cnpjCpf) {
      alert('Preencha a Razão Social e o CNPJ do fornecedor.');
      return;
    }

    const fornecedor: FornecedorItem = {
      id: fornecedorEdicao?.id || `FORN-${Date.now()}`,
      codigo: fornecedorEdicao?.codigo || `000${Math.floor(10 + Math.random() * 90)}`,
      razaoSocial: razaoSocial.toUpperCase(),
      nomeFantasia: (nomeFantasia || razaoSocial).toUpperCase(),
      cnpjCpf,
      inscricaoEstadual,
      regimeTributario: fornecedorEdicao?.regimeTributario || 'LUCRO_REAL',
      categoria,
      status,
      email: email.toLowerCase(),
      telefone,
      contatoResponsavel: contatoResponsavel.toUpperCase(),
      logradouro: logradouro.toUpperCase(),
      numero: '100',
      bairro: 'CENTRO',
      cidade: cidade.toUpperCase(),
      uf: uf.toUpperCase(),
      cep: '79800-000',
      dadosBancarios: {
        banco,
        agencia,
        conta,
        tipoConta: 'CORRENTE',
        tipoChavePix: tipoChavePix as any,
        chavePix: chavePix || cnpjCpf,
        favorecidoNome: razaoSocial.toUpperCase(),
      },
      scoreQualidade,
      scorePontualidade,
      scoreCompetitividade,
      scoreGeral: scoreGeralCalculado,
      totalCompradoAcumulado: fornecedorEdicao?.totalCompradoAcumulado || 0,
      totalTitulosEmAberto: fornecedorEdicao?.totalTitulosEmAberto || 0,
      totalTitulosPagos: fornecedorEdicao?.totalTitulosPagos || 0,
      qtdPedidosRealizados: fornecedorEdicao?.qtdPedidosRealizados || 0,
    };

    salvarFornecedor(fornecedor);
    onSaveSuccess(fornecedor);
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
          maxWidth: '880px',
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
            <Building size={20} color="#3b82f6" />
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {fornecedorEdicao ? `Ficha 360°: ${fornecedorEdicao.razaoSocial}` : 'Novo Fornecedor & Homologação'}
              </h2>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Vendor Rating, Dados Bancários PIX, Histórico de Compras e Títulos Financeiros.
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
            { key: 'CADASTRO', label: '1. Dados Cadastrais & Contato' },
            { key: 'BANCARIO', label: '2. Dados Bancários & PIX' },
            { key: 'SCORE', label: '3. Vendor Rating & Score' },
            { key: 'FINANCEIRO', label: '4. Histórico Financeiro' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: '10px 14px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab.key ? '#3b82f6' : 'var(--text-muted)',
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
          {/* ABA 1: DADOS CADASTRAIS */}
          {activeTab === 'CADASTRO' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Razão Social *</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={razaoSocial}
                    onChange={(e) => setRazaoSocial(e.target.value.toUpperCase())}
                    placeholder="Ex: SEMENTES AGROESTE LTDA"
                    style={{ height: '36px', width: '100%', fontWeight: 700 }}
                    required
                  />
                </div>
                <div>
                  <label className="coliseu-label">Nome Fantasia</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value.toUpperCase())}
                    placeholder="Ex: AGROESTE SEMENTES"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.2fr 1.2fr 120px', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">CNPJ / CPF *</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={cnpjCpf}
                    onChange={(e) => setCnpjCpf(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    style={{ height: '36px', width: '100%' }}
                    required
                  />
                </div>
                <div>
                  <label className="coliseu-label">Inscrição Estadual</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={inscricaoEstadual}
                    onChange={(e) => setInscricaoEstadual(e.target.value)}
                    placeholder="28.910.123-4"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>
                <div>
                  <label className="coliseu-label">Categoria *</label>
                  <select
                    className="coliseu-input"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as any)}
                    style={{ height: '36px', width: '100%', fontWeight: 600 }}
                  >
                    <option value="MATERIA_PRIMA">Matéria-Prima</option>
                    <option value="REVENDA_MERCADORIAS">Revenda de Mercadorias</option>
                    <option value="SEMENTES_GRAOS">🌱 Sementes & Grãos</option>
                    <option value="QUIMICOS_DEFENSIVOS">🧪 Químicos & Defensivos</option>
                    <option value="PRESTADOR_SERVICOS">Prestador de Serviços</option>
                    <option value="TRANSPORTADORA">Transportadora</option>
                    <option value="UTILIDADES_ENERGIA_AGUA_TELECOM">Utilidades (Energia/Telecom)</option>
                  </select>
                </div>
                <div>
                  <label className="coliseu-label">Status *</label>
                  <select
                    className="coliseu-input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    style={{ height: '36px', width: '100%', fontWeight: 700 }}
                  >
                    <option value="HOMOLOGADO">HOMOLOGADO</option>
                    <option value="ATIVO">ATIVO</option>
                    <option value="EM_ANALISE">EM ANÁLISE</option>
                    <option value="BLOQUEADO">BLOQUEADO</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.5fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Contato Responsável</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={contatoResponsavel}
                    onChange={(e) => setContatoResponsavel(e.target.value.toUpperCase())}
                    placeholder="Ex: MARCOS VINICIUS"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>
                <div>
                  <label className="coliseu-label">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(67) 3422-9000"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>
                <div>
                  <label className="coliseu-label">E-mail Comercial / Financeiro</label>
                  <input
                    type="email"
                    className="coliseu-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    placeholder="vendas@agroeste.com.br"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ABA 2: DADOS BANCÁRIOS & PIX */}
          {activeTab === 'BANCARIO' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 110px 140px', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Banco</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={banco}
                    onChange={(e) => setBanco(e.target.value.toUpperCase())}
                    placeholder="748 - SICREDI"
                    style={{ height: '36px', width: '100%' }}
                  />
                </div>
                <div>
                  <label className="coliseu-label">Agência</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={agencia}
                    onChange={(e) => setAgencia(e.target.value)}
                    placeholder="0718"
                    style={{ height: '36px', width: '100%', textAlign: 'center' }}
                  />
                </div>
                <div>
                  <label className="coliseu-label">Conta Corrente</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={conta}
                    onChange={(e) => setConta(e.target.value)}
                    placeholder="88912-4"
                    style={{ height: '36px', width: '100%', textAlign: 'center' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Tipo Chave PIX</label>
                  <select
                    className="coliseu-input"
                    value={tipoChavePix}
                    onChange={(e) => setTipoChavePix(e.target.value as any)}
                    style={{ height: '36px', width: '100%' }}
                  >
                    <option value="CNPJ">CNPJ</option>
                    <option value="CPF">CPF</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="TELEFONE">Telefone</option>
                    <option value="ALEATORIA">Chave Aleatória</option>
                  </select>
                </div>
                <div>
                  <label className="coliseu-label">Chave PIX para Liquidação Automática</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={chavePix}
                    onChange={(e) => setChavePix(e.target.value)}
                    placeholder="Ex: 01.234.567/0001-88 ou financeiro@agroeste.com.br"
                    style={{ height: '36px', width: '100%', fontFamily: 'monospace' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: VENDOR RATING & SCORE */}
          {activeTab === 'SCORE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ border: '1px solid var(--border-default)', padding: '12px', borderRadius: '6px', backgroundColor: 'var(--surface-2)' }}>
                  <label className="coliseu-label">Qualidade da Mercadoria (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={scoreQualidade}
                    onChange={(e) => setScoreQualidade(parseInt(e.target.value, 10) || 0)}
                    className="coliseu-input"
                    style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700, fontSize: '15px' }}
                  />
                </div>

                <div style={{ border: '1px solid var(--border-default)', padding: '12px', borderRadius: '6px', backgroundColor: 'var(--surface-2)' }}>
                  <label className="coliseu-label">Pontualidade na Entrega (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={scorePontualidade}
                    onChange={(e) => setScorePontualidade(parseInt(e.target.value, 10) || 0)}
                    className="coliseu-input"
                    style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700, fontSize: '15px' }}
                  />
                </div>

                <div style={{ border: '1px solid var(--border-default)', padding: '12px', borderRadius: '6px', backgroundColor: 'var(--surface-2)' }}>
                  <label className="coliseu-label">Competitividade de Preço (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={scoreCompetitividade}
                    onChange={(e) => setScoreCompetitividade(parseInt(e.target.value, 10) || 0)}
                    className="coliseu-input"
                    style={{ height: '36px', width: '100%', textAlign: 'center', fontWeight: 700, fontSize: '15px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(59, 130, 246, 0.08)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Score Geral Homologado (Vendor Rating)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Média ponderada: 40% Qualidade + 40% Pontualidade + 20% Preço
                  </div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#3b82f6' }}>
                  {scoreGeralCalculado} / 100
                </div>
              </div>
            </div>
          )}

          {/* ABA 4: HISTÓRICO FINANCEIRO */}
          {activeTab === 'FINANCEIRO' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div className="coliseu-card" style={{ padding: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Comprado Acumulado</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', margin: '4px 0' }}>
                  {formatCurrency(fornecedorEdicao?.totalCompradoAcumulado || 0)}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{fornecedorEdicao?.qtdPedidosRealizados || 0} pedidos realizados</div>
              </div>

              <div className="coliseu-card" style={{ padding: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Títulos em Aberto a Pagar</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444', fontFamily: 'monospace', margin: '4px 0' }}>
                  {formatCurrency(fornecedorEdicao?.totalTitulosEmAberto || 0)}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>A vencer / compromissos</div>
              </div>

              <div className="coliseu-card" style={{ padding: '14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Títulos Totalmente Pagos</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace', margin: '4px 0' }}>
                  {formatCurrency(fornecedorEdicao?.totalTitulosPagos || 0)}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Histórico quitado</div>
              </div>
            </div>
          )}

          {/* Footer de Ação */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" leftIcon={<Save size={16} />}>
              Salvar Fornecedor 360°
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
