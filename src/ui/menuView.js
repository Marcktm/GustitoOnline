/**
 * ui/menuView.js — Render de la carta. Depende de: core/money, ui/html.
 *
 * Funciones puras: reciben datos y devuelven HTML. No leen estado global,
 * no tocan el DOM, no conocen el carrito (la cantidad llega por `qtyOf`).
 * Por eso se pueden probar y reusar en la futura pantalla del empleado.
 *
 * La interacción viaja por atributos `data-act` / `data-id`: el controlador
 * (app/main.js) escucha con delegación de eventos. Cero `onclick` en el HTML.
 */
import { formatMoney } from '../core/money.js';
import { esc, cls, list } from './html.js';

/** Pestañas de categoría. */
export function renderTabs(categories, activeId) {
  return list(categories, (cat) => `
    <button class="${cls('tab', cat.id === activeId && 'tab--active')}"
            role="tab" aria-selected="${cat.id === activeId}" data-act="tab" data-cat="${esc(cat.id)}">
      ${esc(cat.label)}
    </button>`);
}

/** Escalones de precio de una categoría por combo (Individual / Media / Docena). */
export function renderTiers(category, locale) {
  const tiers = category.pricing.tiers || [];
  if (!tiers.length) return '';
  const ordenados = [...tiers].sort((a, b) => a.units - b.units);
  return `
    <div class="tiers" aria-label="Precios por cantidad">
      ${list(ordenados, (t) => `
        <div class="tier">
          <span class="tier__label">${esc(t.label)}</span>
          <span class="tier__price">${formatMoney(t.price, locale)}</span>
        </div>`)}
    </div>`;
}

/** La carta completa (categorías ya filtradas). */
export function renderMenu(categories, { qtyOf, locale, atajos = {} }) {
  if (!categories.length) {
    return `
      <div class="empty">
        <p class="empty__title">No encontramos nada con eso</p>
        <p class="empty__hint">Probá con otra palabra.</p>
      </div>`;
  }

  return list(categories, (cat) => `
    <section class="category" id="cat-${esc(cat.id)}">
      <header class="category__head">
        <h2 class="category__title">${esc(cat.label)}</h2>
        ${cat.tagline ? `<p class="category__tagline">${esc(cat.tagline)}</p>` : ''}
      </header>
      ${cat.pricing.perUnit ? '' : renderTiers(cat, locale)}
      <div class="products">
        ${list(cat.products, (p) => renderProduct(p, {
          qty: qtyOf(p.id),
          mostrarPrecio: cat.pricing.perUnit,
          atajos: atajos[cat.id] || [],
          locale,
        }))}
      </div>
    </section>`);
}

function renderProduct(product, { qty, mostrarPrecio, atajos, locale }) {
  const off = !product.available;

  return `
    <article class="${cls('product', off && 'product--off', qty > 0 && 'product--active')}">
      ${product.image
        ? `<img class="product__img" src="${esc(product.image)}" alt="" loading="lazy" decoding="async">`
        : '<div class="product__img product__img--empty" aria-hidden="true"></div>'}

      <div class="product__body">
        <h3 class="product__name">${esc(product.name)}</h3>
        ${product.desc ? `<p class="product__desc">${esc(product.desc)}</p>` : ''}
        ${mostrarPrecio ? `<p class="product__price">${formatMoney(product.price, locale)}</p>` : ''}
        ${off ? '<p class="product__badge">Sin stock por hoy</p>' : ''}
      </div>

      <div class="product__actions">
        ${off ? '' : renderStepper(product, qty, atajos)}
      </div>
    </article>`;
}

function renderStepper(product, qty, atajos) {
  const id = esc(product.id);

  if (qty === 0) {
    return `
      <div class="stepper stepper--closed">
        ${list(atajos, (n) => `
          <button class="shortcut" data-act="add" data-id="${id}" data-amount="${n}"
                  aria-label="Agregar ${n} de ${esc(product.name)}">+${n}</button>`)}
        <button class="add" data-act="add" data-id="${id}" data-amount="1"
                aria-label="Agregar ${esc(product.name)}">+</button>
      </div>`;
  }

  return `
    <div class="stepper">
      ${list(atajos, (n) => `
        <button class="shortcut" data-act="add" data-id="${id}" data-amount="${n}">+${n}</button>`)}
      <div class="counter">
        <button class="counter__btn" data-act="dec" data-id="${id}" data-amount="1" aria-label="Quitar uno">−</button>
        <span class="counter__qty" aria-live="polite">${qty}</span>
        <button class="counter__btn" data-act="add" data-id="${id}" data-amount="1" aria-label="Agregar uno">+</button>
      </div>
    </div>`;
}
