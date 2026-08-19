/**
 * core/text.js — Texto. Módulo hoja: no importa nada.
 * Normalización para búsquedas y generación de ids estables.
 */

/** "Jamón y Queso" → "jamon y queso" (minúsculas, sin acentos). */
export function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** "Jamón y Queso" → "jamon-y-queso". Id estable a partir de un nombre. */
export function slugify(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** ¿El texto contiene la consulta, ignorando acentos y mayúsculas? */
export function matches(haystack, query) {
  if (!query) return true;
  return normalize(haystack).includes(normalize(query));
}
