import { useState } from 'react';
import { X, Copy, Trash2, KeyRound } from 'lucide-react';

interface BulkReplicateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: any) => void;
  isLoading: boolean;
  tipoEntidade: string;
  metric: string;
  currentMonth: number;
  currentYear: number;
  mode: 'replicate' | 'zero';
}

export default function BulkReplicateModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  tipoEntidade,
  metric,
  currentMonth,
  currentYear,
  mode
}: BulkReplicateModalProps) {
  // Date states
  const [mesOrigem, setMesOrigem] = useState(currentMonth);
  const [anoOrigem, setAnoOrigem] = useState(currentYear);
  const [mesDestino, setMesDestino] = useState(currentMonth === 12 ? 1 : currentMonth + 1);
  const [anoDestino, setAnoDestino] = useState(currentMonth === 12 ? currentYear + 1 : currentYear);

  const [percentual, setPercentual] = useState(0);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('A senha do administrador é obrigatória.');
      return;
    }

    if (mode === 'replicate') {
      if (mesOrigem === mesDestino && anoOrigem === anoDestino) {
        setError('O período de origem deve ser diferente do período de destino.');
        return;
      }
      onConfirm({
        mes_origem: mesOrigem,
        ano_origem: anoOrigem,
        mes_destino: mesDestino,
        ano_destino: anoDestino,
        percentual_ajuste: percentual,
        tipo_meta: metric,
        tipo_entidade: tipoEntidade,
        password
      });
    } else {
      onConfirm({
        mes: mesOrigem,
        ano: anoOrigem,
        tipo_meta: metric,
        tipo_entidade: tipoEntidade,
        password
      });
    }
    setPassword('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
      <div className="bg-bg-primary rounded-2xl shadow-xl border border-border w-full max-w-md overflow-hidden animate-fade-in text-text-primary">
        <div className="p-5 border-b border-border flex justify-between items-center bg-bg-secondary/50">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            {mode === 'replicate' ? (
              <>
                <Copy size={20} className="text-brand-500" />
                <span>Replicar Metas em Lote</span>
              </>
            ) : (
              <>
                <Trash2 size={20} className="text-red-500" />
                <span>Zerar Metas do Mês</span>
              </>
            )}
          </h3>
          <button className="text-text-secondary hover:text-text-primary transition-colors" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-sm font-medium border border-red-100 dark:border-red-900/30 rounded-xl">
              {error}
            </div>
          )}

          {mode === 'replicate' ? (
            <>
              <p className="text-xs text-text-secondary">
                Isso copiará todas as metas de <span className="font-semibold">{tipoEntidade}</span> (métrica: <span className="font-semibold">{metric}</span>) do período de origem para o período de destino, aplicando o ajuste percentual.
              </p>

              {/* Origem */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Mês Origem</label>
                  <select
                    value={mesOrigem}
                    onChange={(e) => setMesOrigem(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-border outline-none bg-bg-primary text-text-primary focus:border-brand-500 transition-colors text-sm"
                  >
                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Ano Origem</label>
                  <select
                    value={anoOrigem}
                    onChange={(e) => setAnoOrigem(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-border outline-none bg-bg-primary text-text-primary focus:border-brand-500 transition-colors text-sm"
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Destino */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Mês Destino</label>
                  <select
                    value={mesDestino}
                    onChange={(e) => setMesDestino(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-border outline-none bg-bg-primary text-text-primary focus:border-brand-500 transition-colors text-sm"
                  >
                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Ano Destino</label>
                  <select
                    value={anoDestino}
                    onChange={(e) => setAnoDestino(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-border outline-none bg-bg-primary text-text-primary focus:border-brand-500 transition-colors text-sm"
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Percentual */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Ajuste Percentual (%)</label>
                <input
                  type="number"
                  placeholder="Ex: 5 ou -3"
                  value={percentual || ''}
                  onChange={(e) => setPercentual(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-border outline-none bg-bg-primary text-text-primary focus:border-brand-500 transition-all text-sm"
                  step="0.01"
                />
                <span className="text-[10px] text-text-secondary mt-1 block">
                  Informe um valor positivo para aumentar ou negativo para reduzir (deixe 0 para copiar idêntico).
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-text-secondary">
                Isso removerá permanently todas as metas de <span className="font-semibold text-red-500">{tipoEntidade}</span> (métrica: <span className="font-semibold text-red-500">{metric}</span>) configuradas para o período selecionado.
              </p>

              {/* Período a Zerar */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Mês</label>
                  <select
                    value={mesOrigem}
                    onChange={(e) => setMesOrigem(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-border outline-none bg-bg-primary text-text-primary focus:border-brand-500 transition-colors text-sm"
                  >
                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Ano</label>
                  <select
                    value={anoOrigem}
                    onChange={(e) => setAnoOrigem(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-border outline-none bg-bg-primary text-text-primary focus:border-brand-500 transition-colors text-sm"
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Confirm Password */}
          <div className="pt-2 border-t border-border">
            <label className="block text-xs font-bold text-text-primary mb-1.5 flex items-center gap-1">
              <KeyRound size={14} className="text-brand-500" />
              <span>Senha do Administrador</span>
            </label>
            <input
              type="password"
              required
              placeholder="Digite sua senha para autorizar"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border outline-none bg-bg-primary text-text-primary focus:border-brand-500 transition-all text-sm font-semibold"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-border text-text-secondary font-medium rounded-xl hover:bg-bg-secondary transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex-1 px-4 py-2.5 text-white font-semibold rounded-xl transition-all disabled:opacity-50 text-sm flex items-center justify-center ${
                mode === 'replicate' ? 'bg-brand-500 hover:bg-brand-600' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {isLoading ? 'Aguarde...' : mode === 'replicate' ? 'Confirmar Replicação' : 'Confirmar Exclusão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
