/**
 * services/orderGateway.js — Salida del pedido (patrón Adapter / Strategy).
 * Depende de: core/{money}.
 *
 * ★ ESTA ES LA COSTURA DE INTEGRACIÓN CON LA COMANDERA ★
 *
 * Todos los gateways cumplen el mismo contrato:
 *     { id, async send(order) -> { ok, canal, detalle? } }
 *
 * Hoy el pedido sale por WhatsApp. Cuando exista la comandera, se cambia
 * UNA línea en app/config.js (`pedido.canal: 'http'`) y el pedido viaja por
 * POST al backend. Ningún otro archivo del proyecto se toca: ni el carrito,
 * ni la carta, ni la UI. Ese es el punto de toda la arquitectura.
 */
import { formatMoney } from '../core/money.js';

/** Canal actual: abre WhatsApp con el detalle escrito. */
export function createWhatsAppGateway({ phone, locale = 'es-AR', open = defaultOpen }) {
  return {
    id: 'whatsapp',
    async send(order) {
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(orderToText(order, locale))}`;
      open(url);
      return { ok: true, canal: 'whatsapp', detalle: url };
    },
  };
}

/**
 * Canal futuro: POST del payload a la comandera / sistema de gestión.
 * Ya está escrito y probado el contrato; solo falta el backend del otro lado.
 */
export function createHttpGateway({ endpoint, fetchImpl = fetch, headers = {} }) {
  return {
    id: 'http',
    async send(order) {
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(order),
      });
      if (!res.ok) throw new Error(`La comandera respondió HTTP ${res.status}`);
      return { ok: true, canal: 'http', detalle: await res.json().catch(() => null) };
    },
  };
}

/**
 * Envía por varios canales a la vez (ej: WhatsApp al cliente + POST a la cocina).
 * Útil en la transición: se enchufa la comandera sin apagar WhatsApp.
 */
export function createCompositeGateway(gateways) {
  return {
    id: 'composite',
    async send(order) {
      const resultados = await Promise.allSettled(gateways.map((g) => g.send(order)));
      const ok = resultados.some((r) => r.status === 'fulfilled');
      return { ok, canal: 'composite', detalle: resultados };
    },
  };
}

/** Texto legible del pedido — presentación propia del canal WhatsApp. */
export function orderToText(order, locale = 'es-AR') {
  const items = order.items.map((i) => `• ${i.cantidad} ${i.nombre}`).join('\n');
  const cargos = order.cargos
    .map((c) => `• ${c.cantidad} ${c.concepto} — ${formatMoney(c.importe, locale)}`)
    .join('\n');

  return [
    `¡Hola ${order.local}! Quiero hacer este pedido:`,
    '',
    '*PEDIDO*',
    items,
    '',
    '*IMPORTES*',
    cargos,
    '',
    `*Total: ${formatMoney(order.total, locale)}*`,
    ...bloqueEntrega(order),
  ].join('\n');
}

/** Modalidad, dirección y datos del cliente, solo si corresponden. */
function bloqueEntrega(order) {
  if (!order.entrega) return [];

  const lineas = ['', '*ENTREGA*', order.entrega.label];
  if (order.entrega.direccion) lineas.push(`Dirección: ${order.entrega.direccion}`);
  if (order.cliente?.nombre) lineas.push(`A nombre de: ${order.cliente.nombre}`);
  if (order.cliente?.nota) lineas.push(`Aclaraciones: ${order.cliente.nota}`);
  if (order.entrega.costoACoordinar) lineas.push('(El costo del envío lo coordinamos)');
  return lineas;
}

function defaultOpen(url) {
  window.open(url, '_blank', 'noopener');
}
