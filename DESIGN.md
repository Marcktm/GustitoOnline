# DESIGN.md — Gustito a Salta · Carta digital

Este documento es la fuente de verdad del diseño. Todo PR que toque la interfaz
se revisa contra esto. Si algo no está acá y hace falta decidirlo, se decide,
se escribe acá y recién después se codea.

---

## 1. La idea en una frase

**Una carta de barrio bien hecha: se lee como el pizarrón de un local salteño,
se usa como la mejor app de delivery.**

No competimos con PedidosYa, Rappi o Pedix en cantidad de funciones. Les ganamos
en tres cosas que ellos no pueden tener porque sirven a miles de locales:

1. **Identidad.** Ellos son una grilla genérica con el logo del local pegado arriba.
   Nosotros somos *este* local: su letra, su color, su forma de hablar.
2. **Velocidad.** Abrir el link y tener la docena armada en menos de 20 segundos,
   sin registrarse, sin descargar nada, sin popups.
3. **Honestidad.** Sin "¡Oferta imperdible!", sin contadores falsos, sin comisión
   escondida. El precio que ves es el que pagás.

---

## 2. Que no parezca hecho por IA

Esta es la regla más importante y la más fácil de romper. Las interfaces generadas
se reconocen por un puñado de tics. **Están prohibidos:**

| No | Por qué | En su lugar |
|---|---|---|
| Degradés violeta/azul, fondos con "glow", glassmorphism | Es la firma visual de una plantilla | Colores planos sacados del logo y del local |
| Emojis como íconos (🔥 🛵 ✨ 🍽️) | Se ven baratos y cambian según el teléfono | Íconos SVG propios de trazo, o directamente texto |
| Todo en tarjetas redondeadas con sombra difusa | Uniformidad de plantilla | Listas con filetes finos, como una carta impresa. Tarjeta solo donde agrupa algo de verdad |
| Inter / Poppins / Montserrat para todo | Son los defaults de todo generador | La tipografía de la sección 4 |
| Copys de marketing ("Descubrí una experiencia única de sabor") | Nadie habla así | Cómo lo diría el que atiende el mostrador |
| Mayúsculas en todos los botones, signos de exclamación por todos lados | Gritan | Oración normal, punto o nada |
| Ilustraciones 3D, fotos de stock, imágenes generadas | Mienten sobre el producto | Fotos reales del local o nada (ver 7) |
| Animaciones de entrada en cada elemento al scrollear | Ruido | Movimiento solo cuando responde a algo que hizo el usuario |
| Simetría perfecta y espaciado idéntico en todo | Se siente sintético | Jerarquía clara: cosas importantes grandes, detalles chicos y apretados |

**Lo que sí da sensación "hecho por una persona":** detalles específicos del lugar
(el repulgue del logo, "cortadas a cuchillo", la dirección en Laprida), irregularidad
controlada (la letra a mano del logo contra una tipografía sobria), textos con voseo
y con nombres reales de las cosas, y decisiones que solo tiene sentido tomar para
*este* negocio (los atajos +6 / +12 porque la gente pide por docena).

---

## 3. Color

Salen del logo (ocre del círculo, marrón de la letra) y del local (papel de horno,
adobe). Nada de colores "de sistema".

```css
:root {
  /* Base */
  --papel:       #faf4e8;   /* fondo general: papel de horno */
  --papel-alto:  #fffdf8;   /* superficies elevadas: hoja de pedido, inputs */
  --tinta:       #3a1a0e;   /* texto principal: el marrón de la letra del logo */
  --tinta-2:     #6e5546;   /* texto secundario. Contraste ≥ 4.5:1 sobre --papel */
  --filete:      rgba(58, 26, 14, .14);  /* líneas divisorias */

  /* Marca */
  --ocre:        #f2b134;   /* el círculo del logo. SOLO como fondo, nunca texto sobre papel */
  --ocre-suave:  #fbe6b4;   /* fondos de resalte: producto en el pedido, escalón activo */
  --terracota:   #b03a1c;   /* acción principal: botón Pedir, +, links */
  --terracota-2: #8e2d14;   /* hover / pressed */

  /* Estado */
  --abierto:     #3f6b4a;   /* verde cerro: "Abierto" */
  --cerrado:     #8e2d14;   /* = terracota-2 */
}
```

