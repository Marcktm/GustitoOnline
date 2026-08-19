/**
 * core/order.js — El CONTRATO del pedido. Módulo hoja: no importa nada.
 *
 * Este payload es la frontera entre la carta y todo lo que venga después
 * (comandera, impresión de comandas, app del empleado, reportes de caja).
 * Es JSON plano, versionado y sin nada del navegador adentro: lo puede
 * consumir un backend en Python/Node sin traducción.
 *
 * Regla: si cambia el formato, sube ORDER_SCHEMA_VERSION. Nunca se rompe
 * un campo existente en silencio.
 */
export const ORDER_SCHEMA_VERSION = 2;   // v2: suma el bloque `entrega`

/**
 * @param {object} args
 * @param {object} args.negocio  { nombre, moneda }
 * @param {object} args.quote    resultado de core/quote.js
 * @param {string} args.canal    'carta-web' | 'mostrador' | 'telefono' | ...
 * @param {object} [args.entrega]  bloque de core/delivery.js → buildEntrega()
 * @param {object} [args.contexto] { origen?, mesa? } — para QR en mesa
 * @param {Date}   [args.now]      inyectable para tests
 */
export function buildOrder({ negocio, quote, canal = 'carta-web', entrega = null, contexto = {}, now = new Date() }) {
  return {
    version: ORDER_SCHEMA_VERSION,
    local: negocio.nombre,
    moneda: negocio.moneda || 'ARS',
    canal,
    creadoEn: now.toISOString(),
    estado: 'nuevo',                     // la comandera lo mueve: nuevo → en-cocina → listo → entregado

    // Cómo y a dónde va el pedido (lo que necesita el REPARTO)
    entrega: entrega ? {
      modalidad: entrega.modalidad,
      label: entrega.label,
      direccion: entrega.direccion,
      costo: entrega.costo,                  // null = todavía sin definir
      costoACoordinar: entrega.costoACoordinar,
    } : null,

    // Quién lo pidió
    cliente: entrega ? {
      nombre: entrega.datos.nombre || null,
      telefono: entrega.telefono,          // solo dígitos: sirve para tel: y wa.me
      nota: entrega.datos.nota || null,
    } : null,

    contexto,

    // Qué pidió la persona (lo que necesita la COCINA)
    items: quote.lines.map((l) => ({
      id: l.id,
      nombre: l.name,
      categoria: l.categoryId,
      cantidad: l.qty,
    })),

    // Cómo se cobra (lo que necesita la CAJA) — puede no ser 1:1 con items
    cargos: quote.charges.map((c) => ({
      concepto: c.concepto,
      cantidad: c.cantidad,
      precioUnitario: c.precioUnitario,
      importe: c.importe,
    })),

    total: quote.total,
  };
}

/** Resumen en una línea, útil para logs y para la lista de la comandera. */
export function orderSummary(order) {
  const unidades = order.items.reduce((a, i) => a + i.cantidad, 0);
  return `${order.local} · ${unidades} ítems · ${order.entrega?.label || 'sin entrega'} · ${order.total}`;
}
