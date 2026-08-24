import React, { useState, useEffect } from 'react';
import { Funcionario, createEmptyFuncionario, funcionariosService } from '../../lib/funcionarios';
import { X, Check } from 'lucide-react';

interface ModalCadastroFuncionarioProps {
  isOpen: boolean;
  onClose: () => void;
  funcionario?: Funcionario | null;
  onSaved: () => void;
  gruposAcesso?: Array<{ id: string; nome: string }>;
}

const TABS = [
  { key: 'pessoal', label: 'Dados Pessoais', icon: '🧑' },
  { key: 'profissional', label: 'Profissional & RH', icon: '💼' },
  { key: 'acesso', label: 'Acesso ao Sistema', icon: '🔐' },
  { key: 'comissoes', label: 'Comissões', icon: '💰' },
  { key: 'metas', label: 'Metas', icon: '🎯' },
  { key: 'filiais', label: 'Filiais & Permissões', icon: '🏢' },
];

const BR_STATES = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

export const ModalCadastroFuncionario: React.FC<ModalCadastroFuncionarioProps> = ({
  isOpen,
  onClose,
  funcionario,
  onSaved,
  gruposAcesso = []
}) => {
  const [activeTab, setActiveTab] = useState(TABS[0].key);
  const [form, setForm] = useState<Funcionario>(createEmptyFuncionario('default'));
  const [senhaPlain, setSenhaPlain] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listaGrupos, setListaGrupos] = useState<Array<{ id: string; nome: string }>>(gruposAcesso);

  useEffect(() => {
    if (isOpen) {
      if (funcionario) {
        setForm(funcionario);
      } else {
        setForm(createEmptyFuncionario('default'));
      }
      setSenhaPlain('');
      setConfirmarSenha('');
      setActiveTab(TABS[0].key);

      // Carrega grupos de acesso do backend
      funcionariosService.listarGrupos().then(grps => {
        if (grps && grps.length > 0) {
          setListaGrupos(grps.map(g => ({ id: g.id, nome: g.nome })));
        }
      }).catch(err => {
        console.error("Erro ao carregar grupos para o modal de funcionário:", err);
      });
    }
  }, [isOpen, funcionario]);

  if (!isOpen) return null;

  const updateField = (field: keyof Funcionario, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  // === Máscaras de Input ===
  const maskTelefone = (v: string): string => {
    const digits = v.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 2) return digits.length ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  };

  const maskCelular = (v: string): string => {
    const digits = v.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : '';
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const maskCep = (v: string): string => {
    const digits = v.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const maskCpfCnpj = (v: string): string => {
    const digits = v.replace(/\D/g, '');
    if (digits.length <= 11) {
      // CPF: 000.000.000-00
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
      if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
    }
    // CNPJ: 00.000.000/0000-00
    const d = digits.slice(0, 14);
    if (d.length <= 2) return d;
    if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
    if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
    if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  };

  const handleSave = async () => {
    if (!form.nome) {
      alert("O nome é obrigatório!");
      return;
    }
    if (form.tem_acesso_sistema) {
      if ((!funcionario || senhaPlain) && senhaPlain !== confirmarSenha) {
        alert("As senhas não coincidem!");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await funcionariosService.salvar(form, senhaPlain || undefined);
      onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar funcionário");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSectionDivider = (title: string) => (
    <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-subtle)', margin: '8px 0', paddingTop: '12px' }}>
      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</span>
    </div>
  );

  return (
    <>
      <div className="coliseu-overlay" onClick={onClose} />
      <div className="coliseu-modal" style={{ maxWidth: '1100px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            padding: 'var(--spacing-3) var(--spacing-4)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {funcionario ? 'Editar Funcionário' : 'Novo Funcionário'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 var(--spacing-4)', gap: '16px', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: 'none',
                border: 'none',
                padding: 'var(--spacing-3) 0',
                borderBottom: `2px solid ${activeTab === tab.key ? 'var(--action-primary)' : 'transparent'}`,
                color: activeTab === tab.key ? 'var(--action-primary)' : 'var(--text-muted)',
                fontWeight: activeTab === tab.key ? 600 : 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-4)' }}>
          {activeTab === 'pessoal' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="coliseu-label">Nome *</label>
                <input required type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.nome} onChange={e => updateField('nome', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">Apelido</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.apelido || ''} onChange={e => updateField('apelido', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">Tipo Pessoa</label>
                <select className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.tipo_pessoa} onChange={e => updateField('tipo_pessoa', e.target.value)}>
                  <option value="FISICA">FISICA</option>
                  <option value="JURIDICA">JURIDICA</option>
                </select>
              </div>
              <div>
                <label className="coliseu-label">CPF/CNPJ</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} placeholder="000.000.000-00" maxLength={18} value={form.cpf_cnpj || ''} onChange={e => updateField('cpf_cnpj', maskCpfCnpj(e.target.value))} />
              </div>
              <div>
                <label className="coliseu-label">RG</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.rg || ''} onChange={e => updateField('rg', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">CNH</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.cnh || ''} onChange={e => updateField('cnh', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">Data Nascimento</label>
                <input type="date" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.data_nascimento || ''} onChange={e => updateField('data_nascimento', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">Estado Civil</label>
                <select className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.estado_civil || ''} onChange={e => updateField('estado_civil', e.target.value)}>
                  <option value="">Selecione...</option>
                  <option value="Solteiro">Solteiro</option>
                  <option value="Casado">Casado</option>
                  <option value="Divorciado">Divorciado</option>
                  <option value="Viúvo">Viúvo</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="coliseu-label">Gênero</label>
                <select className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.genero || ''} onChange={e => updateField('genero', e.target.value)}>
                  <option value="">Selecione...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="coliseu-label">Email</label>
                <input type="email" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.email || ''} onChange={e => updateField('email', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">Telefone</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} placeholder="(00) 0000-0000" maxLength={15} value={form.telefone || ''} onChange={e => updateField('telefone', maskTelefone(e.target.value))} />
              </div>
              <div>
                <label className="coliseu-label">Celular</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} placeholder="(00) 00000-0000" maxLength={16} value={form.celular || ''} onChange={e => updateField('celular', maskCelular(e.target.value))} />
              </div>

              {renderSectionDivider('Endereço')}
              
              <div>
                <label className="coliseu-label">CEP</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} placeholder="00000-000" maxLength={9} value={form.cep || ''} onChange={e => updateField('cep', maskCep(e.target.value))} />
              </div>
              <div>
                <label className="coliseu-label">Endereço</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.endereco || ''} onChange={e => updateField('endereco', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">Número</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.numero || ''} onChange={e => updateField('numero', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">Complemento</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.complemento || ''} onChange={e => updateField('complemento', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">Bairro</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.bairro || ''} onChange={e => updateField('bairro', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">Cidade</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.cidade || ''} onChange={e => updateField('cidade', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">UF</label>
                <select className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.uf || ''} onChange={e => updateField('uf', e.target.value)}>
                  <option value="">Selecione...</option>
                  {BR_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label className="coliseu-label">Observações</label>
                <textarea className="coliseu-input" style={{ width: '100%', minHeight: '80px', padding: '8px' }} value={form.observacoes || ''} onChange={e => updateField('observacoes', e.target.value)} />
              </div>
            </div>
          )}

          {activeTab === 'profissional' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="coliseu-label">Tipo Funcionário *</label>
                <select className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.tipo_funcionario} onChange={e => updateField('tipo_funcionario', e.target.value as any)}>
                  <option value="USUARIO">USUARIO</option>
                  <option value="FUNCIONARIO">FUNCIONARIO</option>
                  <option value="VENDEDOR">VENDEDOR</option>
                  <option value="MOTORISTA">MOTORISTA</option>
                  <option value="RESP_TECNICO">RESP_TECNICO</option>
                  <option value="ENCARREGADO">ENCARREGADO</option>
                  <option value="REPRESENTANTE">REPRESENTANTE</option>
                </select>
              </div>
              <div>
                <label className="coliseu-label">Cargo</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.cargo || ''} onChange={e => updateField('cargo', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">Departamento</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.departamento || ''} onChange={e => updateField('departamento', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">Salário (R$)</label>
                <input type="number" step="0.01" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.salario} onChange={e => updateField('salario', Number(e.target.value))} />
              </div>
              <div>
                <label className="coliseu-label">Data Admissão</label>
                <input type="date" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.data_admissao || ''} onChange={e => updateField('data_admissao', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">Data Demissão</label>
                <input type="date" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.data_demissao || ''} onChange={e => updateField('data_demissao', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">Formação</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.formacao || ''} onChange={e => updateField('formacao', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">PIS/PASEP</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.pis_pasep || ''} onChange={e => updateField('pis_pasep', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">CTPS Número</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.ctps_numero || ''} onChange={e => updateField('ctps_numero', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">CTPS Série</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.ctps_serie || ''} onChange={e => updateField('ctps_serie', e.target.value)} />
              </div>
            </div>
          )}

          {activeTab === 'acesso' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="tem_acesso" checked={form.tem_acesso_sistema === 1} onChange={e => updateField('tem_acesso_sistema', e.target.checked ? 1 : 0)} />
                <label htmlFor="tem_acesso" className="coliseu-label" style={{ marginBottom: 0 }}>Tem Acesso ao Sistema</label>
              </div>

              {form.tem_acesso_sistema === 1 && (
                <>
                  <div>
                    <label className="coliseu-label">Username</label>
                    <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.username || ''} onChange={e => updateField('username', e.target.value)} />
                  </div>
                  <div>
                    <label className="coliseu-label">Grupo de Acesso</label>
                    <select className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.grupo_acesso_id || ''} onChange={e => updateField('grupo_acesso_id', e.target.value)}>
                      <option value="">Selecione um Grupo de Acesso...</option>
                      {listaGrupos.map(g => (
                        <option key={g.id} value={g.id}>{g.nome}</option>
                      ))}
                    </select>
                  </div>
                  
                  {(!funcionario || senhaPlain || true) && (
                    <>
                      <div>
                        <label className="coliseu-label">Senha {funcionario ? '(Preencha para alterar)' : '*'}</label>
                        <input type="password" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={senhaPlain} onChange={e => setSenhaPlain(e.target.value)} />
                      </div>
                      <div>
                        <label className="coliseu-label">Confirmar Senha</label>
                        <input type="password" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} />
                      </div>
                    </>
                  )}
                  
                  <div>
                    <label className="coliseu-label">Status</label>
                    <select className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.status} onChange={e => updateField('status', e.target.value as any)}>
                      <option value="ATIVO">ATIVO</option>
                      <option value="INATIVO">INATIVO</option>
                      <option value="BLOQUEADO">BLOQUEADO</option>
                      <option value="FERIAS">FÉRIAS</option>
                      <option value="AFASTADO">AFASTADO</option>
                    </select>
                  </div>
                  <div>
                    <label className="coliseu-label">Data Validade do Acesso</label>
                    <input type="date" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.data_validade_acesso || ''} onChange={e => updateField('data_validade_acesso', e.target.value)} />
                  </div>
                  <div>
                    <label className="coliseu-label">Caixa PDV Vinculado</label>
                    <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.caixa_pdv_vinculado || ''} onChange={e => updateField('caixa_pdv_vinculado', e.target.value)} />
                  </div>
                  
                  <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" id="forcar_senha" checked={form.forcar_troca_senha === 1} onChange={e => updateField('forcar_troca_senha', e.target.checked ? 1 : 0)} />
                    <label htmlFor="forcar_senha" className="coliseu-label" style={{ marginBottom: 0 }}>Forçar Troca de Senha no Próximo Login</label>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'comissoes' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="coliseu-label">Código Vendedor</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.vendedor_codigo || ''} onChange={e => updateField('vendedor_codigo', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">Tipo Vendedor</label>
                <select className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.tipo_vendedor || ''} onChange={e => updateField('tipo_vendedor', e.target.value)}>
                  <option value="">Selecione...</option>
                  <option value="INTERNO">INTERNO</option>
                  <option value="EXTERNO_PJ">EXTERNO PJ</option>
                  <option value="REPRESENTANTE">REPRESENTANTE</option>
                </select>
              </div>
              <div>
                <label className="coliseu-label">Comissão Padrão %</label>
                <input type="number" step="0.01" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.comissao_percentual} onChange={e => updateField('comissao_percentual', Number(e.target.value))} />
              </div>
              <div>
                <label className="coliseu-label">Tipo Cálculo</label>
                <select className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.comissao_tipo_calculo} onChange={e => updateField('comissao_tipo_calculo', e.target.value)}>
                  <option value="PERCENTUAL_DIRETO">PERCENTUAL DIRETO</option>
                  <option value="MARGEM_LUCRO">MARGEM DE LUCRO</option>
                  <option value="POR_CATEGORIA">POR CATEGORIA</option>
                  <option value="ESCALONADO">ESCALONADO</option>
                </select>
              </div>

              {renderSectionDivider('Regra de Liberação')}
              <div>
                <label className="coliseu-label">% Liberado na Emissão da NF</label>
                <input type="number" step="0.01" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.comissao_libera_emissao_pct} onChange={e => updateField('comissao_libera_emissao_pct', Number(e.target.value))} />
              </div>
              <div>
                <label className="coliseu-label">% Liberado na Baixa/Recebimento</label>
                <input type="number" step="0.01" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.comissao_libera_baixa_pct} onChange={e => updateField('comissao_libera_baixa_pct', Number(e.target.value))} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Os dois valores devem somar 100%</span>
              </div>

              {renderSectionDivider('Deduções da Base de Cálculo')}
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="desc_icms" checked={form.comissao_desconta_icms === 1} onChange={e => updateField('comissao_desconta_icms', e.target.checked ? 1 : 0)} />
                  <label htmlFor="desc_icms" className="coliseu-label" style={{ marginBottom: 0 }}>Desconta ICMS</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="desc_pis" checked={form.comissao_desconta_pis_cofins === 1} onChange={e => updateField('comissao_desconta_pis_cofins', e.target.checked ? 1 : 0)} />
                  <label htmlFor="desc_pis" className="coliseu-label" style={{ marginBottom: 0 }}>Desconta PIS/COFINS</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="inclui_ipi" checked={form.comissao_inclui_ipi === 1} onChange={e => updateField('comissao_inclui_ipi', e.target.checked ? 1 : 0)} />
                  <label htmlFor="inclui_ipi" className="coliseu-label" style={{ marginBottom: 0 }}>Inclui IPI</label>
                </div>
              </div>

              {renderSectionDivider('Outros')}
              <div>
                <label className="coliseu-label">Dia Fixo de Pagamento (1-31)</label>
                <input type="number" min="1" max="31" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.comissao_dia_pagamento} onChange={e => updateField('comissao_dia_pagamento', Number(e.target.value))} />
              </div>
              <div>
                <label className="coliseu-label">Desconto Máximo Permitido %</label>
                <input type="number" step="0.01" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.desconto_maximo_permitido} onChange={e => updateField('desconto_maximo_permitido', Number(e.target.value))} />
              </div>
              <div>
                <label className="coliseu-label">Supervisor (ID)</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.supervisor_id || ''} onChange={e => updateField('supervisor_id', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">Gerente (ID)</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.gerente_id || ''} onChange={e => updateField('gerente_id', e.target.value)} />
              </div>

              {renderSectionDivider('Dados Bancários para Pagamento')}
              <div>
                <label className="coliseu-label">Banco Favorecido</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.banco_favorecido || ''} onChange={e => updateField('banco_favorecido', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">Agência</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.agencia || ''} onChange={e => updateField('agencia', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">Conta Corrente</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.conta_corrente || ''} onChange={e => updateField('conta_corrente', e.target.value)} />
              </div>
              <div>
                <label className="coliseu-label">Chave PIX</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.chave_pix || ''} onChange={e => updateField('chave_pix', e.target.value)} />
              </div>
            </div>
          )}

          {activeTab === 'metas' && (
            <div style={{ padding: 'var(--spacing-4)', textAlign: 'center', color: 'var(--text-muted)' }}>
              Metas de vendas serão configuradas após salvar o cadastro do funcionário.
            </div>
          )}

          {activeTab === 'filiais' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" id="acesso_todas" checked={form.acesso_todas_empresas === 1} onChange={e => updateField('acesso_todas_empresas', e.target.checked ? 1 : 0)} />
                <label htmlFor="acesso_todas" className="coliseu-label" style={{ marginBottom: 0 }}>Acesso a Todas as Empresas</label>
              </div>
              <div>
                <label className="coliseu-label">Filial Padrão</label>
                <input type="text" className="coliseu-input" style={{ width: '100%', height: '36px' }} value={form.filial_padrao_id || ''} onChange={e => updateField('filial_padrao_id', e.target.value)} />
              </div>
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  As permissões de acesso são definidas pelo Grupo de Acesso vinculado na aba "Acesso ao Sistema".
                </p>
              </div>
            </div>
          )}
        </div>

        <div style={{
          padding: 'var(--spacing-3) var(--spacing-4)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px'
        }}>
          <button type="button" onClick={onClose} className="coliseu-btn coliseu-btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} className="coliseu-btn coliseu-btn-primary" disabled={isSubmitting}>
            <Check size={16} />
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </>
  );
};