Reglas:
- **Una sola acción en terracota por pantalla.** En la carta es el `+`; con la hoja
  abierta, es "Enviar pedido".
- Texto sobre `--ocre` siempre en `--tinta` (nunca blanco).
- **Modo oscuro: no por ahora.** Una carta de comida se ve mejor en papel y la marca
  es cálida. Se agrega solo si se diseña de verdad, no invirtiendo colores.
- Contraste mínimo AA (4.5:1 texto, 3:1 íconos y bordes de controles). Se verifica en el PR.

---

## 4. Tipografía

**Alegreya + Alegreya Sans**, de Huerta Tipográfica (Argentina). Tienen calidez
de libro sin ser decorativas, aguantan bien en tamaños chicos de celular, y
—detalle que importa— son diseño argentino.

| Uso | Familia | Peso | Tamaño (móvil → escritorio) |
|---|---|---|---|
| Nombre del local | **Imagen del logo** (`img/logo-nombre.png`) | — | 260–320 px de ancho |
| Título de categoría | Alegreya | 800 | 26 → 30 px |
| Nombre de producto | Alegreya Sans | 700 | 17 px |
| Precio | Alegreya Sans, `font-variant-numeric: tabular-nums` | 700 | 17 px |
| Texto, descripciones | Alegreya Sans | 400 | 15–16 px |
| Etiquetas chicas (eyebrow, "Sin stock") | Alegreya Sans, versalitas o `letter-spacing: .08em` | 500 | 12–13 px |
| Total del pedido | Alegreya | 800 | 26 px |

```css
--fuente-titulo: 'Alegreya', Georgia, serif;
--fuente-texto:  'Alegreya Sans', system-ui, sans-serif;
```

- Se cargan desde Google Fonts con `display=swap` y **solo los pesos de la tabla**.
- Los precios siempre con `tabular-nums` para que las columnas no bailen.
- Nunca más de 3 tamaños distintos en una misma vista.
- El nombre del local **nunca** se escribe en una fuente que imite la letra a mano:
  es la imagen del logo o es Alegreya. Una imitación queda peor que cualquiera de las dos.

---

## 5. Espacio, forma y profundidad

- Escala de espacio: **4 · 8 · 12 · 16 · 24 · 32 · 48**. Nada fuera de la escala.
- Gutter lateral en móvil: 16 px. Ancho máximo de la carta: 680 px.
- Radios: **6 px** controles chicos, **12 px** hoja de pedido y fotos, **999 px** solo
  en pastillas (pestañas, estado abierto/cerrado). No todo redondeado igual.
- Sombra: **una sola**, para lo que flota (barra de pedido y hoja). La carta es plana;
  los productos se separan con filetes, no con sombras.
- Áreas táctiles: mínimo **44 × 44 px**, aunque el ícono sea más chico.

---

## 6. Componentes

### 6.1 Encabezado
- Eyebrow "EMPANADAS SALTEÑAS" (terracota, 12 px, espaciado) → logo → bajada
  "Cortadas a cuchillo, como en Salta." → pastilla de estado.
- Estado: `● Abierto · cierra 23:30` en verde cerro, o `Cerrado · abre hoy 20:00`.
  Siempre con la próxima hora, nunca solo "Cerrado".
- Altura total en móvil: que la primera categoría asome sin scrollear (≤ 45% del alto).

### 6.2 Barra de búsqueda y pestañas (sticky)
- Se pega arriba al scrollear, fondo `--papel` con filete inferior (sin sombra, sin blur).
- La pestaña activa sigue al scroll (scroll-spy). Tocar una pestaña lleva a la
  sección con desplazamiento suave (respetando `prefers-reduced-motion`).
