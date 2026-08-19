/**
 * data/repositories.js — Repositorios con degradación elegante.
 * Depende de: data/{localMenu, sheetStatusSource}.
 *
 * Patrón Repository: la app pide "dame la carta" y no sabe ni le importa si vino
 * de la planilla, de un caché o del respaldo local. Si la fuente falla,
 * el repositorio NO propaga el error: devuelve el respaldo y avisa por `onFallback`.
 * Una planilla caída nunca deja al cliente frente a una página rota.
 */
import { createLocalMenu } from './localMenu.js';
import { ESTADO } from './sheetStatusSource.js';

/**
 * @param {object} args
 * @param {object|null} args.source      objeto con `load(): Promise<Menu>`
 * @param {function} [args.fallback]     carta de respaldo
 * @param {function} [args.onFallback]   (error) => void  para avisar en la UI
 */
export function createMenuRepository({ source, fallback = createLocalMenu, onFallback = () => {} }) {
  return {
    async load() {
      if (!source) return { menu: fallback(), origen: 'local' };
      try {
        const menu = await source.load();
        if (menu.isEmpty()) throw new Error('La planilla no tiene productos cargados');
        return { menu, origen: source.id };
      } catch (error) {
        onFallback(error);
        return { menu: fallback(), origen: 'local', error };
      }
    },
  };
}

/**
 * Estado operativo. Ante error asumimos ABIERTO: es preferible mostrar la carta
 * de más que dejar el local "en mantenimiento" por una falla de red.
 */
export function createStatusRepository({ source, onFallback = () => {} }) {
  return {
    async load() {
      if (!source) return { estado: ESTADO.ABIERTO, mensaje: '' };
      try {
        return await source.load();
      } catch (error) {
        onFallback(error);
        return { estado: ESTADO.ABIERTO, mensaje: '', error };
      }
    },
  };
}
