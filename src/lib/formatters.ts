/**
 * Utilitários centralizados de formatação e validação fiscal para o Coliseu ERP.
 * Garante padronização total em tabelas, formulários, KPIs e relatórios.
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

  if (/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
    return trimmed;
  }

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

// =========================================================================
// MÁSCARAS OFICIAIS BRASILEIRAS (NÃO ACEITAM LETRAS)
// =========================================================================

export const maskCpf = (value: string): string => {
  const clean = value.replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
};

export const maskCnpj = (value: string): string => {
  const clean = value.replace(/\D/g, '').slice(0, 14);
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
  if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`;
};

export const maskCpfCnpj = (value: string, tipo: 'FÍSICA' | 'JURÍDICA' = 'FÍSICA'): string => {
  return tipo === 'JURÍDICA' ? maskCnpj(value) : maskCpf(value);
};

// =========================================================================
// VALIDAÇÃO MATEMÁTICA OFICIAL DE CPF & CNPJ (RECEITA FEDERAL DO BRASIL)
// =========================================================================

export const validarCPF = (cpf: string | null | undefined): boolean => {
  if (!cpf) return false;
  const clean = String(cpf).replace(/\D/g, '');
  if (clean.length !== 11) return false;

  // Rejeita sequências de dígitos repetidos (ex: 111.111.111-11, 000.000.000-00, etc.)
  if (/^(\d)\1{10}$/.test(clean)) return false;

  // 1º Dígito Verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(clean.charAt(9), 10)) return false;

  // 2º Dígito Verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(clean.charAt(10), 10)) return false;

  return true;
};

export const validarCNPJ = (cnpj: string | null | undefined): boolean => {
  if (!cnpj) return false;
  const clean = String(cnpj).replace(/\D/g, '');
  if (clean.length !== 14) return false;

  // Rejeita sequências de dígitos repetidos
  if (/^(\d)\1{13}$/.test(clean)) return false;

  // 1º Dígito Verificador
  let tamanho = clean.length - 2;
  let numeros = clean.substring(0, tamanho);
  const digitos = clean.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0), 10)) return false;

  // 2º Dígito Verificador
  tamanho = tamanho + 1;
  numeros = clean.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1), 10)) return false;

  return true;
};

export const validarCpfCnpj = (value: string | null | undefined, tipo: 'FÍSICA' | 'JURÍDICA' = 'FÍSICA'): boolean => {
  return tipo === 'JURÍDICA' ? validarCNPJ(value) : validarCPF(value);
};
