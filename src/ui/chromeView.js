/**
 * ui/chromeView.js — Render del "marco" del sitio: estado, horarios, contacto,
 * avisos y pantalla de mantenimiento. Depende de: ui/html.
 *
 * Recibe siempre datos ya resueltos (abierto/cerrado ya calculado por
 * core/schedule): la UI no toma decisiones de negocio.
 */
import { esc, list } from './html.js';

/** Pastilla Abierto / Cerrado del encabezado. */
export function renderStatus({ abierto, horarioHoy, proxima }) {
  const detalle = abierto
    ? `Hoy ${horarioHoy}`
    : proxima
      ? `Abrimos ${proxima.esHoy ? 'hoy' : proxima.dia} ${proxima.hora}`
      : 'Consultanos por WhatsApp';

  return `
    <span class="${esc(abierto ? 'status status--open' : 'status status--closed')}">
      <span class="status__dot" aria-hidden="true"></span>
      ${abierto ? 'Abierto ahora' : 'Cerrado ahora'}
      <span class="status__detail">· ${esc(detalle)}</span>
    </span>`;
}

/** Filas de horario del pie. */
export function renderHours(rows) {
  return list(rows, (r) => `
    <div class="hours__row">
      <span>${esc(r.days)}</span>
      <span>${esc(r.hours)}</span>
    </div>`);
}

/** Aviso superior (local cerrado, carta de respaldo, error de envío…). */
export function renderNotice(texto, tono = 'info') {
  if (!texto) return '';
  return `<div class="notice notice--${esc(tono)}" role="status">${esc(texto)}</div>`;
}

/** Pantalla completa de mantenimiento (la maneja la planilla de estado). */
export function renderMaintenance(negocio, mensaje) {
  return `
    <div class="maintenance">
      <h1 class="maintenance__title">${esc(negocio.nombre)}</h1>
      <p class="maintenance__msg">${esc(mensaje || 'Estamos actualizando la carta. Volvemos en un rato.')}</p>
      <a class="btn btn--send" href="https://wa.me/${esc(negocio.whatsapp)}" target="_blank" rel="noopener">
        Escribinos por WhatsApp
      </a>
    </div>`;
}
