/**
 * app/main.js — COMPOSITION ROOT: el único módulo que conoce todas las capas.
 *
 * Grafo de dependencias (siempre hacia acá, nunca de vuelta → sin ciclos):
 *
 *   core/*          hojas puras: money, text, schedule, pricing, quote, cart, order, menu
 *        ▲
 *   data/*          csv, driveImage, sheetMenuSource, sheetStatusSource, localMenu, repositories
 *   services/*      orderGateway, storage
 *   ui/*            html, menuView, cartView, chromeView
 *        ▲
 *   app/main.js     arma las piezas y maneja los eventos   ← ÚNICA RAÍZ
 *
 * Ningún módulo importa a `main`. `core` no importa a nadie fuera de `core`.
 * La UI no importa `data`, y `data` no importa la UI.
 */
import { CONFIG } from './config.js';

import { createCart } from '../core/cart.js';
import { filterMenu } from '../core/menu.js';
import { quoteOrder } from '../core/quote.js';
import { buildOrder } from '../core/order.js';
import { isOpenAt, todayLabel, nextOpening, weeklySummary } from '../core/schedule.js';
import { buildEntrega, validarEntrega, getModalidad } from '../core/delivery.js';

import { createSheetMenuSource } from '../data/sheetMenuSource.js';
import { createSheetStatusSource, ESTADO } from '../data/sheetStatusSource.js';
import { createMenuRepository, createStatusRepository } from '../data/repositories.js';

import { createWhatsAppGateway, createHttpGateway, createCompositeGateway } from '../services/orderGateway.js';
import { createStorage } from '../services/storage.js';

import * as menuView from '../ui/menuView.js';
import * as cartView from '../ui/cartView.js';
import * as chromeView from '../ui/chromeView.js';

const $ = (sel) => document.querySelector(sel);
const { negocio, horarios, pedido } = CONFIG;
const locale = negocio.locale;

/* ─────────────────────────── Dependencias (inyección) ─────────────────────── */

const menuRepo = createMenuRepository({
  source: CONFIG.fuentes.carta.enabled && CONFIG.fuentes.carta.csvUrl
    ? createSheetMenuSource({ csvUrl: CONFIG.fuentes.carta.csvUrl, mapeo: CONFIG.mapeoCarta })
    : null,
  onFallback: (error) => {
    console.warn('[carta] uso la carta de respaldo:', error.message);
    state.aviso = { texto: 'Mostrando la carta de respaldo: puede haber precios desactualizados.', tono: 'warn' };
  },
});

const statusRepo = createStatusRepository({
  source: CONFIG.fuentes.estado.enabled && CONFIG.fuentes.estado.csvUrl
    ? createSheetStatusSource({ csvUrl: CONFIG.fuentes.estado.csvUrl })
    : null,
  onFallback: (error) => console.warn('[estado] asumo local operativo:', error.message),
});

const gateway = crearGateway();
const storage = createStorage('gustito:pedido:v1');
const storageEntrega = createStorage('gustito:entrega:v1');
const cart = createCart();

/* ────────────────────────────── Estado de vista ───────────────────────────── */

const state = {
  menu: null,
  query: '',
  categoriaActiva: null,
  hojaAbierta: false,
  aviso: null,
  entrega: {
    modalidad: CONFIG.entrega.porDefecto,
    datos: {},
    errores: {},
  },
};

const atajosPorCategoria = Object.fromEntries(
  CONFIG.mapeoCarta.categorias.map((c) => [c.id, c.atajos || []]),
);

const puedePedir = () => pedido.permitirFueraDeHorario || isOpenAt(horarios);

/* ───────────────────────────────── Render ─────────────────────────────────── */

function renderCarta() {
  const visibles = filterMenu(state.menu, {
    query: state.query,
    categoryId: state.categoriaActiva,
  });

  $('#tabs').innerHTML = menuView.renderTabs(state.menu.categories, state.query ? null : state.categoriaActiva);
  $('#menu').innerHTML = menuView.renderMenu(visibles, {
    qtyOf: (id) => cart.qty(id),
    locale,
    atajos: atajosPorCategoria,
  });
}

