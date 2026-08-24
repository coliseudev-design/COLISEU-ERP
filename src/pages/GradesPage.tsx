import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  CheckCircle,
  RefreshCw,
  Grid,
  Shirt,
} from 'lucide-react';
import { gradeService, ProdutoGrade } from '../lib/grade';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';

export const GradesPage: React.FC = () => {
  const [grades, setGrades] = useState<ProdutoGrade[]>([]);
  const [nome, setNome] = useState('Grade Adulto Calçados');
  const [tamanhos, setTamanhos] = useState('38, 39, 40, 41, 42');
  const [cores, setCores] = useState('Preto, Branco, Rosa');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const carregarGrades = async () => {
    try {
      const list = await gradeService.listarGrades('emp1');
      setGrades(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    carregarGrades();
  }, []);

  const handleCriarGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const listT = tamanhos.split(',').map((s) => s.trim()).filter(Boolean);
      const listC = cores.split(',').map((s) => s.trim()).filter(Boolean);

      await gradeService.criarGrade('emp1', nome, 'Tamanho', 'Cor', listT, listC);
      showToast(`✅ Grade '${nome}' criada com sucesso!`);
      carregarGrades();
    } catch (err: any) {
      showToast(`❌ Erro ao criar grade: ${err?.message || 'Falha IPC'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="coliseu-page">
      {toastMessage && (
        <div className="coliseu-toast-container">
          <div className="coliseu-toast coliseu-toast--success">
            <CheckCircle style={{ width: '1.25rem', height: '1.25rem', color: 'var(--status-success)' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{toastMessage}</span>
          </div>
        </div>
      )}

      <PageHeader
        title="Gestão de Grades de Produtos (Tamanho × Cor)"
        subtitle="Moldes dimensionais para distribuição de roupas e calçados por tamanho, numeração e cores"
        icon={<Layers style={{ color: 'var(--action-primary)', width: '1.5rem', height: '1.5rem' }} />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)', gap: '1.5rem', marginTop: '1rem' }}>
        {/* Formulário de Criação */}
        <div className="coliseu-card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus style={{ width: '1.25rem', height: '1.25rem', color: 'var(--action-primary)' }} />
            Nova Grade Dimensional
          </h2>

          <form onSubmit={handleCriarGrade} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Nome da Grade</label>
              <Input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Grade Calçados Adulto"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Tamanhos / Numerações (separados por vírgula)</label>
              <Input
                type="text"
                required
                value={tamanhos}
                onChange={(e) => setTamanhos(e.target.value)}
                placeholder="38, 39, 40, 41, 42"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Cores / Estampas (separadas por vírgula)</label>
              <Input
                type="text"
                value={cores}
                onChange={(e) => setCores(e.target.value)}
                placeholder="Preto, Branco, Rosa"
                style={{ width: '100%' }}
              />
            </div>

            <Button type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCw style={{ width: '0.875rem', height: '0.875rem' }} />
              {loading ? 'Criando...' : 'Salvar Molde de Grade'}
            </Button>
          </form>
        </div>

        {/* Moldes Ativos */}
        <div className="coliseu-card">
          <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Grid style={{ width: '1rem', height: '1rem', color: 'var(--text-link)' }} />
            Moldes de Grade Ativos para Moda & Calçados
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {grades.map((g) => {
              const tams = g.eixos.filter((e) => e.tipo_eixo === 1);
              const cors = g.eixos.filter((e) => e.tipo_eixo === 2);

              return (
                <div
                  key={g.id}
                  style={{
                    backgroundColor: 'var(--surface-1)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                      <Shirt style={{ width: '1rem', height: '1rem', color: 'var(--action-primary)' }} />
                      {g.nome}
                    </h3>
                    <span style={{ fontSize: '0.625rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>ID: {g.id.substring(0, 8)}...</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.625rem', display: 'block', marginBottom: '0.25rem' }}>Tamanhos / Numerações ({tams.length}):</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {tams.map((t) => (
                          <Badge key={t.id} variant="info">{t.valor}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.625rem', display: 'block', marginBottom: '0.25rem' }}>Cores ({cors.length}):</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {cors.map((c) => (
                          <Badge key={c.id} variant="default">{c.valor}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {grades.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Nenhum molde de grade cadastrado ainda. Use o formulário ao lado para criar o primeiro molde.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
