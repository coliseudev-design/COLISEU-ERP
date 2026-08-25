/**
 * Coliseu ERP - Safe String & Object Utilities
 * Previne 100% dos erros de TypeError (Cannot read properties of undefined / null).
 */

export function safeStr(val: any, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  return String(val);
}

export function safeLower(val: any, fallback = ''): string {
  return safeStr(val, fallback).toLowerCase();
}

export function safeUpper(val: any, fallback = ''): string {
  return safeStr(val, fallback).toUpperCase();
}

export function safeTrim(val: any, fallback = ''): string {
  return safeStr(val, fallback).trim();
}

export function safeIncludes(source: any, search: any): boolean {
  const s = safeLower(source);
  const q = safeLower(search).trim();
  if (!q) return true;
  return s.includes(q);
}

export function safeNum(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  return isNaN(num) ? fallback : num;
}
