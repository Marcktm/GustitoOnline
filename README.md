# Gustito a Salta — Carta digital

Carta digital de **Gustito a Salta** (Francisco N. de Laprida 212 · Nueva Córdoba).
Sitio estático **HTML + CSS + JavaScript (módulos ES)**, mobile-first, sin frameworks
ni paso de build: se sirve tal cual en GitHub Pages.

Es la **primera pieza** de un sistema de gestión gastronómico. La carta ya está
construida para enchufarse a una **comandera** y, más adelante, a una app de gestión
para el empleado (PC / tablet / celular) sin reescribir nada.

---

## Cómo correrlo

Los módulos ES necesitan HTTP (no sirve abrir el archivo con doble clic):

```bash
python3 -m http.server 8080     # o: npx serve .
# http://localhost:8080
```

Publicar = subir la carpeta a GitHub Pages / Netlify / Vercel.

---

## Arquitectura

Arquitectura por capas (*ports & adapters*). La regla es una sola:

> **Las dependencias apuntan siempre hacia `app`. Nada apunta de vuelta.**

```
src/
├── core/          DOMINIO PURO — sin DOM, sin red, sin config
│   ├── money.js       formatear y parsear importes
│   ├── text.js        normalizar, slugify, buscar
│   ├── schedule.js    horarios: abierto/cerrado, próxima apertura
│   ├── pricing.js     ★ estrategias de precio (unitario | por combo)
│   ├── quote.js       ★ cotización del pedido (función pura)
│   ├── menu.js        la carta como estructura de dominio
│   ├── cart.js        estado del pedido (store observable)
│   └── order.js       ★ CONTRATO del pedido (payload JSON versionado)
│
├── data/          ADAPTERS DE DATOS — de dónde salen la carta y el estado
│   ├── csv.js               parser CSV (comillas, comas, CRLF)
│   ├── driveImage.js        links de Drive → URL directa
│   ├── sheetMenuSource.js   ★ anti-corruption layer de la planilla
│   ├── sheetStatusSource.js estado del local (habilitada / mantenimiento)
│   ├── localMenu.js         carta de respaldo embebida
│   └── repositories.js      repositorios con degradación elegante
│
├── services/      SALIDA AL MUNDO
│   ├── orderGateway.js      ★ WhatsApp | HTTP (comandera) | ambos
│   └── storage.js           persistencia del carrito
│
├── ui/            RENDER — funciones puras: datos → HTML
│   ├── html.js, menuView.js, cartView.js, chromeView.js
│
└── app/           COMPOSICIÓN
    ├── config.js            todos los datos del negocio, cero lógica
    └── main.js              ★ composition root: arma todo y maneja eventos
```

### Grafo de dependencias

```
        core/*  (8 módulos hoja: money, text, schedule, pricing, quote, cart, order, menu)
          ▲            ▲            ▲
        data/*     services/*     ui/*
          ▲            ▲            ▲
          └────────  app/main.js  ──┘        ← única raíz
```

Nadie importa `app`. `core` no importa nada fuera de `core`. `ui` no conoce `data`,
y `data` no conoce `ui`. **No hay dependencias circulares** y el chequeo está automatizado:

```bash
node tools/check-arquitectura.mjs
```

Imprime el grafo completo y falla (exit 1) si aparece un ciclo o si una capa importa
algo que no le corresponde. Correlo antes de cada commit.

### Por qué así

| Decisión | Qué habilita |
|---|---|
| `core` puro, sin DOM ni red | Se testea con `node`, sin navegador. El backend de la comandera puede reusar `quote.js` y `order.js` tal cual. |
| Precios como **estrategia** (`pricing.js`) | Agregar promos, 2x1 o combos nuevos no toca el carrito, la UI ni el envío. |
| **Repositorios** con respaldo | Si la planilla se cae, la carta muestra la copia local en vez de romperse. |
| **Anti-corruption layer** en `sheetMenuSource` | El formato heredado de la planilla no contamina el dominio. Cambiar Sheets por una API = escribir otro *source*. |
| Un solo **gateway** de salida | Conectar la comandera es cambiar una línea de config. |
| Render por `data-act` + delegación | Cero `onclick` en el HTML; la UI no decide reglas de negocio. |

---

## Editar la carta (sin tocar código)

La carta sale de una planilla de Google Sheets publicada como CSV
(`Archivo → Compartir → Publicar en la web → CSV`), con estas columnas:

| producto | categoria | precio | stock | imagen |
|---|---|---|---|---|
| Docena | comida | 17.500,00 | SI | |
| Salteña de carne | comida | 1.800,00 | SI | https://… |
| Coca-Cola 500ml | bebida | 1.800,00 | NO | https://… |