function renderPedido() {
  const quote = quoteOrder(state.menu, cart.get());
  const barra = $('#cartbar');

  if (quote.count > 0) {
    barra.innerHTML = cartView.renderCartBar(quote.count, quote.total, locale);
    barra.hidden = false;
  } else {
    barra.innerHTML = '';
    barra.hidden = true;
    if (state.hojaAbierta) cerrarHoja();
  }

  if (state.hojaAbierta) {
    $('#sheet-overlay').innerHTML = cartView.renderSheet(quote, {
      locale,
      puedeEnviar: puedePedir(),
      aviso: puedePedir() ? '' : 'El local está cerrado: podés armar el pedido y enviarlo cuando abramos.',
      entrega: { config: CONFIG.entrega, ...state.entrega },
    });
  }
}

function renderMarco() {
  $('#status').innerHTML = chromeView.renderStatus({
    abierto: isOpenAt(horarios),
    horarioHoy: todayLabel(horarios),
    proxima: nextOpening(horarios),
  });
  $('#hours').innerHTML = chromeView.renderHours(weeklySummary(horarios));
  $('#notice').innerHTML = state.aviso ? chromeView.renderNotice(state.aviso.texto, state.aviso.tono) : '';
}

function renderContacto() {
  $('#wa-link').href = `https://wa.me/${negocio.whatsapp}`;
  $('#wa-link').textContent = negocio.whatsappLindo;
  $('#ig-link').href = `https://instagram.com/${negocio.instagram}`;
  $('#ig-link').textContent = `@${negocio.instagram}`;
  $('#map-link').href = negocio.mapsUrl;
  $('#map-link').textContent = negocio.direccion;
  document.querySelectorAll('[data-negocio="nombre"]').forEach((el) => { el.textContent = negocio.nombre; });
  document.querySelectorAll('[data-negocio="tagline"]').forEach((el) => { el.textContent = negocio.tagline; });
}

function avisar(texto, tono = 'info', ms = 6000) {
  state.aviso = { texto, tono };
  renderMarco();
  if (ms) setTimeout(() => { if (state.aviso?.texto === texto) { state.aviso = null; renderMarco(); } }, ms);
}

/* ────────────────────────────── Hoja de pedido ───────────────────────────── */

function abrirHoja() {
  state.hojaAbierta = true;
  $('#sheet-overlay').hidden = false;
  document.body.classList.add('is-locked');
  renderPedido();
}

function cerrarHoja() {
  state.hojaAbierta = false;
  $('#sheet-overlay').hidden = true;
  $('#sheet-overlay').innerHTML = '';
  document.body.classList.remove('is-locked');
}

/* ──────────────────────────────── Acciones ───────────────────────────────── */

async function enviarPedido() {
  const quote = quoteOrder(state.menu, cart.get());
  if (!quote.count) return avisar('Todavía no elegiste nada.', 'warn');
  if (!puedePedir()) return avisar('El local está cerrado en este momento.', 'warn');

  // La entrega la valida el dominio, no la UI ni el navegador.
  const { ok, errores } = validarEntrega(CONFIG.entrega, state.entrega.modalidad, state.entrega.datos);
  state.entrega.errores = errores;
  if (!ok) {
    renderPedido();
    $('.field__input--error')?.focus();
    return avisar('Faltan datos para el envío.', 'warn');
  }

  const entrega = buildEntrega(CONFIG.entrega, state.entrega.modalidad, state.entrega.datos);
  const order = buildOrder({ negocio, quote, canal: 'carta-web', entrega });

  try {
    await gateway.send(order);
    cerrarHoja();
    avisar(order.entrega.modalidad === 'envio'
      ? 'Te abrimos WhatsApp para confirmar el pedido y el costo del envío.'
      : 'Te abrimos WhatsApp para confirmar el pedido.', 'ok');
  } catch (error) {
    console.error('[pedido] no se pudo enviar:', error);
    avisar('No pudimos enviar el pedido. Probá de nuevo o escribinos por WhatsApp.', 'warn', 0);
  }
}

