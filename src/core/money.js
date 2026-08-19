/**
 * core/money.js — Dinero. Módulo hoja: no importa nada.
 *
 * Formatear y parsear importes son reglas del dominio (no de la UI ni de la red),
 * por eso viven acá y las usan todas las capas de arriba.
 */

/** 12000 → "$12.000" (sin decimales: en el local no se usan centavos). */
export function formatMoney(amount, locale = 'es-AR') {
  const n = Math.round(Number(amount) || 0);
  return '$' + n.toLocaleString(locale);
}

/**
 * Parsea un importe escrito por una persona en una planilla.
 * Acepta "1.500,00", "1500", "$ 1.500", "1500.50" y devuelve NaN si no hay número.
 */
export function parseAmount(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;

  const s = String(raw ?? '').replace(/[^\d.,-]/g, '').trim();
  if (!s) return NaN;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  let normalized = s;
  if (hasComma && hasDot) {
    // "1.500,00" → punto = miles, coma = decimal
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    normalized = s.replace(',', '.');
  } else if (hasDot && /^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    // "1.500" → miles, no decimal
    normalized = s.replace(/\./g, '');
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : NaN;
}
