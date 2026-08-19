/**
 * core/cart.js — Estado del pedido. Módulo hoja: no importa NADA (ni siquiera dominio).
 *
 * Store observable minimalista: { get, add, dec, set, remove, clear, subscribe }.
 * No conoce precios ni DOM — solo cantidades por id. El precio lo calcula
 * core/quote.js y el render lo hace la UI. Esa separación es la que permite
 * reusar este mismo carrito en la futura app del empleado.
 */
export function createCart(initial = {}) {
  let items = sanitize(initial);
  const listeners = new Set();

  const emit = () => {
    const snapshot = { ...items };
    listeners.forEach((fn) => fn(snapshot));
  };

  const write = (next) => {
    items = sanitize(next);
    emit();
  };

  return {
    get: () => ({ ...items }),
    qty: (id) => items[id] || 0,
    count: () => Object.values(items).reduce((a, b) => a + b, 0),
    isEmpty: () => Object.keys(items).length === 0,

    add(id, amount = 1) { write({ ...items, [id]: (items[id] || 0) + amount }); },
    dec(id, amount = 1) { write({ ...items, [id]: (items[id] || 0) - amount }); },
    set(id, qty) { write({ ...items, [id]: qty }); },
    remove(id) { const next = { ...items }; delete next[id]; write(next); },
    clear() { write({}); },

    /** Rehidrata el carrito (ej: desde localStorage) validando contra la carta. */
    hydrate(saved, isValid = () => true) {
      const next = {};
      for (const [id, qty] of Object.entries(saved || {})) {
        if (isValid(id)) next[id] = qty;
      }
      write(next);
    },

    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

/** Descarta cantidades <= 0 o inválidas: el estado siempre queda consistente. */
function sanitize(items) {
  const clean = {};
  for (const [id, qty] of Object.entries(items || {})) {
    const n = Math.floor(Number(qty) || 0);
    if (n > 0) clean[id] = n;
  }
  return clean;
}