/** Un solo listener para toda la app (delegación por `data-act`). */
function conectarEventos() {
  document.addEventListener('click', (event) => {
    const boton = event.target.closest('[data-act]');

    // Click en el fondo de la hoja → cerrar
    if (!boton) {
      if (state.hojaAbierta && event.target.closest('#sheet-overlay') && !event.target.closest('[data-sheet]')) {
        cerrarHoja();
      }
      return;
    }

    const { act, id, amount, cat } = boton.dataset;
    const cantidad = Number(amount) || 1;

    switch (act) {
      case 'tab':
        if (state.query) limpiarBusqueda();   // la pestaña manda: si había búsqueda, se limpia
        state.categoriaActiva = cat;
        renderCarta();
        $('#cat-' + cat)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      case 'add': cart.add(id, cantidad); break;
      case 'dec': cart.dec(id, cantidad); break;
      case 'clear': cart.clear(); break;
      case 'modalidad': elegirModalidad(boton.dataset.modalidad); break;
      case 'open-sheet': abrirHoja(); break;
      case 'close-sheet': cerrarHoja(); break;
      case 'send': enviarPedido(); break;
      case 'clear-search': limpiarBusqueda(); break;
    }
  });

  const buscador = $('#search');
  buscador.addEventListener('input', () => {
    state.query = buscador.value.trim();
    $('#search-clear').hidden = !state.query;
    renderCarta();
  });

  // Tipeo en los datos de entrega. No re-renderizamos en cada tecla: eso
  // arrancaría el foco del input. Solo actualizamos el estado y borramos
  // el error del campo que se está corrigiendo.
  document.addEventListener('input', (event) => {
    const input = event.target.closest('[data-campo]');
    if (!input) return;

    const campo = input.dataset.campo;
    state.entrega.datos[campo] = input.value;
    guardarEntrega();

    if (state.entrega.errores[campo]) {
      delete state.entrega.errores[campo];
      input.classList.remove('field__input--error');
      input.removeAttribute('aria-invalid');
      input.parentElement.querySelector('.field__error')?.remove();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.hojaAbierta) cerrarHoja();
  });

  // El carrito avisa; la vista reacciona. La UI nunca calcula precios.
  cart.subscribe((items) => {
    if (pedido.persistir) storage.write(items);
    renderCarta();
    renderPedido();
  });
}

function elegirModalidad(modalidadId) {
  if (state.entrega.modalidad === modalidadId) return;
  state.entrega.modalidad = getModalidad(CONFIG.entrega, modalidadId).id;
  state.entrega.errores = {};
  guardarEntrega();
  renderPedido();
}

function guardarEntrega() {
  if (pedido.persistir) {
    storageEntrega.write({ modalidad: state.entrega.modalidad, datos: state.entrega.datos });
  }
}

function limpiarBusqueda() {
  const buscador = $('#search');
  buscador.value = '';
  state.query = '';
  $('#search-clear').hidden = true;
  renderCarta();
}

/* ─────────────────────────────────── Init ────────────────────────────────── */

async function init() {
  renderContacto();
  renderMarco();

  const [status, carta] = await Promise.all([statusRepo.load(), menuRepo.load()]);

  if (status.estado === ESTADO.MANTENIMIENTO) {
    $('#app').innerHTML = chromeView.renderMaintenance(negocio, status.mensaje);
    return;
  }

  state.menu = carta.menu;
  state.categoriaActiva = state.menu.categories[0]?.id ?? null;

  if (pedido.persistir) {
    cart.hydrate(storage.read({}), (id) => state.menu.has(id) && state.menu.get(id).available);

    // El cliente que vuelve no reescribe su dirección.
    const guardada = storageEntrega.read({});
    state.entrega.modalidad = getModalidad(CONFIG.entrega, guardada.modalidad).id;
    state.entrega.datos = guardada.datos || {};
  }

  $('#loader').hidden = true;
  renderCarta();
  renderPedido();
  conectarEventos();

  if (!puedePedir()) {
    avisar('Ahora estamos cerrados: podés ver la carta y armar tu pedido igual.', 'info', 0);
  }

  // El estado abierto/cerrado se recalcula solo mientras la página está abierta.
  setInterval(renderMarco, 60_000);
}

function crearGateway() {
  const whatsapp = createWhatsAppGateway({ phone: negocio.whatsapp, locale });
  if (pedido.canal === 'http') return createHttpGateway({ endpoint: pedido.http.endpoint });
  if (pedido.canal === 'ambos') {
    return createCompositeGateway([whatsapp, createHttpGateway({ endpoint: pedido.http.endpoint })]);
  }
  return whatsapp;
}

init();
