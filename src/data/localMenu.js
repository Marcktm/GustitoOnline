/**
 * data/localMenu.js — Carta de respaldo embebida en el sitio.
 * Depende de: core/{menu,pricing}.
 *
 * Se usa cuando la planilla no responde (sin internet, Google caído, URL mal
 * pegada). Es la red de seguridad: la carta SIEMPRE muestra algo.
 * Mantener los precios acá razonablemente al día.
 */
import { createMenu } from '../core/menu.js';
import { bundlePricing, unitPricing } from '../core/pricing.js';

const ESCALONES_EMPANADAS = [
  { units: 1, price: 1200, label: 'Individual', plural: 'Individuales' },
  { units: 6, price: 6500, label: 'Media Docena', plural: 'Medias Docenas' },
  { units: 12, price: 12000, label: 'Docena', plural: 'Docenas' },
];

export function createLocalMenu() {
  return createMenu([
    {
      id: 'empanadas',
      label: 'Empanadas',
      tagline: 'Salteñas, cortadas a cuchillo y con repulgue a mano.',
      pricing: bundlePricing(ESCALONES_EMPANADAS),
      products: [
        { id: 'carne', name: 'Carne cortada a cuchillo' },
        { id: 'carne-picante', name: 'Carne picante' },
        { id: 'pollo', name: 'Pollo' },
        { id: 'jamon-y-queso', name: 'Jamón y queso' },
        { id: 'humita', name: 'Humita' },
        { id: 'queso-y-cebolla', name: 'Queso y cebolla' },
      ].map((p) => ({ ...p, price: 0 })),
    },
    {
      id: 'bebidas',
      label: 'Bebidas',
      tagline: 'Para acompañar.',
      pricing: unitPricing(),
      products: [
        { id: 'agua', name: 'Agua 500 ml', price: 1500 },
        { id: 'gaseosa', name: 'Gaseosa 500 ml', price: 2000 },
        { id: 'agua-saborizada', name: 'Agua saborizada', price: 2000 },
        { id: 'cerveza', name: 'Cerveza', price: 3000 },
      ],
    },
  ]);
}
