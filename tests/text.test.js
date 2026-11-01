import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, slugify, matches, soloDigitos } from '../src/core/text.js';

test('normalize: sin tildes ni mayúsculas', () => {
  assert.equal(normalize('  Jamón y Queso '), 'jamon y queso');
  assert.equal(normalize('SALTEÑA'), 'saltena');
  assert.equal(normalize(null), '');
});

test('slugify: ids estables', () => {
  assert.equal(slugify('Jamón y Queso'), 'jamon-y-queso');
  assert.equal(slugify('Coca-Cola 500ml'), 'coca-cola-500ml');
  assert.equal(slugify('  ¡Carne picante!  '), 'carne-picante');
});

test('matches: "jamon" encuentra "Jamón y queso"', () => {
  assert.ok(matches('Jamón y queso', 'jamon'));
  assert.ok(matches('Jamón y queso', 'QUESO'));
  assert.ok(!matches('Pollo', 'carne'));
  assert.ok(matches('Pollo', ''), 'consulta vacía no filtra');
});

test('soloDigitos', () => {
  assert.equal(soloDigitos('351 559-8947'), '3515598947');
  assert.equal(soloDigitos('+54 9 351'), '549351');
  assert.equal(soloDigitos(undefined), '');
});
