/**
 * core/schedule.js — Horarios de atención. Módulo hoja: no importa nada.
 *
 * Recibe siempre la tabla de horarios por parámetro (inyección), así el dominio
 * no depende de la configuración concreta del local.
 *
 * Formato:  { 0..6: [[desde, hasta], ...] | null }   0 = domingo
 * Las horas son decimales: 13.5 = 13:30.
 */

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0]; // arranca en lunes

/** Tramos del día que corresponde a `date` (array vacío si está cerrado). */
export function rangesFor(horarios, date = new Date()) {
  return horarios?.[date.getDay()] ?? [];
}

/** ¿Está abierto en ese instante? */
export function isOpenAt(horarios, date = new Date()) {
  const hora = date.getHours() + date.getMinutes() / 60;
  return rangesFor(horarios, date).some(([desde, hasta]) => hora >= desde && hora < hasta);
}

/** Próxima apertura (mira hasta 7 días adelante). Devuelve null si nunca abre. */
export function nextOpening(horarios, date = new Date()) {
  const hora = date.getHours() + date.getMinutes() / 60;

  for (let offset = 0; offset < 8; offset++) {
    const day = new Date(date);
    day.setDate(date.getDate() + offset);
    for (const [desde] of rangesFor(horarios, day)) {
      if (offset > 0 || desde > hora) {
        return { dia: DIAS[day.getDay()], hora: formatHour(desde), esHoy: offset === 0 };
      }
    }
  }
  return null;
}

/** 13.5 → "13:30" */
export function formatHour(value) {
  const h = Math.floor(value);
  const m = Math.round((value - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** [[10,13.5],[20,23.5]] → "10:00–13:30 · 20:00–23:30" */
export function formatRanges(ranges) {
  if (!ranges || !ranges.length) return 'Cerrado';
  return ranges.map(([a, b]) => `${formatHour(a)}–${formatHour(b)}`).join(' · ');
}

/** Horario de hoy, listo para mostrar. */
export function todayLabel(horarios, date = new Date()) {
  return formatRanges(rangesFor(horarios, date));
}

/**
 * Resumen semanal agrupando días consecutivos con el mismo horario.
 * → [{ days: 'Lunes a Viernes', hours: '10:00–13:30 · 20:00–23:30' }, ...]
 * Se calcula, no se escribe a mano: cambiar CONFIG.horarios actualiza el footer solo.
 */
export function weeklySummary(horarios) {
  const bloques = [];

  for (const dia of ORDEN_SEMANA) {
    const hours = formatRanges(horarios?.[dia]);
    const ultimo = bloques[bloques.length - 1];
    if (ultimo && ultimo.hours === hours) ultimo.hasta = dia;
    else bloques.push({ desde: dia, hasta: dia, hours });
  }

  return bloques.map(({ desde, hasta, hours }) => ({
    days: desde === hasta ? DIAS[desde] : `${DIAS[desde]} a ${DIAS[hasta]}`,
    hours,
  }));
}