- `stock` en `NO` deja el producto visible pero sin poder pedirse.
- Las filas **Individual / Media Docena / Docena** no son productos: son los
  **escalones de precio** de las empanadas. El sistema las detecta sola.
- Las columnas se buscan por nombre de encabezado; si se reordenan, sigue funcionando.
- `data/planilla-ejemplo.csv` es el formato de referencia.

Una segunda planilla controla el **modo mantenimiento** (`HABILITADA` / `MANTENIMIENTO`
en la primera celda, con un mensaje opcional en la segunda).

Ambas URLs están en `src/app/config.js → fuentes`.

### Entrega

El cliente elige **retiro en el local** o **envío a domicilio** en la hoja de pedido.
Para envío se piden nombre, teléfono y dirección (obligatorios) y una aclaración opcional;
el costo se coordina por WhatsApp según la zona. Los datos quedan guardados en el
navegador, así el cliente que vuelve no los reescribe.

Todo se declara en `src/app/config.js → entrega`. Agregar "comer en el local"
(el paso previo al QR en la mesa) es sumar una modalidad; pedir un dato nuevo es
sumar un campo. `core/delivery.js` valida y la pantalla se acomoda sola:

```js
{ id: 'salon', label: 'Comer en el local', icono: '🍽️' }
```

Si algún día el envío pasa a tener precio fijo, se agrega `costo` a la modalidad
y se suma como un cargo más: el contrato ya tiene el campo.

### Cambiar horarios, WhatsApp, categorías

Todo en `src/app/config.js`. Agregar una categoría nueva (postres, salsas, combos)
es agregar un objeto en `mapeoCarta.categorias` — no se escribe código:

```js
{
  id: 'postres', label: 'Postres', match: ['postre', 'postres'],
  pricing: 'unit',              // 'unit' = por unidad · 'bundle' = por combo
}
```

---

## Conectar la comandera

El pedido tiene **un único punto de salida**: `services/orderGateway.js`.
Antes de salir se arma el payload canónico de `core/order.js`:

```json
{
  "version": 2,
  "local": "Gustito a Salta",
  "moneda": "ARS",
  "canal": "carta-web",
  "creadoEn": "2026-08-18T22:30:00.000Z",
  "estado": "nuevo",
  "entrega": {
    "modalidad": "envio",
    "label": "Envío a domicilio",
    "direccion": "Laprida 212, 3º B",
    "costo": null,
    "costoACoordinar": true
  },
  "cliente": { "nombre": "Marcos Reyeros", "telefono": "3515598947", "nota": "Timbre B" },
  "contexto": {},
  "items":  [ { "id": "saltena-de-carne", "nombre": "Salteña de Carne", "categoria": "empanadas", "cantidad": 12 } ],
  "cargos": [ { "concepto": "Docena", "cantidad": 1, "precioUnitario": 28000, "importe": 28000 } ],
  "total": 28000
}
```

Tres bloques separados a propósito:

- **`items`** → lo que necesita la **cocina** (qué preparar).
- **`cargos`** → lo que necesita la **caja** (cómo se cobra). En empanadas no coinciden:
  7 de carne + 6 de pollo se cobran como *1 docena + 1 individual*.
- **`entrega` + `cliente`** → lo que necesita el **reparto** (a dónde y a nombre de quién).
  `costo: null` con `costoACoordinar: true` significa "el envío se cierra por WhatsApp":
  la comandera sabe que ese número todavía falta en vez de asumir cero.

Cuando exista el backend, el cambio es **una línea** en `src/app/config.js`:

```js
pedido: {
  canal: 'http',                                  // 'whatsapp' | 'http' | 'ambos'
  http: { endpoint: 'https://…/api/pedidos' },
}
```

`'ambos'` manda por WhatsApp **y** a la comandera a la vez: sirve para la transición,
sin apagar lo que hoy funciona. Ningún otro archivo se toca.

### Lo que sigue

1. **Comandera** — backend que recibe el POST y una pantalla de cocina que mueve el
   `estado` del pedido: `nuevo → en-cocina → listo → entregado`.
2. **App del empleado** (PC / tablet / celular) — reusa `core/` tal cual: la misma
   carta, el mismo motor de precios y el mismo carrito para cargar pedidos de mostrador.
   Solo cambia la UI y el `canal` del pedido (`'mostrador'`).
3. **QR en la mesa** — `contexto.mesa` ya está en el contrato; falta leerlo de la URL.

---

## Verificar

```bash
node tools/check-arquitectura.mjs    # ciclos + reglas de capas
python3 -m http.server 8080          # probar la carta
```

---

📧 [WhatsApp](https://wa.me/5493515598947) · [Instagram](https://www.instagram.com/gustitoasaltaok/)
