// delivery + order: el contrato que sale hacia WhatsApp y la comandera.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/app/config.js';
import { validarEntrega, buildEntrega, camposVisibles, getModalidad } from '../src/core/delivery.js';
import { buildOrder, orderSummary, ORDER_SCHEMA_VERSION } from '../src/core/order.js';

const entrega = CONFIG.entrega;

test('delivery: retiro no exige datos; envío exige nombre, teléfono y dirección', () => {
  assert.equal(validarEntrega(entrega, 'retiro', {}).ok, true);

  const { ok, errores } = validarEntrega(entrega, 'envio', {});
  assert.equal(ok, false);
  assert.deepEqual(Object.keys(errores).sort(), ['direccion', 'nombre', 'telefono']);
});

test('delivery: el teléfono se valida por dígitos, no por largo', () => {
  const base = { nombre: 'Marcos', direccion: 'Laprida 212' };
  assert.equal(validarEntrega(entrega, 'envio', { ...base, telefono: '351 559-8947' }).ok, true);
  assert.ok(validarEntrega(entrega, 'envio', { ...base, telefono: '15-55-12' }).errores.telefono);
});

test('delivery: la dirección corta pide más detalle', () => {
  const r = validarEntrega(entrega, 'envio', { nombre: 'M', telefono: '3515598947', direccion: 'Lap' });
  assert.deepEqual(Object.keys(r.errores), ['direccion']);
});

test('delivery: retiro no muestra dirección; un id raro cae en la primera modalidad', () => {
  assert.ok(!camposVisibles(entrega, 'retiro').some((c) => c.id === 'direccion'));
  assert.equal(getModalidad(entrega, 'teletransporte').id, entrega.modalidades[0].id);
});

test('buildEntrega: limpia datos, normaliza el teléfono y marca el costo a coordinar', () => {
  const e = buildEntrega(entrega, 'envio', {
    nombre: '  Marcos ', telefono: '351 559-8947', direccion: 'Laprida 212, 3º B', nota: '', ajeno: 'x',
  });
  assert.equal(e.modalidad, 'envio');
  assert.equal(e.telefono, '3515598947');
  assert.equal(e.direccion, 'Laprida 212, 3º B');
  assert.equal(e.costo, null);
  assert.equal(e.costoACoordinar, true);
  assert.deepEqual(e.datos, { nombre: 'Marcos', telefono: '351 559-8947', direccion: 'Laprida 212, 3º B' });
});

test('buildOrder: payload versión 2 con cocina, caja y reparto separados', () => {
  const quote = {
    lines: [
      { id: 'carne', name: 'Carne', categoryId: 'empanadas', qty: 7 },
      { id: 'pollo', name: 'Pollo', categoryId: 'empanadas', qty: 6 },
    ],
    charges: [
      { concepto: 'Docena', cantidad: 1, precioUnitario: 12000, importe: 12000 },
      { concepto: 'Individual', cantidad: 1, precioUnitario: 1200, importe: 1200 },
    ],
    total: 13200,
  };
  const order = buildOrder({
    negocio: CONFIG.negocio,
    quote,
    entrega: buildEntrega(entrega, 'envio', {
      nombre: 'Marcos', telefono: '351 559-8947', direccion: 'Laprida 212', nota: 'Timbre B',
    }),
    now: new Date('2026-08-18T22:30:00.000Z'),
  });

  assert.equal(order.version, ORDER_SCHEMA_VERSION);
  assert.equal(order.version, 2);
  assert.equal(order.creadoEn, '2026-08-18T22:30:00.000Z');
  assert.equal(order.estado, 'nuevo');
  assert.equal(order.moneda, 'ARS');
  assert.deepEqual(order.items.map((i) => [i.id, i.cantidad]), [['carne', 7], ['pollo', 6]]);
  assert.equal(order.cargos.length, 2);
  assert.equal(order.total, 13200);
  assert.deepEqual(order.cliente, { nombre: 'Marcos', telefono: '3515598947', nota: 'Timbre B' });
  assert.equal(order.entrega.costoACoordinar, true);
  assert.equal(orderSummary(order), 'Gustito a Salta · 13 ítems · Envío a domicilio · 13200');
});

test('buildOrder: sin entrega, cliente y entrega van en null y viaja como JSON', () => {
  const order = buildOrder({ negocio: { nombre: 'X' }, quote: { lines: [], charges: [], total: 0 } });
  assert.equal(order.entrega, null);
  assert.equal(order.cliente, null);
  assert.equal(order.canal, 'carta-web');
  assert.deepEqual(JSON.parse(JSON.stringify(order)), order);
});
