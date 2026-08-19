/**
 * data/sheetStatusSource.js — Estado operativo del local (planilla de estado).
 * Depende de: core/text, data/csv.
 *
 * La planilla trae una palabra: HABILITADA / MANTENIMIENTO. Lo traducimos a un
 * estado de dominio con mensaje opcional (segunda columna, si el local la usa).
 */
import { normalize } from '../core/text.js';
import { parseCsv } from './csv.js';

export const ESTADO = { ABIERTO: 'operativo', MANTENIMIENTO: 'mantenimiento' };

export function createSheetStatusSource({ csvUrl, fetchImpl = fetch }) {
  return {
    id: 'google-sheets',
    async load() {
      const res = await fetchImpl(csvUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`La planilla de estado respondió HTTP ${res.status}`);
      return mapRowsToStatus(parseCsv(await res.text()));
    },
  };
}

export function mapRowsToStatus(rows) {
  const fila = rows[1] || [];
  const valor = normalize(fila[0] || '');
  const enMantenimiento = valor.includes('mantenimiento');
  return {
    estado: enMantenimiento ? ESTADO.MANTENIMIENTO : ESTADO.ABIERTO,
    mensaje: (fila[1] || '').trim(),
  };
}
