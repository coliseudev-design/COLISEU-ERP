import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Truck, Plus, Search, Edit2, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { VeiculoItem, transporteService } from '../lib/transporte';
import { ModalCadastroVeiculo } from '../components/transporte/ModalCadastroVeiculo';

export const FrotaVeiculosPage: React.FC = () => {
  const [veiculos, setVeiculos] = useState<VeiculoItem[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [veiculoEditar, setVeiculoEditar] = useState<VeiculoItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const carregarVeiculos = async () => {
    try {
      const lista = await transporteService.listarVeiculos('emp_matriz_01');
      setVeiculos(lista);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    carregarVeiculos();
  }, []);

  const veiculosFiltrados = veiculos.filter((v) => {
    const matchBusca =
      v.placa.toLowerCase().includes(busca.toLowerCase()) ||
      (v.marca || '').toLowerCase().includes(busca.toLowerCase()) ||
      (v.modelo || '').toLowerCase().includes(busca.toLowerCase()) ||
      (v.renavam || '').includes(busca);
    const matchTipo = filtroTipo === 'TODOS' || v.tipo_veiculo === filtroTipo;
    return matchBusca && matchTipo;
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
        title="Gestão de Frota & Veículos"
        description="Cadastro de veículos de tração, carretas/reboques, tara, capacidade de carga e RNTRC para MDF-e e CT-e."
        breadcrumbItems={[
          { label: 'Transporte', active: false },
          { label: 'Frota & Veículos', active: true },
        ]}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="primary"
            onClick={() => {
              setVeiculoEditar(null);
              setIsModalOpen(true);
            }}
            leftIcon={<Plus size={14} />}
            style={{ backgroundColor: '#3b82f6', borderColor: '#3b82f6' }}
          >
            Cadastrar Veículo
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
                placeholder="Buscar por Placa, Marca, Modelo ou RENAVAM..."
                style={{ height: '34px', paddingLeft: '30px', width: '100%' }}
              />
            </div>

            <select
              className="coliseu-input"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              style={{ height: '34px', width: '180px' }}
            >
              <option value="TODOS">Todos os Tipos</option>
              <option value="TOCO">Toco (2 Eixos)</option>
              <option value="TRUCK">Truck (3 Eixos)</option>
              <option value="CAVALO_MECANICO">Cavalo Mecânico</option>
              <option value="UTILITARIO">Utilitário</option>
            </select>
          </div>

          <Button variant="secondary" onClick={carregarVeiculos} leftIcon={<RefreshCw size={14} />} style={{ height: '34px' }}>
            Atualizar
          </Button>
        </div>

        <div className="coliseu-table-container">
          <table className="coliseu-table" style={{ fontSize: '11px' }}>
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Placa / UF</th>
                <th>Marca & Modelo</th>
                <th style={{ width: '110px' }}>Tipo Veículo</th>
                <th style={{ width: '110px' }}>Carroceria</th>
                <th style={{ width: '110px' }}>RENAVAM</th>
                <th style={{ width: '90px' }}>RNTRC</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Tara (Kg)</th>
                <th style={{ width: '110px', textAlign: 'right' }}>Capacidade</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Propriedade</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {veiculosFiltrados.map((v) => (
                <tr key={v.id}>
                  <td style={{ fontWeight: 800, color: '#3b82f6' }}>{v.placa} / {v.uf_placa}</td>
                  <td style={{ fontWeight: 600 }}>{v.marca} {v.modelo} ({v.cor || 'Branco'})</td>
                  <td>{v.tipo_veiculo}</td>
                  <td>{v.tipo_carroceria}</td>
                  <td className="text-mono">{v.renavam || '-'}</td>
                  <td className="text-mono">{v.rntrc || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{v.tara_kg} kg</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>{v.capacidade_kg} kg</td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: v.tipo_propriedade === 'PROPRIO' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: v.tipo_propriedade === 'PROPRIO' ? '#10b981' : '#f59e0b',
                      }}
                    >
                      {v.tipo_propriedade}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setVeiculoEditar(v);
                        setIsModalOpen(true);
                      }}
                      style={{ height: '26px', fontSize: '10px', padding: '0 8px' }}
                    >
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
              {veiculosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    Nenhum veículo cadastrado na frota.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ModalCadastroVeiculo
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSalvo={(salvo) => {
          showToast(`Veículo ${salvo.placa} salvo com sucesso!`);
          carregarVeiculos();
        }}
        veiculoEditar={veiculoEditar}
      />
    </div>
  );
};
