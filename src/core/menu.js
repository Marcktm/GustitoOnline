/**
 * core/menu.js — La carta como estructura de dominio.
 * Depende de: core/text (hoja). Sin ciclos.
 *
 * Una carta es una lista de categorías; cada categoría trae SU estrategia de
 * precio (core/pricing) ya resuelta. De dónde salieron los datos (planilla,
 * API, archivo local) es problema de la capa `data`, no de acá.
 */
import { matches } from './text.js';

/**
 * @param {Array} categories  [{ id, label, tagline?, pricing, products: [{ id, name, price, desc?, image?, available? }] }]
 */
export function createMenu(categories = []) {
  const index = Object.create(null);
  const order = [];

  const cats = categories.map((cat) => ({
    tagline: '',
    ...cat,
    products: cat.products.map((p) => {
      const producto = { available: true, desc: '', image: '', ...p, categoryId: cat.id };
      index[producto.id] = producto;
      order.push(producto.id);
      return producto;
    }),
  }));

  return {
    categories: cats,
    index,
    order,                                   // orden canónico de la carta
    get: (id) => index[id] || null,
    has: (id) => Boolean(index[id]),
    isEmpty: () => cats.every((c) => !c.products.length),
    get size() { return order.length; },
  };
}

/** Carta vacía — evita chequeos de null en las capas de arriba. */
export const EMPTY_MENU = createMenu([]);

/**
 * Filtra la carta por texto y/o categoría. Devuelve categorías nuevas
 * (no muta la carta original) listas para renderizar.
 */
export function filterMenu(menu, { query = '', categoryId = null } = {}) {
  return menu.categories
    .filter((cat) => (query ? true : !categoryId || cat.id === categoryId))
    .map((cat) => ({
      ...cat,
      products: cat.products.filter((p) => matches(p.name, query) || matches(p.desc, query)),
    }))
    .filter((cat) => cat.products.length > 0);
}
