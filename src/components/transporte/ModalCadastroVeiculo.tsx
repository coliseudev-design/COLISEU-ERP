import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Truck, Save, X } from 'lucide-react';
import { VeiculoItem, transporteService } from '../../lib/transporte';

interface ModalCadastroVeiculoProps {
  isOpen: boolean;
  onClose: () => void;
  onSalvo: (veiculo: VeiculoItem) => void;
  veiculoEditar?: VeiculoItem | null;
}

export const ModalCadastroVeiculo: React.FC<ModalCadastroVeiculoProps> = ({
  isOpen,
  onClose,
  onSalvo,
  veiculoEditar,
}) => {
  const [placa, setPlaca] = useState(veiculoEditar?.placa || '');
  const [ufPlaca, setUfPlaca] = useState(veiculoEditar?.uf_placa || 'MS');
  const [renavam, setRenavam] = useState(veiculoEditar?.renavam || '');
  const [tipoVeiculo, setTipoVeiculo] = useState(veiculoEditar?.tipo_veiculo || 'TRUCK');
  const [tipoCarroceria, setTipoCarroceria] = useState(veiculoEditar?.tipo_carroceria || 'BAU');
  const [tipoRodado, setTipoRodado] = useState(veiculoEditar?.tipo_rodado || '01');
  const [taraKg, setTaraKg] = useState(veiculoEditar?.tara_kg || 4500);
  const [capacidadeKg, setCapacidadeKg] = useState(veiculoEditar?.capacidade_kg || 8500);
  const [capacidadeM3, setCapacidadeM3] = useState(veiculoEditar?.capacidade_m3 || 42);
  const [rntrc, setRntrc] = useState(veiculoEditar?.rntrc || '09812345');
  const [tipoPropriedade, setTipoPropriedade] = useState(veiculoEditar?.tipo_propriedade || 'PROPRIO');
  const [marca, setMarca] = useState(veiculoEditar?.marca || 'VOLVO');
  const [modelo, setModelo] = useState(veiculoEditar?.modelo || 'VM 270');
  const [cor, setCor] = useState(veiculoEditar?.cor || 'BRANCO');
  const [anoFabricacao, setAnoFabricacao] = useState(veiculoEditar?.ano_fabricacao || 2023);
  const [proprietarioNome, setProprietarioNome] = useState(veiculoEditar?.proprietario_nome || '');
  const [proprietarioCpfCnpj, setProprietarioCpfCnpj] = useState(veiculoEditar?.proprietario_cpf_cnpj || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSalvar = async () => {
    if (!placa.trim()) {
      alert('Informe a placa do veículo.');
      return;
    }
    setIsSaving(true);
    try {
      const salvo = await transporteService.salvarVeiculo({
        id: veiculoEditar?.id,
        empresa_id: 'emp_matriz_01',
        placa: placa.toUpperCase().trim(),
        uf_placa: ufPlaca.toUpperCase().trim(),
        renavam: renavam.trim(),
        tipo_veiculo: tipoVeiculo,
        tipo_carroceria: tipoCarroceria,
        tipo_rodado: tipoRodado,
        tara_kg: Number(taraKg),
        capacidade_kg: Number(capacidadeKg),
        capacidade_m3: Number(capacidadeM3),
        rntrc: rntrc.trim(),
        tipo_propriedade: tipoPropriedade,
        marca: marca.toUpperCase().trim(),
        modelo: modelo.toUpperCase().trim(),
        cor: cor.toUpperCase().trim(),
        ano_fabricacao: Number(anoFabricacao),
        proprietario_nome: proprietarioNome.toUpperCase().trim(),
        proprietario_cpf_cnpj: proprietarioCpfCnpj.trim(),
        ativo: true,
      });
      onSalvo(salvo);
      onClose();
    } catch (err: any) {
      alert(`Erro ao salvar veículo: ${err}`);
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
          maxWidth: '720px',
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
            <Truck size={18} color="#3b82f6" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {veiculoEditar ? 'Editar Veículo' : 'Cadastrar Novo Veículo (Frota)'}
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '75vh', overflowY: 'auto' }}>
          {/* Linha 1: Placa, UF, Renavam, RNTRC */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 70px 1.2fr 1.2fr', gap: '10px' }}>
            <div>
              <label className="coliseu-label">Placa *</label>
              <input
                type="text"
                className="coliseu-input"
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="ABC-1234"
                maxLength={8}
                style={{ height: '34px', textAlign: 'center', fontWeight: 800 }}
              />
            </div>
            <div>
              <label className="coliseu-label">UF *</label>
              <input
                type="text"
                className="coliseu-input"
                value={ufPlaca}
                onChange={(e) => setUfPlaca(e.target.value.toUpperCase())}
                maxLength={2}
                style={{ height: '34px', textAlign: 'center', fontWeight: 700 }}
              />
            </div>
            <div>
              <label className="coliseu-label">RENAVAM</label>
              <input
                type="text"
                className="coliseu-input"
                value={renavam}
                onChange={(e) => setRenavam(e.target.value)}
                placeholder="00987654321"
                style={{ height: '34px' }}
              />
            </div>
            <div>
              <label className="coliseu-label">RNTRC (ANTT)</label>
              <input
                type="text"
                className="coliseu-input"
                value={rntrc}
                onChange={(e) => setRntrc(e.target.value)}
                placeholder="09812345"
                style={{ height: '34px' }}
              />
            </div>
          </div>

          {/* Linha 2: Marca, Modelo, Cor, Ano */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr 90px', gap: '10px' }}>
            <div>
              <label className="coliseu-label">Marca</label>
              <input type="text" className="coliseu-input" value={marca} onChange={(e) => setMarca(e.target.value)} style={{ height: '34px' }} />
            </div>
            <div>
              <label className="coliseu-label">Modelo</label>
              <input type="text" className="coliseu-input" value={modelo} onChange={(e) => setModelo(e.target.value)} style={{ height: '34px' }} />
            </div>
            <div>
              <label className="coliseu-label">Cor</label>
              <input type="text" className="coliseu-input" value={cor} onChange={(e) => setCor(e.target.value)} style={{ height: '34px' }} />
            </div>
            <div>
              <label className="coliseu-label">Ano Fab.</label>
              <input type="number" className="coliseu-input" value={anoFabricacao} onChange={(e) => setAnoFabricacao(parseInt(e.target.value) || 2024)} style={{ height: '34px', textAlign: 'center' }} />
            </div>
          </div>

          {/* Linha 3: Tipo Veículo, Tipo Carroceria, Tipo Rodado, Propriedade */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.2fr 1fr', gap: '10px' }}>
            <div>
              <label className="coliseu-label">Tipo Veículo</label>
              <select className="coliseu-input" value={tipoVeiculo} onChange={(e) => setTipoVeiculo(e.target.value)} style={{ height: '34px', fontWeight: 600 }}>
                <option value="TOCO">TOCO (2 EIXOS)</option>
                <option value="TRUCK">TRUCK (3 EIXOS)</option>
                <option value="CAVALO_MECANICO">CAVALO MECÂNICO</option>
                <option value="UTILITARIO">UTILITÁRIO / 3/4</option>
                <option value="VAN">VAN / FURGÃO</option>
              </select>
            </div>
            <div>
              <label className="coliseu-label">Carroceria</label>
              <select className="coliseu-input" value={tipoCarroceria} onChange={(e) => setTipoCarroceria(e.target.value)} style={{ height: '34px' }}>
                <option value="BAU">BAÚ FECHADO</option>
                <option value="ABERTA">CARGA ABERTA</option>
                <option value="SIDER">SIDER</option>
                <option value="GRANELEIRO">GRANELEIRO</option>
                <option value="TANQUE">TANQUE</option>
                <option value="FRIGORIFICO">FRIGORÍFICO</option>
              </select>
            </div>
            <div>
              <label className="coliseu-label">Tipo Rodado (SEFAZ)</label>
              <select className="coliseu-input" value={tipoRodado} onChange={(e) => setTipoRodado(e.target.value)} style={{ height: '34px' }}>
                <option value="01">01 - Truck</option>
                <option value="02">02 - Toco</option>
                <option value="03">03 - Cavalo Mecânico</option>
                <option value="04">04 - Van</option>
                <option value="05">05 - Utilitário</option>
              </select>
            </div>
            <div>
              <label className="coliseu-label">Propriedade</label>
              <select className="coliseu-input" value={tipoPropriedade} onChange={(e) => setTipoPropriedade(e.target.value)} style={{ height: '34px', fontWeight: 700 }}>
                <option value="PROPRIO">PRÓPRIO</option>
                <option value="TERCEIRO">TERCEIRO</option>
                <option value="ARRENDADO">ARRENDADO</option>
              </select>
            </div>
          </div>

          {/* Linha 4: Tara, Capacidade KG, Capacidade M3 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label className="coliseu-label">Tara (Kg) *</label>
              <input type="number" className="coliseu-input" value={taraKg} onChange={(e) => setTaraKg(parseFloat(e.target.value) || 0)} style={{ height: '34px', textAlign: 'right', fontWeight: 700 }} />
            </div>
            <div>
              <label className="coliseu-label">Capacidade Carga (Kg) *</label>
              <input type="number" className="coliseu-input" value={capacidadeKg} onChange={(e) => setCapacidadeKg(parseFloat(e.target.value) || 0)} style={{ height: '34px', textAlign: 'right', fontWeight: 700 }} />
            </div>
            <div>
              <label className="coliseu-label">Capacidade Cúbica (M³)</label>
              <input type="number" className="coliseu-input" value={capacidadeM3} onChange={(e) => setCapacidadeM3(parseFloat(e.target.value) || 0)} style={{ height: '34px', textAlign: 'right' }} />
            </div>
          </div>

          {/* Se Terceiro: Dados do Proprietário TAC */}
          {tipoPropriedade === 'TERCEIRO' && (
            <div style={{ padding: '12px', backgroundColor: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>
                Dados do Proprietário Terceiro (TAC / Equiparado — Obrigatório para CIOT):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '10px' }}>
                <div>
                  <label className="coliseu-label">Nome / Razão Social Proprietário</label>
                  <input type="text" className="coliseu-input" value={proprietarioNome} onChange={(e) => setProprietarioNome(e.target.value)} style={{ height: '32px' }} />
                </div>
                <div>
                  <label className="coliseu-label">CPF / CNPJ Proprietário</label>
                  <input type="text" className="coliseu-input" value={proprietarioCpfCnpj} onChange={(e) => setProprietarioCpfCnpj(e.target.value)} style={{ height: '32px' }} />
                </div>
              </div>
            </div>
          )}
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
            {isSaving ? 'Salvando...' : 'Salvar Veículo'}
          </Button>
        </div>
      </div>
    </div>
  );
};
