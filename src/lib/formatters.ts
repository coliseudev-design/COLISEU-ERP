/**
 * Utilitários centralizados de formatação para o Coliseu ERP.
 * Garante padronização total em tabelas, KPIs, drawers e relatórios.
 */

export const parseNumber = (val: number | string | null | undefined): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const sanitized = val.toString().replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) ? 0 : parsed;
};

export const formatCurrency = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || val === '') return 'R$ 0,00';
  const num = parseNumber(val);
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatPercent = (val: number | string | null | undefined, includeSign = false): string => {
  if (val === null || val === undefined || val === '') return '0,0%';
  const num = parseNumber(val);
  const formatted = num.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  if (includeSign && num > 0) {
    return `+${formatted}%`;
  }
  return `${formatted}%`;
};

export const formatDate = (dateStr: string | null | undefined, format: 'short' | 'long' | 'datetime' = 'short'): string => {
  if (!dateStr) return '-';
  const trimmed = String(dateStr).trim();
  if (!trimmed || trimmed === '-' || trimmed === 'null' || trimmed === 'undefined') return '-';

  // Se já estiver no formato brasileiro DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
    return trimmed;
  }

  // Previne o bug de timezone shift (UTC-4) ao converter YYYY-MM-DD diretamente
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (ymdMatch) {
    const [, year, month, day, hours, minutes] = ymdMatch;
    if (format === 'datetime' && hours !== undefined && minutes !== undefined) {
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
    return `${day}/${month}/${year}`;
  }

  try {
    const date = new Date(trimmed);
    if (isNaN(date.getTime())) return trimmed;
    if (format === 'short') {
      return date.toLocaleDateString('pt-BR');
    }
    if (format === 'datetime') {
      return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return trimmed;
  }
};

export const formatCnpjCpf = (value: string | null | undefined): string => {
  if (!value) return '-';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
};
