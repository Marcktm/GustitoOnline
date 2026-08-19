/**
 * ui/deliveryView.js — Selector de entrega y datos del cliente.
 * Depende de: core/delivery (para saber qué mostrar), ui/html.
 *
 * Render puro: no decide qué campos van ni si están bien. Eso lo dice el dominio;
 * acá solo se dibuja lo que el dominio permite.
 */
import { camposVisibles, esRequerido, getModalidad } from '../core/delivery.js';
import { esc, cls, list } from './html.js';

export function renderDelivery(config, { modalidad, datos = {}, errores = {} }) {
  const elegida = getModalidad(config, modalidad);

  return `
    <section class="delivery">
      <h3 class="delivery__title">¿Cómo lo querés recibir?</h3>

      <div class="modes" role="radiogroup" aria-label="Modalidad de entrega">
        ${list(config.modalidades, (m) => `
          <button type="button" role="radio" aria-checked="${m.id === elegida.id}"
                  class="${cls('mode', m.id === elegida.id && 'mode--active')}"
                  data-act="modalidad" data-modalidad="${esc(m.id)}">
            <span class="mode__icon" aria-hidden="true">${esc(m.icono || '')}</span>
            <span class="mode__label">${esc(m.label)}</span>
          </button>`)}
      </div>

      ${elegida.detalle ? `<p class="delivery__detail">${esc(elegida.detalle)}</p>` : ''}

      <div class="fields">
        ${list(camposVisibles(config, elegida.id), (campo) => renderCampo(campo, elegida.id, datos, errores))}
      </div>
    </section>`;
}

function renderCampo(campo, modalidadId, datos, errores) {
  const error = errores[campo.id];
  const requerido = esRequerido(campo, modalidadId);

  return `
    <label class="field">
      <span class="field__label">
        ${esc(campo.label)}${requerido ? '<span class="field__req" aria-hidden="true"> *</span>' : ''}
      </span>
      <input type="${esc(campo.tipo || 'text')}"
             ${campo.teclado ? `inputmode="${esc(campo.teclado)}"` : ''}
             class="${cls('field__input', error && 'field__input--error')}"
             data-campo="${esc(campo.id)}"
             value="${esc(datos[campo.id] || '')}"
             placeholder="${esc(campo.placeholder || '')}"
             autocomplete="${esc(campo.autocomplete || 'off')}"
             ${requerido ? 'aria-required="true"' : ''}
             ${error ? 'aria-invalid="true"' : ''}>
      ${error ? `<span class="field__error">${esc(error)}</span>` : ''}
    </label>`;
}
