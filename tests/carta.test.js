// menu + quote + cart: de la carta y las cantidades al detalle cobrable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMenu, filterMenu, EMPTY_MENU } from '../src/core/menu.js';
import { quoteOrder } from '../src/core/quote.js';
import { createCart } from '../src/core/cart.js';
import { bundlePricing, unitPricing } from '../src/core/pricing.js';

const carta = () => createMenu([
  {
    id: 'empanadas', label: 'Empanadas',
    pricing: bundlePricing([
      { units: 1, price: 1200, label: 'Individual', plural: 'Individuales' },
      { units: 12, price: 12000, label: 'Docena', plural: 'Docenas' },
    ]),
    products: [
      { id: 'carne', name: 'Carne cortada a cuchillo' },
      { id: 'jamon-y-queso', name: 'Jamón y queso', available: false },
      { id: 'humita', name: 'Humita', desc: 'Choclo y queso' },
    ],
  },
  {
    id: 'bebidas', label: 'Bebidas', pricing: unitPricing(),
    products: [{ id: 'agua', name: 'Agua 500 ml', price: 1500 }],
  },
]);

const ids = (cats) => cats.flatMap((c) => c.products.map((p) => p.id));

test('menu: índice, orden y valores por defecto', () => {
  const m = carta();
  assert.equal(m.size, 4);
  assert.deepEqual(m.order, ['carne', 'jamon-y-queso', 'humita', 'agua']);
  assert.equal(m.get('carne').available, true);
  assert.equal(m.get('carne').categoryId, 'empanadas');
  assert.equal(m.get('jamon-y-queso').available, false);
  assert.equal(m.get('no-existe'), null);
  assert.ok(EMPTY_MENU.isEmpty());
});

test('filterMenu: búsqueda sin tildes, en nombre y descripción', () => {
  const m = carta();
  assert.deepEqual(ids(filterMenu(m, { query: 'jamon' })), ['jamon-y-queso']);
  assert.deepEqual(ids(filterMenu(m, { query: 'choclo' })), ['humita']);
  assert.deepEqual(filterMenu(m, { query: 'xyz' }), []);
});

test('filterMenu: la búsqueda ignora la pestaña activa', () => {
  const m = carta();
  assert.deepEqual(filterMenu(m, { categoryId: 'bebidas' }).map((c) => c.id), ['bebidas']);
  assert.deepEqual(filterMenu(m, { query: 'agua', categoryId: 'empanadas' }).map((c) => c.id), ['bebidas']);
});

test('quoteOrder: empanadas por combo + bebidas por unidad', () => {
  const q = quoteOrder(carta(), { carne: 7, humita: 6, agua: 2 });
  assert.equal(q.count, 15);
  assert.equal(q.total, 12000 + 1200 + 3000);
  assert.deepEqual(q.groups.map((g) => [g.id, g.subtotal]), [['empanadas', 13200], ['bebidas', 3000]]);
  assert.deepEqual(q.charges.map((c) => c.concepto), ['Docena', 'Individual', 'Agua 500 ml']);
});

test('quoteOrder: pedido vacío e ids desconocidos', () => {
  assert.deepEqual(quoteOrder(carta(), {}), { groups: [], lines: [], charges: [], total: 0, count: 0 });
  assert.equal(quoteOrder(carta(), { fantasma: 3 }).total, 0);
});

test('cart: suma, resta y nunca queda en negativo', () => {
  const c = createCart();
  c.add('carne', 6);
  c.add('carne');
  c.dec('carne', 2);
  assert.equal(c.qty('carne'), 5);
  c.dec('carne', 10);
  assert.equal(c.qty('carne'), 0);
  assert.ok(c.isEmpty());
});

test('cart: notifica cambios y se puede desuscribir', () => {
  const c = createCart();
  const vistos = [];
  const off = c.subscribe((items) => vistos.push(items));
  c.set('agua', 2);
  off();
  c.clear();
  assert.deepEqual(vistos, [{ agua: 2 }]);
});

test('cart: hydrate descarta lo inválido y lo que ya no está en la carta', () => {
  const m = carta();
  const c = createCart();
  c.hydrate({ carne: 3, agua: '2', borrado: 4, humita: -1, pollo: 'x' }, m.has);
  assert.deepEqual(c.get(), { carne: 3, agua: 2 });
  assert.equal(c.count(), 5);
});