- La búsqueda ignora tildes y mayúsculas ("jamon" encuentra "Jamón y queso").

### 6.3 Escalones de precio (empanadas)
- Tres columnas: Individual · Media docena · Docena, con precio debajo.
- El escalón que aplica al pedido actual se resalta con `--ocre-suave`.
  Debajo, una línea que ayude a decidir: *"Te faltan 2 para la docena (ahorrás $X)"*.
  Esto es lo que ninguna app genérica hace y lo que más vende.

### 6.4 Producto
- **Fila, no tarjeta.** Foto cuadrada 72 px a la izquierda (si hay), nombre y
  descripción al centro, precio y control a la derecha. Filete entre filas.
- Sin foto: no se pone un placeholder gris. La fila se reacomoda sin hueco.
- Sin stock: nombre en `--tinta-2`, etiqueta "Sin stock por hoy", sin control.
  No se oculta (la gente lo busca) ni se tacha.
- Con cantidad > 0: fondo `--ocre-suave` en toda la fila y la cantidad visible.

### 6.5 Control de cantidad
- Cerrado: un botón `+` terracota de 36 px (área táctil 44). En empanadas, atajos
  `+6` y `+12` en estilo secundario (borde, sin relleno) antes del `+`.
- Abierto: `−  3  +`. El número con `tabular-nums` y ancho fijo para que no salte.
- Respuesta inmediata: el número cambia en el mismo frame. Sin spinner.

### 6.6 Barra de pedido
- Aparece desde abajo al agregar el primer producto. Una sola línea:
  `Ver pedido · 13 empanadas` ……… `$28.000`.
- Ocupa todo el ancho, terracota, texto `--papel-alto`. Es la acción principal.

### 6.7 Hoja de pedido
- Hoja desde abajo en móvil, panel lateral derecho en escritorio (≥ 1000 px).
- Orden: lo que pediste (cocina) → cómo se cobra (caja: "1 docena + 1 individual")
  → entrega → datos → total → **Enviar pedido por WhatsApp**.
- Es un `dialog` de verdad: foco atrapado, Escape cierra, el foco vuelve al botón
  que la abrió.
- Errores de formulario al lado del campo, en el idioma del cliente:
  "Falta la dirección", no "Campo requerido".

### 6.8 Estados que tienen que estar diseñados (no "lo que salga")
| Estado | Qué se ve |
|---|---|
| Cargando la carta | Esqueleto con la forma de las filas reales, sin brillo animado agresivo |
| Planilla caída | La carta de respaldo + aviso discreto arriba: "Puede que algún precio no esté actualizado" |
| Búsqueda sin resultados | "No encontramos «xxx». Probá con *carne*, *pollo* o *humita*." |
| Local cerrado | Se puede ver la carta. El botón dice "Dejar pedido para cuando abramos" o se deshabilita con la hora de apertura (decisión de negocio, ver Issues) |
| Mantenimiento | Pantalla completa con el logo, el mensaje de la planilla y WhatsApp |
| Pedido enviado | Confirmación breve con resumen y "Volver a la carta". El carrito se vacía |

---

## 7. Imágenes

- **Solo fotos reales** del producto o del local. Una buena foto con el teléfono,
  con luz de día y fondo de la mesada, vale más que cualquier foto de stock.
- Recorte cuadrado, producto centrado, sin texto encima.
- Si no hay foto de un producto, no se inventa: se muestra sin foto.
- Siempre con `width`/`height` o `aspect-ratio` (sin saltos de layout),
  `loading="lazy"` y `decoding="async"`.

---

## 8. Movimiento

- Duraciones: 120 ms (respuesta a toque), 220 ms (hoja que sube/baja). Curva
  `cubic-bezier(.2, .8, .2, 1)`.
- Solo se anima lo que el usuario provocó: abrir la hoja, aparecer la barra de pedido,
  el `+` que se convierte en contador.
