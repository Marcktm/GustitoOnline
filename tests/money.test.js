import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMoney, parseAmount } from '../src/core/money.js';

test('formatMoney: formato argentino sin decimales', () => {
  assert.equal(formatMoney(12000), '$12.000');
  assert.equal(formatMoney(1999.6), '$2.000');
  assert.equal(formatMoney(0), '$0');
  assert.equal(formatMoney('basura'), '$0');
});

test('parseAmount: lo que escribe una persona en la planilla', () => {
  assert.equal(parseAmount('1.500,00'), 1500);
  assert.equal(parseAmount('17.500,00'), 17500);
  assert.equal(parseAmount('1500'), 1500);
  assert.equal(parseAmount('$ 1.500'), 1500);
  assert.equal(parseAmount('1500.50'), 1500.5);
  assert.equal(parseAmount('12,5'), 12.5);
  assert.equal(parseAmount(800), 800);
});

test('parseAmount: sin número devuelve NaN', () => {
  assert.ok(Number.isNaN(parseAmount('')));
  assert.ok(Number.isNaN(parseAmount('consultar')));
  assert.ok(Number.isNaN(parseAmount(null)));
  assert.ok(Number.isNaN(parseAmount(Infinity)));
});
