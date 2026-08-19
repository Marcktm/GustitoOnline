/**
 * core/delivery.js — Modalidad de entrega y datos del cliente. Módulo hoja.
 *
 * Qué modalidades existen, qué datos pide cada una y si el pedido está completo.
 * Todo se describe por configuración (app/config.js → entrega): agregar
 * "comer en el local" o pedir el teléfono no requiere tocar este archivo.
 *
 * Es dominio puro: valida, no dibuja. La UI solo muestra lo que esto decide.
 */
import { soloDigitos } from './text.js';

/** La modalidad elegida, o la primera como respaldo si llega un id raro. */
export function getModalidad(config, modalidadId) {
  return config.modalidades.find((m) => m.id === modalidadId) || config.modalidades[0];
}

/** Campos que corresponde mostrar para esa modalidad, en orden. */
export function camposVisibles(config, modalidadId) {
  return config.campos.filter((c) => c.mostrarEn.includes(modalidadId));
}

/** ¿Este campo es obligatorio en esta modalidad? */
export function esRequerido(campo, modalidadId) {
  return (campo.requeridoEn || []).includes(modalidadId);
}

/** Deja solo los campos que corresponden a la modalidad, sin espacios sobrantes. */
export function normalizarDatos(config, modalidadId, datos = {}) {
  const limpios = {};
  for (const campo of camposVisibles(config, modalidadId)) {
    const valor = String(datos[campo.id] ?? '').trim();
    if (valor) limpios[campo.id] = valor;
  }
  return limpios;
}

/**
 * ¿Se puede enviar el pedido con estos datos?
 * @returns {{ ok: boolean, errores: Object<string,string> }}
 */
export function validarEntrega(config, modalidadId, datos = {}) {
  const errores = {};

  for (const campo of camposVisibles(config, modalidadId)) {
    const valor = String(datos[campo.id] ?? '').trim();

    if (esRequerido(campo, modalidadId) && !valor) {
      errores[campo.id] = campo.mensajeFalta || 'Completá este dato';
      continue;
    }
    if (valor && campo.minimo && valor.length < campo.minimo) {
      errores[campo.id] = campo.mensajeCorto || 'Falta información';
      continue;
    }
    // Los teléfonos se validan por dígitos, no por largo: "351 559-8947"
    // tiene 12 caracteres pero 10 números.
    if (valor && campo.minDigitos && soloDigitos(valor).length < campo.minDigitos) {
      errores[campo.id] = campo.mensajeCorto || 'Revisá el número';
    }
  }

  return { ok: Object.keys(errores).length === 0, errores };
}

/**
 * Arma el bloque de entrega del pedido: la forma en que viaja al gateway
 * y a la comandera. `costo: null` + `costoACoordinar: true` significa
 * "el envío se cierra por WhatsApp", que es como trabaja hoy el local.
 */
export function buildEntrega(config, modalidadId, datos = {}) {
  const modalidad = getModalidad(config, modalidadId);
  const limpios = normalizarDatos(config, modalidad.id, datos);

  return {
    modalidad: modalidad.id,
    label: modalidad.label,
    detalle: modalidad.detalle || '',
    direccion: limpios.direccion || null,
    telefono: limpios.telefono ? soloDigitos(limpios.telefono) : null,   // normalizado para la comandera
    costo: modalidad.costo ?? null,
    costoACoordinar: Boolean(modalidad.costoACoordinar),
    datos: limpios,
  };
}
