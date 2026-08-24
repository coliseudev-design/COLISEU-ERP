import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Edit2, Plus, Power, PowerOff, CheckCircle2, X, ShieldAlert, ShieldCheck, Wallet } from 'lucide-react';

interface Caixa {
  id: string;
  nome: string;
  filial: string;
  ativo: boolean;
}

const DEFAULT_CAIXAS: Caixa[] = [
  { id: '1', nome: 'CAIXA PADRÃO', filial: 'MATRIZ - DOURADOS/MS', ativo: true },
  { id: '2', nome: 'CAIXA 02', filial: 'MATRIZ - DOURADOS/MS', ativo: true },
  { id: '3', nome: 'CAIXA RESERVA', filial: 'MATRIZ - DOURADOS/MS', ativo: false },
];

export const CaixasPage: React.FC = () => {
  const [caixas, setCaixas] = useState<Caixa[]>(() => {
    try {
      const saved = localStorage.getItem('coliseu_caixas');
      return saved ? JSON.parse(saved) : DEFAULT_CAIXAS;
    } catch {
      return DEFAULT_CAIXAS;
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCaixa, setEditingCaixa] = useState<Caixa | null>(null);

  // Form State
  const [nome, setNome] = useState('');
  const [filial, setFilial] = useState('MATRIZ - DOURADOS/MS');
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem('coliseu_caixas', JSON.stringify(caixas));
    } catch (err: any) {
      console.error(err);
    }
  }, [caixas]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenModal = (caixa?: Caixa) => {
    if (caixa) {
      setEditingCaixa(caixa);
      setNome(caixa.nome);
      setFilial(caixa.filial);
      setAtivo(caixa.ativo);
    } else {
      setEditingCaixa(null);
      setNome('');
      setFilial('MATRIZ - DOURADOS/MS');
      setAtivo(true);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCaixa(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = nome.trim().toUpperCase();
    if (!nomeLimpo) return;

    if (editingCaixa) {
      setCaixas(caixas.map(c => c.id === editingCaixa.id ? { ...c, nome: nomeLimpo, filial, ativo } : c));
      showToast(`✅ Caixa '${nomeLimpo}' atualizado com sucesso!`);
    } else {
      const newCaixa: Caixa = {
        id: String(caixas.length + 1),
        nome: nomeLimpo,
        filial,
        ativo,
      };
      setCaixas([...caixas, newCaixa]);
      showToast(`✅ Caixa '${nomeLimpo}' cadastrado com sucesso!`);
    }
    handleCloseModal();
  };

  const handleToggleStatus = (id: string) => {
    setCaixas(caixas.map(c => {
      if (c.id === id) {
        const novoStatus = !c.ativo;
        showToast(novoStatus ? `✅ Caixa '${c.nome}' ativado com sucesso!` : `⚠️ Caixa '${c.nome}' inativado.`);
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
        title="Cadastro de Caixas"
        description="Gestão de caixas físicos e pontos de venda (PDV) do sistema."
        breadcrumbItems={[
          { label: 'Financeiro', active: false },
          { label: 'Cadastro de Caixas', active: true },
        ]}
        primaryAction={{
          label: 'Novo Caixa',
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
          <strong>Proteção de Auditoria Financeira:</strong> Caixas não podem ser excluídos para evitar corrupção do histórico de fechamentos e sangrias. Utilize o botão <strong>Inativar</strong> para suspender o uso.
        </span>
      </div>

      <div className="coliseu-card">
        <div className="coliseu-table-container">
          <table className="coliseu-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Código</th>
                <th>Nome do Caixa</th>
                <th>Filial</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Status</th>
                <th style={{ width: '220px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {caixas.map(caixa => (
                <tr key={caixa.id}>
                  <td className="text-mono" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                    {caixa.id.padStart(4, '0')}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Wallet size={15} color="var(--text-secondary)" />
                      {caixa.nome}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{caixa.filial}</td>
                  <td style={{ textAlign: 'center' }}>
                    <StatusBadge status={caixa.ativo ? 'success' : 'muted'} label={caixa.ativo ? 'Ativo' : 'Inativo'} />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                      {/* Botão Editar */}
                      <button
                        type="button"
                        onClick={() => handleOpenModal(caixa)}
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
                        title="Editar Nome e Filial do Caixa"
                      >
                        <Edit2 size={13} />
                        <span>Editar</span>
                      </button>

                      {/* Botão Inativar / Ativar */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(caixa.id)}
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
                          backgroundColor: caixa.ativo ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                          borderColor: caixa.ativo ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                          color: caixa.ativo ? '#ef4444' : '#10b981',
                        }}
                        title={caixa.ativo ? 'Inativar Caixa (Não deleta lançamentos anteriores)' : 'Reativar Caixa'}
                      >
                        {caixa.ativo ? <PowerOff size={13} /> : <Power size={13} />}
                        <span>{caixa.ativo ? 'Inativar' : 'Ativar'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {caixas.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    Nenhum caixa cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação / Edição */}
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
              maxWidth: '540px',
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
                <Wallet size={18} color="#3b82f6" />
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {editingCaixa ? 'Editar Caixa' : 'Cadastrar Novo Caixa'}
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
              <div>
                <label className="coliseu-label">Nome de Identificação do Caixa *</label>
                <input
                  type="text"
                  className="coliseu-input"
                  value={nome}
                  onChange={e => setNome(e.target.value.toUpperCase())}
                  required
                  placeholder="Ex: CAIXA 01 - BALCÃO PRINCIPAL"
                  style={{ height: '38px', width: '100%', textTransform: 'uppercase' }}
                />
              </div>

              <div>
                <label className="coliseu-label">Filial de Vinculação *</label>
                <select
                  className="coliseu-input"
                  value={filial}
                  onChange={e => setFilial(e.target.value)}
                  style={{ height: '38px', width: '100%' }}
                >
                  <option value="MATRIZ - DOURADOS/MS">MATRIZ - DOURADOS/MS</option>
                </select>
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
                  id="ativo-checkbox"
                  checked={ativo}
                  onChange={e => setAtivo(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="ativo-checkbox" style={{ fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>
                  Caixa Ativo para Operações
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                <Button variant="secondary" type="button" onClick={handleCloseModal}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" leftIcon={<CheckCircle2 size={15} />}>
                  {editingCaixa ? 'Salvar Alterações' : 'Cadastrar Caixa'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
