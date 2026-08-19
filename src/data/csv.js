/**
 * data/csv.js — Parser CSV. Módulo hoja de la capa data.
 *
 * Soporta comillas, comas y saltos de línea dentro de campos, y CRLF.
 * (El parser viejo se rompía con descripciones que tenían comas entre comillas.)
 */

/** CSV → matriz de strings. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => {
    pushField();
    if (row.some((c) => c.trim() !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
      continue;
    }

    if (c === '"') quoted = true;
    else if (c === ',') pushField();
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      pushRow();
    } else field += c;
  }

  if (field !== '' || row.length) pushRow();
  return rows;
}

/**
 * Localiza columnas por nombre de encabezado y, si no lo encuentra, por posición.
 * Que el local reordene columnas en la planilla no debe romper la carta.
 */
export function createColumnResolver(headerRow, normalize) {
  const header = (headerRow || []).map((h) => normalize(h));
  return (nombres, posicionPorDefecto) => {
    for (const nombre of [].concat(nombres)) {
      const i = header.indexOf(normalize(nombre));
      if (i > -1) return i;
    }
    return posicionPorDefecto;
  };
}
