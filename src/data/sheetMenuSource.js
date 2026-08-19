/**
 * data/sheetMenuSource.js — Adapter de la planilla (Google Sheets publicado como CSV).
 * Depende de: core/{menu,pricing,text,money}, data/{csv,driveImage}.
 *
 * ANTI-CORRUPTION LAYER: la planilla tiene un formato heredado y "humano"
 * (filas de escalones — Individual / Media Docena / Docena — mezcladas entre los
 * productos, stock como SI/NO, precios "1.500,00", links de Drive).
 * Acá se traduce todo eso al modelo de dominio limpio. El resto de la app
 * nunca ve una fila de CSV.
 *
 * Cambiar de Sheets a una API REST = escribir otro source con el mismo `load()`.
 */
import { createMenu } from '../core/menu.js';
import { createPricing } from '../core/pricing.js';
import { normalize, slugify } from '../core/text.js';
import { parseAmount } from '../core/money.js';
import { parseCsv, createColumnResolver } from './csv.js';
import { toDirectImageUrl } from './driveImage.js';

/**
 * @param {object} args
 * @param {string} args.csvUrl
 * @param {object} args.mapeo   descripción de la planilla (ver app/config.js)
 * @param {function} [args.fetchImpl]
 */
export function createSheetMenuSource({ csvUrl, mapeo, fetchImpl = fetch }) {
  return {
    id: 'google-sheets',
    async load() {
      const res = await fetchImpl(csvUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`La planilla respondió HTTP ${res.status}`);
      return mapRowsToMenu(parseCsv(await res.text()), mapeo);
    },
  };
}

/** Traduce las filas del CSV a una carta de dominio. Pura y testeable. */
export function mapRowsToMenu(rows, mapeo) {
  if (!rows.length) return createMenu([]);

  const col = createColumnResolver(rows[0], normalize);
  const c = {
    producto: col(['producto', 'nombre'], 0),
    categoria: col(['categoria', 'rubro'], 1),
    precio: col(['precio'], 2),
    stock: col(['stock', 'disponible'], 3),
    imagen: col(['imagen', 'foto', 'url'], 4),
    descripcion: col(['descripcion', 'detalle'], -1),
  };

  // Acumuladores: escalones de combo por categoría + productos por categoría.
  const escalonesPorCategoria = {};
  const productosPorCategoria = {};
  mapeo.categorias.forEach((cat) => { productosPorCategoria[cat.id] = []; escalonesPorCategoria[cat.id] = []; });

  for (let r = 1; r < rows.length; r++) {
    const fila = rows[r];
    const nombre = (fila[c.producto] || '').trim();
    if (!nombre) continue;

    const precio = parseAmount(fila[c.precio]);
    const stock = normalize(fila[c.stock] || '');
    const disponible = !['no', 'false', '0', 'sin stock'].includes(stock);

    // ¿Es una fila de escalón de precio (Individual / Media Docena / Docena)?
    const escalon = buscarEscalon(nombre, mapeo);
    if (escalon) {
      if (Number.isFinite(precio)) {
        escalonesPorCategoria[escalon.categoriaId].push({ ...escalon.tier, price: precio });
      }
      continue;
    }

    const categoria = buscarCategoria(fila[c.categoria], mapeo);
    if (!categoria) continue;

    productosPorCategoria[categoria.id].push({
      id: slugify(nombre) || `item-${r}`,
      name: nombre,
      price: Number.isFinite(precio) ? precio : 0,
      desc: c.descripcion > -1 ? (fila[c.descripcion] || '').trim() : '',
      image: toDirectImageUrl(fila[c.imagen]),
      available: disponible,
    });
  }

  const categorias = mapeo.categorias
    .map((cat) => ({
      id: cat.id,
      label: cat.label,
      tagline: cat.tagline || '',
      pricing: createPricing(cat.pricing, {
        tiers: escalonesPorCategoria[cat.id].length
          ? escalonesPorCategoria[cat.id]
          : (cat.tiersPorDefecto || []),
      }),
      products: productosPorCategoria[cat.id],
    }))
    .filter((cat) => cat.products.length > 0);

  return createMenu(categorias);
}

function buscarCategoria(valor, mapeo) {
  const v = normalize(valor);
  return mapeo.categorias.find((cat) => cat.match.some((m) => normalize(m) === v)) || null;
}

function buscarEscalon(nombreProducto, mapeo) {
  const v = normalize(nombreProducto);
  for (const cat of mapeo.categorias) {
    for (const tier of cat.escalones || []) {
      if (tier.match.some((m) => normalize(m) === v)) {
        return { categoriaId: cat.id, tier };
      }
    }
  }
  return null;
}
