/**
 * ui/html.js — Utilidades de render. Módulo hoja de la capa UI.
 *
 * Todo lo que viene de la planilla se escapa antes de entrar al HTML:
 * si alguien escribe `<script>` en una celda, se ve como texto.
 */

/** Escapa texto para insertarlo en HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** Une clases condicionales: cls('item', sinStock && 'item--off') */
export function cls(...values) {
  return values.filter(Boolean).join(' ');
}

/** Renderiza una lista sin ensuciar el código con .map().join(''). */
export function list(items, render) {
  return items.map(render).join('');
}
