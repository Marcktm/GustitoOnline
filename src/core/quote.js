/**
 * core/quote.js — Cotización del pedido. Módulo hoja (recibe la carta por parámetro).
 *
 * Toma la carta + las cantidades elegidas y devuelve el detalle completo.
 * Es una función pura: mismo input → mismo output. Se puede testear sin navegador
 * y la puede reusar tal cual el backend de la comandera el día de mañana.
 */

/**
 * @param {object} menu   carta creada con core/menu.js
 * @param {object} items  { [productId]: cantidad }
 * @returns {{ groups, lines, charges, total, count }}
 */
export function quoteOrder(menu, items) {
  const groups = [];
  const lines = [];
  const charges = [];
  let total = 0;

  for (const categoria of menu.categories) {
    const catLines = categoria.products
      .filter((p) => (items[p.id] || 0) > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        qty: items[p.id],
        price: p.price,
        categoryId: categoria.id,
        perUnit: categoria.pricing.perUnit,
      }));

    if (!catLines.length) continue;

    const { charges: catCharges, subtotal } = categoria.pricing.quote(catLines);

    groups.push({
      id: categoria.id,
      label: categoria.label,
      perUnit: categoria.pricing.perUnit,
      lines: catLines,
      charges: catCharges,
      subtotal,
    });

    lines.push(...catLines);
    charges.push(...catCharges);
    total += subtotal;
  }

  return {
    groups,
    lines,
    charges,
    total,
    count: lines.reduce((acc, l) => acc + l.qty, 0),
  };
}
