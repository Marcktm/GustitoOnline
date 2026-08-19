/**
 * app/config.js — Único lugar con datos del negocio. Módulo hoja: no importa nada.
 *
 * Nada de acá es lógica: son PARÁMETROS. Cambiar el WhatsApp, un horario, la URL
 * de la planilla o el canal del pedido no debería requerir tocar ningún otro
 * archivo. Si algo hay que cambiar seguido, su lugar es este archivo.
 */
export const CONFIG = {
  negocio: {
    nombre: 'Gustito a Salta',
    rubro: 'Empanadas salteñas',
    tagline: 'Cortadas a cuchillo, como en Salta.',
    whatsapp: '5493515598947',                 // formato wa.me: sin +, sin espacios
    whatsappLindo: '+54 9 351 559-8947',
    instagram: 'gustitoasaltaok',
    direccion: 'Francisco N. de Laprida 212 · Nueva Córdoba, Córdoba',
    mapsUrl: 'https://maps.app.goo.gl/KGU16rFzjwoBUN9Q8',
    locale: 'es-AR',
    moneda: 'ARS',
  },

  /**
   * Horarios de atención. Clave = día (0 domingo … 6 sábado), null = cerrado.
   * Horas decimales: 13.5 = 13:30. El estado "Abierto/Cerrado" y el horario del
   * pie de página se calculan solos desde acá.
   */
  horarios: {
    0: [[10, 13.5], [20, 23.5]],
    1: [[10, 13.5], [20, 23.5]],
    2: [[10, 13.5], [20, 23.5]],
    3: [[10, 13.5], [20, 23.5]],
    4: [[10, 13.5], [20, 23.5]],
    5: [[10, 13.5], [20, 23.5]],
    6: [[10, 13.5], [20, 23.5]],
  },

  /** Fuentes de datos (planillas de Google Sheets publicadas como CSV). */
  fuentes: {
    carta: {
      enabled: true,
      csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR-L_aO92kTMmF1SlLdoddJnrrGmXpat_Vk3HtuoHL0Ex4Y_XfdIB5jC48HIx1pv6nFxsqIeeTjIF3F/pub?output=csv',
    },
    estado: {
      enabled: true,
      csvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSdKXzzkXMW_QlRGz_TZ1z5QTQxISGo_BpwKGXFnaAZU_m8w8Npy91SVyrXkpP97cqaj-MnT95xhi6J/pub?output=csv',
    },
  },

  /**
   * Cómo leer la planilla de la carta. Agregar una categoría nueva (postres,
   * salsas, combos) es agregar un objeto acá — no se toca código.
   *
   * - `match`: valores de la columna "categoria" que caen en esta categoría.
   * - `pricing`: 'unit' (precio por unidad) | 'bundle' (precio por combo).
   * - `escalones`: filas de la planilla que NO son productos sino precios de combo.
   */
  mapeoCarta: {
    categorias: [
      {
        id: 'empanadas',
        label: 'Empanadas',
        tagline: 'Elegí los gustos: el precio se arma solo por docena, media o unidad.',
        match: ['comida', 'empanada', 'empanadas'],
        pricing: 'bundle',
        escalones: [
          { match: ['individual'], units: 1, label: 'Individual', plural: 'Individuales' },
          { match: ['media docena'], units: 6, label: 'Media Docena', plural: 'Medias Docenas' },
          { match: ['docena'], units: 12, label: 'Docena', plural: 'Docenas' },
        ],
        tiersPorDefecto: [
          { units: 1, price: 1200, label: 'Individual', plural: 'Individuales' },
          { units: 6, price: 6500, label: 'Media Docena', plural: 'Medias Docenas' },
          { units: 12, price: 12000, label: 'Docena', plural: 'Docenas' },
        ],
        atajos: [6, 12],   // botones rápidos +6 / +12
      },
      {
        id: 'bebidas',
        label: 'Bebidas',
        tagline: 'Para acompañar.',
        match: ['bebida', 'bebidas'],
        pricing: 'unit',
      },
    ],
  },

  /**
   * Salida del pedido.
   *   'whatsapp'  → abre WhatsApp con el detalle (hoy)
   *   'http'      → POST del pedido a la comandera (mañana)
   *   'ambos'     → los dos a la vez (transición)
   */
  pedido: {
    canal: 'whatsapp',
    http: { endpoint: '' },
    permitirFueraDeHorario: false,   // true = se puede pedir con el local cerrado
    persistir: true,                 // recordar el carrito si se recarga la página
  },
};
