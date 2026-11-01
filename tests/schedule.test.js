import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isOpenAt, nextOpening, formatHour, formatRanges, weeklySummary, todayLabel } from '../src/core/schedule.js';

// Horario del local: todos los días 10–13:30 y 20–23:30. Variante con el lunes cerrado.
const HORARIOS = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, [[10, 13.5], [20, 23.5]]]));
const LUNES_CERRADO = { ...HORARIOS, 1: null };

// 2026-11-02 es lunes. Fechas en hora local: el dominio usa getHours()/getDay().
const lunes = (h, m = 0) => new Date(2026, 10, 2, h, m);
const domingo = (h, m = 0) => new Date(2026, 10, 1, h, m);

test('isOpenAt: dentro y fuera de los tramos', () => {
  assert.equal(isOpenAt(HORARIOS, lunes(9, 59)), false);
  assert.equal(isOpenAt(HORARIOS, lunes(10)), true);
  assert.equal(isOpenAt(HORARIOS, lunes(13, 29)), true);
  assert.equal(isOpenAt(HORARIOS, lunes(13, 30)), false, 'el cierre es exclusivo');
  assert.equal(isOpenAt(HORARIOS, lunes(21)), true);
  assert.equal(isOpenAt(LUNES_CERRADO, lunes(21)), false);
});

test('nextOpening: más tarde hoy, mañana o salteando días cerrados', () => {
  assert.deepEqual(nextOpening(HORARIOS, lunes(8)), { dia: 'Lunes', hora: '10:00', esHoy: true });
  assert.deepEqual(nextOpening(HORARIOS, lunes(15)), { dia: 'Lunes', hora: '20:00', esHoy: true });
  assert.deepEqual(nextOpening(HORARIOS, lunes(23, 45)), { dia: 'Martes', hora: '10:00', esHoy: false });
  assert.deepEqual(nextOpening(LUNES_CERRADO, domingo(23, 45)), { dia: 'Martes', hora: '10:00', esHoy: false });
  assert.equal(nextOpening({}, lunes(8)), null);
});

test('formato de horas y tramos', () => {
  assert.equal(formatHour(13.5), '13:30');
  assert.equal(formatHour(9), '09:00');
  assert.equal(formatRanges([[10, 13.5], [20, 23.5]]), '10:00–13:30 · 20:00–23:30');
  assert.equal(formatRanges(null), 'Cerrado');
  assert.equal(todayLabel(LUNES_CERRADO, lunes(12)), 'Cerrado');
});

test('weeklySummary agrupa días consecutivos con el mismo horario', () => {
  assert.deepEqual(weeklySummary(HORARIOS), [{ days: 'Lunes a Domingo', hours: '10:00–13:30 · 20:00–23:30' }]);
  assert.deepEqual(weeklySummary(LUNES_CERRADO).map((b) => b.days), ['Lunes', 'Martes a Domingo']);
});
