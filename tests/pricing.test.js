import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bundlePricing, unitPricing, createPricing } from '../src/core/pricing.js';

const ESCALONES = [
  { units: 1, price: 1200, label: 'Individual', plural: 'Individuales' },
  { units: 6, price: 6500, label: 'Media Docena', plural: 'Medias Docenas' },
  { units: 12, price: 12000, label: 'Docena', plural: 'Docenas' },
];
const empanadas = (...qtys) => qtys.map((qty, i) => ({ id: `e${i}`, name: `Gusto ${i}`, qty, price: 0 }));

test('bundle: 13 empanadas = 1 docena + 1 individual', () => {
  const { charges, subtotal } = bundlePricing(ESCALONES).quote(empanadas(7, 6));
  assert.deepEqual(charges.map((c) => [c.concepto, c.cantidad]), [['Docena', 1], ['Individual', 1]]);
  assert.equal(subtotal, 13200);
});

test('bundle: reparto greedy docenas → medias → sueltas', () => {
  const { charges, subtotal } = bundlePricing(ESCALONES).quote(empanadas(20, 9));   // 29
  assert.deepEqual(charges.map((c) => [c.concepto, c.cantidad]),
    [['Docenas', 2], ['Individuales', 5]]);
  assert.equal(subtotal, 2 * 12000 + 5 * 1200);

  const media = bundlePricing(ESCALONES).quote(empanadas(8));                       // 8 = 6 + 2
  assert.deepEqual(media.charges.map((c) => [c.concepto, c.cantidad]),
    [['Media Docena', 1], ['Individuales', 2]]);
});

test('bundle: el orden de los escalones de entrada no importa', () => {
  const desordenados = [ESCALONES[1], ESCALONES[2], ESCALONES[0]];
  assert.equal(bundlePricing(desordenados).quote(empanadas(13)).subtotal, 13200);
});

test('bundle: sin escalón de 1 unidad, el sobrante se prorratea', () => {
  const soloDocenas = [{ units: 12, price: 12000, label: 'Docena' }, { units: 6, price: 6600, label: 'Media Docena' }];
  const { charges, subtotal } = bundlePricing(soloDocenas).quote(empanadas(14));
  assert.equal(charges.at(-1).concepto, '2 unidades');
  assert.equal(subtotal, 12000 + 2 * 1100);
});

test('bundle: descarta escalones inválidos y no cobra pedidos vacíos', () => {
  const p = bundlePricing([...ESCALONES, { units: 0, price: 1 }, { units: 3, price: NaN }]);
  assert.equal(p.tiers.length, 3);
  assert.deepEqual(p.quote([]), { charges: [], subtotal: 0 });
});

test('unit: cantidad × precio por línea', () => {
  const { charges, subtotal } = unitPricing().quote([
    { id: 'agua', name: 'Agua', qty: 2, price: 1500 },
    { id: 'coca', name: 'Gaseosa', qty: 1, price: 2000 },
  ]);
  assert.deepEqual(charges[0], { concepto: 'Agua', cantidad: 2, precioUnitario: 1500, importe: 3000 });
  assert.equal(subtotal, 5000);
});

test('createPricing elige la estrategia por nombre', () => {
  assert.equal(createPricing('bundle', { tiers: ESCALONES }).id, 'bundle');
  assert.equal(createPricing('unit').id, 'unit');
  assert.equal(createPricing('cualquiera').id, 'unit');
});
