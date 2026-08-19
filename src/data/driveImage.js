/**
 * data/driveImage.js — Normaliza links de Google Drive a URL directa de imagen.
 * Detalle de infraestructura: vive en `data`, no ensucia el dominio ni la UI.
 */
const PATRONES = [
  /\/file\/d\/([a-zA-Z0-9_-]+)/,       // .../file/d/<id>/view
  /[?&]id=([a-zA-Z0-9_-]+)/,           // ...uc?id=<id>
];

export function toDirectImageUrl(link) {
  const url = String(link || '').trim();
  if (!url) return '';
  for (const patron of PATRONES) {
    const match = url.match(patron);
    if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w600`;
  }
  return url;
}