- Con `prefers-reduced-motion: reduce` todo pasa sin animación.

---

## 9. Voz y textos

- **Voseo rioplatense**, tono de mostrador: amable, corto, concreto.
- Verbos claros en los botones: "Agregar", "Ver pedido", "Enviar pedido".
- Números como se dicen: "1 docena + 1", no "Cantidad: 13 u.".
- Precios en formato argentino: `$12.000` (sin decimales si son ,00).
- Prohibido: "¡Ups!", "Algo salió mal :(", "experiencia", "delicioso",
  "irresistible", "descubrí".

| ❌ | ✅ |
|---|---|
| ¡Ups! Ocurrió un error inesperado. | No pudimos cargar la carta. Te mostramos la última que tenemos. |
| Agregar al carrito | Agregar |
| Finalizar compra | Enviar pedido por WhatsApp |
| Campo obligatorio | Falta tu teléfono |

---

## 10. Accesibilidad (no negociable)

- Navegable entero con teclado; foco visible (anillo de 2 px en `--terracota`
  con 2 px de separación).
- Pestañas con `role="tablist"`/`tab`, hoja de pedido como `dialog` modal.
- Todo botón de ícono tiene `aria-label` ("Agregar Salteña de carne", no "+").
- Cambios de cantidad y total anunciados con `aria-live="polite"`.
- Zoom del navegador al 200% sin romper el layout.
- Lighthouse Accesibilidad ≥ 95.

---

## 11. Rendimiento

La carta se abre desde un link de WhatsApp o Instagram, con datos móviles.

- **Sin frameworks ni build.** HTML + CSS + módulos ES, como está hoy.
- Presupuesto: < 100 KB de JS+CSS sin comprimir (sin contar fuentes e imágenes).
- Largest Contentful Paint < 2 s en 4G simulado. Lighthouse Rendimiento ≥ 90.
- La carta de respaldo se muestra al instante mientras llega la planilla.
- Imágenes de Drive con el tamaño pedido (no la original de 4000 px).

---

## 12. Código y estructura (lo que mantiene "impecable la librería")

- La arquitectura por capas del README es ley: `node tools/check-arquitectura.mjs`
  tiene que pasar en cada PR.
- `core/` es puro y **tiene tests** (`node --test`). Todo cambio en `core/` trae su test.
- La UI son funciones puras `datos → HTML`. Nada de estado escondido en el DOM.
- CSS: un archivo por componente en `css/`, todos los valores salen de los tokens
  de la sección 3–5. **Ningún color, tamaño de letra o espaciado escrito a mano**
  fuera de `css/tokens.css`.
- Clases BEM en español, como hoy (`product__name`, `sheet__total`).
- Sin `!important` salvo el de `[hidden]`.

---

## 13. Cómo trabajamos (agentes y PRs)

Trabajan tres agentes en paralelo: **Claude** (coordina y revisa), **Codex** y **Grok**.

1. Cada tarea es un issue con su etiqueta `agente:claude`, `agente:codex` o `agente:grok`.
2. Cada agente trabaja en su propia rama, creada desde `develop`:
   `feat/<número-de-issue>-<descripción-corta>`.
3. El PR va contra `develop`, con `Closes #<n>` y una captura de pantalla
   móvil (390 px) antes/después si toca la interfaz.
4. **Claude revisa todos los PRs** contra este documento antes del merge.
   Checklist de revisión:
   - [ ] `node tools/check-arquitectura.mjs` pasa
   - [ ] `node --test` pasa
   - [ ] Sin colores/tamaños fuera de los tokens
   - [ ] Ningún punto de la tabla "Que no parezca hecho por IA"
   - [ ] Funciona a 360 px y a 1280 px
   - [ ] Teclado y lector de pantalla OK en lo que tocó
   - [ ] Textos con la voz de la sección 9
5. Un PR toca **un** issue. Si aparece otra cosa, se abre otro issue.
