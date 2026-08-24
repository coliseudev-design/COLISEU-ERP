import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Edit2, Plus, Power, PowerOff, CheckCircle2, X, Landmark, ShieldCheck } from 'lucide-react';

interface ContaBancaria {
  id: string;
  banco: string;
  agencia: string;
  conta: string;
  tipo: string;
  convenio?: string;
  carteira?: string;
  pix?: string;
  ativo: boolean;
}

const DEFAULT_CONTAS: ContaBancaria[] = [
  { id: '1', banco: '748 - SICREDI', agencia: '0718', conta: '45123-8', tipo: 'Conta Corrente', ativo: true },
  { id: '2', banco: '001 - BANCO DO BRASIL', agencia: '3507', conta: '12890-2', tipo: 'Conta Corrente', ativo: true },
  { id: '3', banco: '104 - CAIXA ECONOMICA', agencia: '0432', conta: '900123-5', tipo: 'Poupança', ativo: false },
];

export const ContasBancariasPage: React.FC = () => {
  const [contas, setContas] = useState<ContaBancaria[]>(() => {
    try {
      const saved = localStorage.getItem('coliseu_contas_bancarias');
      return saved ? JSON.parse(saved) : DEFAULT_CONTAS;
    } catch {
      return DEFAULT_CONTAS;
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<ContaBancaria | null>(null);

  // Form State
  const [banco, setBanco] = useState('001 - BANCO DO BRASIL');
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [digito, setDigito] = useState('');
  const [tipo, setTipo] = useState('Conta Corrente');
  const [convenio, setConvenio] = useState('');
  const [carteira, setCarteira] = useState('');
  const [pix, setPix] = useState('');
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem('coliseu_contas_bancarias', JSON.stringify(contas));
    } catch (err: any) {
      console.error(err);
    }
  }, [contas]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenModal = (c?: ContaBancaria) => {
    if (c) {
      setEditingConta(c);
      setBanco(c.banco);
      setAgencia(c.agencia);
      const parts = c.conta.split('-');
      setConta(parts[0] || '');
      setDigito(parts[1] || '');
      setTipo(c.tipo);
      setAtivo(c.ativo);
      setConvenio(c.convenio || '');
      setCarteira(c.carteira || '');
      setPix(c.pix || '');
    } else {
      setEditingConta(null);
      setBanco('001 - BANCO DO BRASIL');
      setAgencia('');
      setConta('');
      setDigito('');
      setTipo('Conta Corrente');
      setConvenio('');
      setCarteira('');
      setPix('');
      setAtivo(true);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingConta(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const contaFormatada = digito ? `${conta.trim()}-${digito.trim()}` : conta.trim();

    if (editingConta) {
      setContas(contas.map(c => c.id === editingConta.id ? {
        ...c,
        banco: banco.toUpperCase(),
        agencia: agencia.trim().toUpperCase(),
        conta: contaFormatada.toUpperCase(),
        tipo,
        convenio: convenio.trim().toUpperCase(),
        carteira: carteira.trim().toUpperCase(),
        pix: pix.trim().toUpperCase(),
        ativo,
      } : c));
      showToast(`✅ Conta '${banco} - ${contaFormatada}' atualizada com sucesso!`);
    } else {
      const newConta: ContaBancaria = {
        id: String(contas.length + 1),
        banco: banco.toUpperCase(),
        agencia: agencia.trim().toUpperCase(),
        conta: contaFormatada.toUpperCase(),
        tipo,
        convenio: convenio.trim().toUpperCase(),
        carteira: carteira.trim().toUpperCase(),
        pix: pix.trim().toUpperCase(),
        ativo,
      };
      setContas([...contas, newConta]);
      showToast(`✅ Conta bancária criada com sucesso!`);
    }
    handleCloseModal();
  };

  const handleToggleStatus = (id: string) => {
    setContas(contas.map(c => {
      if (c.id === id) {
        const novoStatus = !c.ativo;
        showToast(novoStatus ? `✅ Conta '${c.banco}' ativada com sucesso!` : `⚠️ Conta '${c.banco}' inativada.`);
        return { ...c, ativo: novoStatus };
      }
      return c;
    }));
  };

  return (
    <div className="coliseu-page" style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <CheckCircle2 size={16} style={{ color: 'var(--status-success)' }} />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{toastMessage}</span>
          </div>
        </div>
      )}

      <PageHeader
        title="Cadastro de Contas Bancárias"
        description="Gestão de contas correntes, poupança e investimento vinculadas à empresa."
        breadcrumbItems={[
          { label: 'Financeiro', active: false },
          { label: 'Contas Bancárias', active: true },
        ]}
        primaryAction={{
          label: 'Nova Conta',
          onClick: () => handleOpenModal(),
          icon: <Plus size={14} aria-hidden="true" />,
        }}
      />

      {/* Aviso de Proteção Contábil */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          backgroundColor: 'rgba(59, 130, 246, 0.06)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '14px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
        }}
      >
        <ShieldCheck size={16} color="#3b82f6" />
        <span>
          <strong>Proteção de Integridade Financeira:</strong> Contas Bancárias não podem ser excluídas para manter a rastreabilidade do extrato OFX e conciliações. Utilize a opção <strong>Inativar</strong> para suspender novas emissões de boletos ou cobranças.
        </span>
      </div>

      <div className="coliseu-card">
        <div className="coliseu-table-container">
          <table className="coliseu-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Código</th>
                <th>Instituição Bancária</th>
                <th style={{ width: '100px' }}>Agência</th>
                <th style={{ width: '130px' }}>Conta</th>
                <th style={{ width: '130px' }}>Tipo</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '220px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contas.map(c => (
                <tr key={c.id}>
                  <td className="text-mono" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                    {c.id.padStart(4, '0')}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Landmark size={15} color="#3b82f6" />
                      {c.banco}
                    </div>
                  </td>
                  <td className="text-mono">{c.agencia}</td>
                  <td className="text-mono" style={{ fontWeight: 600 }}>{c.conta}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>{c.tipo}</td>
                  <td style={{ textAlign: 'center' }}>
                    <StatusBadge status={c.ativo ? 'success' : 'muted'} label={c.ativo ? 'Ativa' : 'Inativa'} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                      {/* Botão Editar */}
                      <button
                        type="button"
                        onClick={() => handleOpenModal(c)}
                        className="coliseu-btn coliseu-btn-secondary"
                        style={{
                          height: '30px',
                          padding: '0 12px',
                          fontSize: '11px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                        title="Editar Dados da Conta Bancária"
                      >
                        <Edit2 size={13} />
                        <span>Editar</span>
                      </button>

                      {/* Botão Inativar / Ativar */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(c.id)}
                        className="coliseu-btn"
                        style={{
                          height: '30px',
                          padding: '0 12px',
                          fontSize: '11px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          backgroundColor: c.ativo ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                          borderColor: c.ativo ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                          color: c.ativo ? '#ef4444' : '#10b981',
                        }}
                        title={c.ativo ? 'Inativar Conta (Não apaga extratos nem conciliações)' : 'Reativar Conta'}
                      >
                        {c.ativo ? <PowerOff size={13} /> : <Power size={13} />}
                        <span>{c.ativo ? 'Inativar' : 'Ativar'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {contas.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Nenhuma conta bancária cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro / Edição */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 11000,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '680px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Landmark size={18} color="#3b82f6" />
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {editingConta ? 'Editar Conta Bancária' : 'Cadastrar Nova Conta Bancária'}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                <div>
                  <label className="coliseu-label">Banco *</label>
                  <select
                    className="coliseu-input"
                    value={banco}
                    onChange={e => setBanco(e.target.value)}
                    style={{ height: '38px', width: '100%' }}
                    required
                  >
                    <option value="001 - BANCO DO BRASIL">001 - BANCO DO BRASIL</option>
                    <option value="033 - SANTANDER">033 - SANTANDER</option>
                    <option value="104 - CAIXA ECONOMICA">104 - CAIXA ECONOMICA</option>
                    <option value="237 - BRADESCO">237 - BRADESCO</option>
                    <option value="341 - ITAU">341 - ITAU</option>
                    <option value="748 - SICREDI">748 - SICREDI</option>
                    <option value="756 - SICOOB">756 - SICOOB</option>
                    <option value="260 - NUBANK">260 - NUBANK</option>
                    <option value="077 - BANCO INTER">077 - BANCO INTER</option>
                  </select>
                </div>

                <div>
                  <label className="coliseu-label">Tipo de Conta *</label>
                  <select
                    className="coliseu-input"
                    value={tipo}
                    onChange={e => setTipo(e.target.value)}
                    style={{ height: '38px', width: '100%' }}
                    required
                  >
                    <option value="Conta Corrente">Conta Corrente</option>
                    <option value="Poupança">Poupança</option>
                    <option value="Conta Pagamento">Conta Pagamento</option>
                    <option value="Investimento">Investimento</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 80px', gap: '12px' }}>
                <div>
                  <label className="coliseu-label">Agência (Sem Dígito) *</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={agencia}
                    onChange={e => setAgencia(e.target.value.toUpperCase())}
                    required
                    placeholder="Ex: 0718"
                    style={{ height: '38px', width: '100%' }}
                  />
                </div>
                <div>
                  <label className="coliseu-label">Número da Conta *</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={conta}
                    onChange={e => setConta(e.target.value.toUpperCase())}
                    required
                    placeholder="Ex: 45123"
                    style={{ height: '38px', width: '100%' }}
                  />
                </div>
                <div>
                  <label className="coliseu-label">Dígito</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={digito}
                    onChange={e => setDigito(e.target.value.toUpperCase())}
                    placeholder="8"
                    maxLength={2}
                    style={{ height: '38px', width: '100%', textAlign: 'center' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="coliseu-label">Convênio de Cobrança / Carteira (Opcional)</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={convenio}
                    onChange={e => setConvenio(e.target.value.toUpperCase())}
                    placeholder="Ex: 123456 / 17-019"
                    style={{ height: '38px', width: '100%' }}
                  />
                </div>
                <div>
                  <label className="coliseu-label">Chave PIX Vinculada (Opcional)</label>
                  <input
                    type="text"
                    className="coliseu-input"
                    value={pix}
                    onChange={e => setPix(e.target.value)}
                    placeholder="CNPJ, E-mail ou Chave Aleatória"
                    style={{ height: '38px', width: '100%' }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  backgroundColor: 'var(--surface-2)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <input
                  type="checkbox"
                  id="conta-ativa-checkbox"
                  checked={ativo}
                  onChange={e => setAtivo(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="conta-ativa-checkbox" style={{ fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>
                  Conta Bancária Ativa para Lançamentos e Cobranças
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                <Button variant="secondary" type="button" onClick={handleCloseModal}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" leftIcon={<CheckCircle2 size={15} />}>
                  {editingConta ? 'Salvar Alterações' : 'Cadastrar Conta'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
