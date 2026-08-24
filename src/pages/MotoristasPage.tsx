import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { User, Plus, Search, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { MotoristaItem, transporteService } from '../lib/transporte';
import { ModalCadastroMotorista } from '../components/transporte/ModalCadastroMotorista';

export const MotoristasPage: React.FC = () => {
  const [motoristas, setMotoristas] = useState<MotoristaItem[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroVinculo, setFiltroVinculo] = useState('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [motoristaEditar, setMotoristaEditar] = useState<MotoristaItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const carregarMotoristas = async () => {
    try {
      const lista = await transporteService.listarMotoristas('emp_matriz_01');
      setMotoristas(lista);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    carregarMotoristas();
  }, []);

  const motoristasFiltrados = motoristas.filter((m) => {
    const matchBusca =
      m.nome.toLowerCase().includes(busca.toLowerCase()) ||
      m.cpf.includes(busca) ||
      m.cnh_numero.includes(busca);
    const matchVinculo = filtroVinculo === 'TODOS' || m.tipo_vinculo === filtroVinculo;
    return matchBusca && matchVinculo;
  });

  return (
    <div className="coliseu-page" style={{ minHeight: '100vh' }}>
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <CheckCircle2 size={18} color="#10b981" />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{toastMessage}</span>
          </div>
        </div>
      )}

      <PageHeader
        title="Gestão de Motoristas & Condutores"
        description="Cadastro de condutores, controle de validade de CNH, RNTRC, dados bancários e quitação de frete."
        breadcrumbItems={[
          { label: 'Transporte', active: false },
          { label: 'Motoristas', active: true },
        ]}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="primary"
            onClick={() => {
              setMotoristaEditar(null);
              setIsModalOpen(true);
            }}
            leftIcon={<Plus size={14} />}
            style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
          >
            Cadastrar Motorista
          </Button>
        </div>
      </PageHeader>

      <div className="coliseu-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                className="coliseu-input"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por Nome, CPF ou CNH..."
                style={{ height: '34px', paddingLeft: '30px', width: '100%' }}
              />
            </div>

            <select
              className="coliseu-input"
              value={filtroVinculo}
              onChange={(e) => setFiltroVinculo(e.target.value)}
              style={{ height: '34px', width: '180px' }}
            >
              <option value="TODOS">Todos os Vínculos</option>
              <option value="PROPRIO">Próprio (CLT)</option>
              <option value="TERCEIRO">TAC (Autônomo)</option>
              <option value="AGREGADO">Agregado</option>
            </select>
          </div>

          <Button variant="secondary" onClick={carregarMotoristas} leftIcon={<RefreshCw size={14} />} style={{ height: '34px' }}>
            Atualizar
          </Button>
        </div>

        <div className="coliseu-table-container">
          <table className="coliseu-table" style={{ fontSize: '11px' }}>
            <thead>
              <tr>
                <th>Nome Completo</th>
                <th style={{ width: '120px' }}>CPF</th>
                <th style={{ width: '110px' }}>Nº CNH</th>
                <th style={{ width: '60px', textAlign: 'center' }}>Cat.</th>
                <th style={{ width: '100px' }}>Validade CNH</th>
                <th style={{ width: '100px' }}>RNTRC</th>
                <th style={{ width: '120px' }}>Celular</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Vínculo</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {motoristasFiltrados.map((m) => {
                const isVencida = new Date(m.cnh_validade) < new Date();

                return (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isVencida && (
                          <span title="CNH Vencida" style={{ display: 'inline-flex' }}>
                            <AlertTriangle size={14} color="#ef4444" />
                          </span>
                        )}
                        {m.nome}
                      </div>
                    </td>
                    <td className="text-mono">{m.cpf}</td>
                    <td className="text-mono">{m.cnh_numero}</td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#3b82f6' }}>{m.cnh_categoria}</td>
                    <td style={{ fontWeight: isVencida ? 800 : 500, color: isVencida ? '#ef4444' : 'inherit' }}>
                      {m.cnh_validade}
                    </td>
                    <td className="text-mono">{m.rntrc || '-'}</td>
                    <td>{m.celular || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: m.tipo_vinculo === 'PROPRIO' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: m.tipo_vinculo === 'PROPRIO' ? '#10b981' : '#f59e0b',
                        }}
                      >
                        {m.tipo_vinculo}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setMotoristaEditar(m);
                          setIsModalOpen(true);
                        }}
                        style={{ height: '26px', fontSize: '10px', padding: '0 8px' }}
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {motoristasFiltrados.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Nenhum motorista cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalCadastroMotorista
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSalvo={(salvo) => {
          showToast(`Motorista ${salvo.nome} salvo com sucesso!`);
          carregarMotoristas();
        }}
        motoristaEditar={motoristaEditar}
      />
    </div>
  );
};
