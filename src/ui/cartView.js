/**
 * ui/cartView.js — Render del pedido (barra flotante + hoja de detalle).
 * Depende de: core/money, ui/html.
 *
 * Muestra las dos caras del pedido que ya calcula el dominio:
 *   · líneas  → qué eligió la persona (lo que va a cocina)
 *   · cargos  → cómo se cobra (lo que va a caja)
 * En empanadas no coinciden, y eso es exactamente lo que hay que mostrar bien.
 */
import { formatMoney } from '../core/money.js';
import { esc, list } from './html.js';

/** Barra inferior con el resumen. */
export function renderCartBar(count, total, locale) {
  return `
    <button class="cartbar__btn" data-act="open-sheet">
      <span class="cartbar__count">${count}</span>
      <span class="cartbar__label">Ver mi pedido</span>
      <span class="cartbar__total">${formatMoney(total, locale)}</span>
    </button>`;
}

/**
 * Hoja de detalle.
 * @param {object} quote  resultado de core/quote.js
 * @param {object} opts   { locale, puedeEnviar, aviso }
 */
export function renderSheet(quote, { locale, puedeEnviar = true, aviso = '' }) {
  return `
    <div class="sheet" data-sheet role="dialog" aria-modal="true" aria-label="Detalle del pedido">
      <header class="sheet__head">
        <div>
          <h2 class="sheet__title">Tu pedido</h2>
          <p class="sheet__sub">Revisalo antes de enviarlo</p>
        </div>
        <button class="sheet__close" data-act="close-sheet" aria-label="Cerrar">×</button>
      </header>

      <div class="sheet__body">
        ${list(quote.groups, (g) => renderGroup(g, locale))}
        ${renderCharges(quote, locale)}
      </div>

      <footer class="sheet__foot">
        ${aviso ? `<p class="sheet__notice">${esc(aviso)}</p>` : ''}
        <div class="sheet__total">
          <span>Total</span>
          <strong>${formatMoney(quote.total, locale)}</strong>
        </div>
        <button class="btn btn--send" data-act="send" ${puedeEnviar ? '' : 'disabled'}>
          Enviar pedido por WhatsApp
        </button>
        <button class="btn btn--ghost" data-act="clear">Vaciar pedido</button>
      </footer>
    </div>`;
}

function renderGroup(group, locale) {
  return `
    <section class="sheet__group">
      <h3 class="sheet__groupTitle">${esc(group.label)}</h3>
      ${list(group.lines, (l) => `
        <div class="line">
          <div class="line__info">
            <span class="line__name">${esc(l.name)}</span>
            ${group.perUnit ? `<span class="line__unit">${formatMoney(l.price, locale)} c/u</span>` : ''}
          </div>
          <div class="counter counter--light">
            <button class="counter__btn" data-act="dec" data-id="${esc(l.id)}" data-amount="1" aria-label="Quitar uno">−</button>
            <span class="counter__qty">${l.qty}</span>
            <button class="counter__btn" data-act="add" data-id="${esc(l.id)}" data-amount="1" aria-label="Agregar uno">+</button>
          </div>
        </div>`)}
    </section>`;
}

/** Desglose de cobro: docenas, medias, sueltas, bebidas. */
function renderCharges(quote, locale) {
  if (!quote.charges.length) return '';
  return `
    <section class="charges">
      <h3 class="charges__title">Detalle del importe</h3>
      ${list(quote.charges, (c) => `
        <div class="charge">
          <span class="charge__concept">${esc(c.cantidad)} ${esc(c.concepto)}</span>
          <span class="charge__dots"></span>
          <span class="charge__amount">${formatMoney(c.importe, locale)}</span>
        </div>`)}
    </section>`;
}
