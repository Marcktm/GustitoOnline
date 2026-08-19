/**
 * tools/check-arquitectura.mjs — Guardián de la arquitectura.
 *
 *   node tools/check-arquitectura.mjs
 *
 * Verifica dos cosas que a mano se pierden apenas el proyecto crece:
 *   1. NO hay dependencias circulares.
 *   2. Cada capa solo importa capas permitidas (las flechas van hacia `app`).
 *
 * Correrlo antes de cada commit. Si esto pasa, la arquitectura sigue en pie.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';

const RAIZ = resolve(new URL('..', import.meta.url).pathname);
const SRC = join(RAIZ, 'src');

/** Qué puede importar cada capa. `app` es la única raíz: puede importar todo. */
const REGLAS = {
  core:     ['core'],
  data:     ['core', 'data'],
  services: ['core', 'services'],
  ui:       ['core', 'ui'],
  app:      ['core', 'data', 'services', 'ui', 'app'],
};

const archivos = listar(SRC);
const grafo = new Map();
const violaciones = [];

for (const archivo of archivos) {
  const id = relative(SRC, archivo);
  const capa = id.split('/')[0];
  const deps = [];

  for (const spec of imports(readFileSync(archivo, 'utf8'))) {
    if (!spec.startsWith('.')) continue;                       // dependencia externa
    const destino = relative(SRC, resolve(dirname(archivo), spec));
    const capaDestino = destino.split('/')[0];
    deps.push(destino);

    if (!REGLAS[capa]?.includes(capaDestino)) {
      violaciones.push(`${id}  →  ${destino}   (la capa "${capa}" no puede importar "${capaDestino}")`);
    }
  }
  grafo.set(id, deps);
}

const ciclos = buscarCiclos(grafo);

console.log(`\nMódulos analizados: ${grafo.size}\n`);
for (const [id, deps] of [...grafo].sort()) {
  console.log(`  ${id.padEnd(30)} → ${deps.length ? deps.join(', ') : '—'}`);
}

console.log('');
if (ciclos.length) {
  console.log('✗ DEPENDENCIAS CIRCULARES:');
  ciclos.forEach((c) => console.log('   ' + c.join(' → ')));
} else {
  console.log('✓ Sin dependencias circulares');
}

if (violaciones.length) {
  console.log('✗ CAPAS VIOLADAS:');
  violaciones.forEach((v) => console.log('   ' + v));
} else {
  console.log('✓ Todas las importaciones respetan las capas');
}
console.log('');

process.exit(ciclos.length || violaciones.length ? 1 : 0);

/* ---------------------------------------------------------------- helpers */

function listar(dir) {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return listar(ruta);
    return ruta.endsWith('.js') ? [ruta] : [];
  });
}

function imports(codigo) {
  const sinComentarios = codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const regex = /(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  const encontrados = [];
  let m;
  while ((m = regex.exec(sinComentarios))) encontrados.push(m[1] || m[2]);
  return encontrados;
}

/** DFS con pila: devuelve todos los ciclos encontrados. */
function buscarCiclos(grafo) {
  const ciclos = [];
  const estado = new Map();   // 0 = sin visitar, 1 = en la pila, 2 = terminado

  const visitar = (nodo, pila) => {
    if (estado.get(nodo) === 1) {
      ciclos.push([...pila.slice(pila.indexOf(nodo)), nodo]);
      return;
    }
    if (estado.get(nodo) === 2) return;

    estado.set(nodo, 1);
    for (const dep of grafo.get(nodo) || []) visitar(dep, [...pila, dep]);
    estado.set(nodo, 2);
  };

  for (const nodo of grafo.keys()) visitar(nodo, [nodo]);
  return ciclos;
}
