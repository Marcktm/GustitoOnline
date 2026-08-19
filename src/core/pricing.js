/**
 * core/pricing.js — Estrategias de precio (patrón Strategy). Módulo hoja.
 *
 * Cada categoría de la carta declara CÓMO se cobra, no CUÁNTO cuesta cada línea.
 * Así se pueden agregar formas de cobro nuevas (promos, 2x1, combos armados,
 * happy hour) sin tocar el carrito, la UI ni el envío del pedido.
 *
 * Contrato de una estrategia:
 *   { id, quote(lines) -> { charges, subtotal } }
 *
 *   line   = { id, name, qty, price }
 *   charge = { concepto, cantidad, precioUnitario, importe }
 *
 * Un `charge` es un CONCEPTO FACTURABLE: lo que va en el ticket y lo que
 * entiende la comandera. Puede no haber relación 1:1 con las líneas
 * (12 empanadas de gustos distintos = 1 cargo "1 Docena").
 */

const sum = (arr, fn) => arr.reduce((acc, x) => acc + fn(x), 0);

/**
 * Precio unitario clásico: cada producto se cobra cantidad × precio.
 * Se usa en bebidas, postres, y cualquier cosa que valga por unidad.
 */
export function unitPricing() {
  return {
    id: 'unit',
    perUnit: true,
    quote(lines) {
      const charges = lines.map((l) => ({
        concepto: l.name,
        cantidad: l.qty,
        precioUnitario: l.price,
        importe: l.qty * l.price,
      }));
      return { charges, subtotal: sum(charges, (c) => c.importe) };
    },
  };
}

/**
 * Precio por combo escalonado: el total NO depende del producto sino de la
 * cantidad total de la categoría. Es el caso de las empanadas: 12 empanadas
 * valen una docena aunque sean de seis gustos distintos.
 *
 * tiers = [{ units, price, label, plural }]  — se ordenan solos de mayor a menor.
 * El reparto es greedy (docenas → medias → sueltas), que es el más barato
 * para el cliente cuando el precio por unidad baja al subir el combo.
 */
export function bundlePricing(tiers) {
  const escalones = [...tiers]
    .filter((t) => Number(t.units) > 0 && Number.isFinite(Number(t.price)))
    .sort((a, b) => b.units - a.units);

  return {
    id: 'bundle',
    perUnit: false,
    tiers: escalones,

    quote(lines) {
      let restantes = sum(lines, (l) => l.qty);
      const charges = [];

      for (const escalon of escalones) {
        const cantidad = Math.floor(restantes / escalon.units);
        if (cantidad <= 0) continue;
        charges.push({
          concepto: cantidad === 1 ? escalon.label : (escalon.plural || escalon.label + 's'),
          cantidad,
          precioUnitario: escalon.price,
          importe: cantidad * escalon.price,
        });
        restantes -= cantidad * escalon.units;
      }

      // Sobrante sin escalón de 1 unidad: se prorratea con el escalón más chico
      // para no regalar producto ni romper el total.
      if (restantes > 0 && escalones.length) {
        const menor = escalones[escalones.length - 1];
        const unitario = menor.price / menor.units;
        charges.push({
          concepto: `${restantes} unidad${restantes > 1 ? 'es' : ''}`,
          cantidad: restantes,
          precioUnitario: unitario,
          importe: restantes * unitario,
        });
      }

      return { charges, subtotal: sum(charges, (c) => c.importe) };
    },
  };
}

/** Fábrica por nombre — la usa el adapter de la planilla y la config. */
export function createPricing(kind, options = {}) {
  if (kind === 'bundle') return bundlePricing(options.tiers || []);
  return unitPricing();
}
