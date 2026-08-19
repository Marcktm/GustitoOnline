/**
 * services/storage.js — Persistencia local del pedido. Módulo hoja.
 *
 * Envuelve localStorage para que un navegador en modo privado (que tira excepción)
 * no rompa la carta. Si no se puede guardar, simplemente no se guarda.
 */
export function createStorage(key, storage = safeStorage()) {
  return {
    read(fallback = null) {
      try { return JSON.parse(storage.getItem(key)) ?? fallback; }
      catch { return fallback; }
    },
    write(value) {
      try { storage.setItem(key, JSON.stringify(value)); } catch { /* sin persistencia */ }
    },
    clear() {
      try { storage.removeItem(key); } catch { /* sin persistencia */ }
    },
  };
}

function safeStorage() {
  try {
    const probe = '__probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    const memoria = new Map();
    return {
      getItem: (k) => memoria.get(k) ?? null,
      setItem: (k, v) => memoria.set(k, v),
      removeItem: (k) => memoria.delete(k),
    };
  }
}
