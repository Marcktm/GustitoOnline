/****************************************
 * script.js
 * ======================================
 * Carga y gestiona los productos desde
 * un CSV publicado en Google Sheets,
 * mostrando también los precios fijos
 * (Individual, Media Docena, Docena).
 * 
 * Además, convierte automáticamente
 * los enlaces de Google Drive para
 * poder mostrar imágenes embebidas
 * y PARSEA correctamente el CSV que
 * contiene comas dentro de comillas.
 ****************************************/

// Arrays que se llenarán con los datos del CSV
let infoDescuentos = [];  // Para Individual, Media Docena, Docena
let empanadas = [];       // Para las empanadas (Comida)
let bebidas = [];         // Para las bebidas (Bebida)

// Estado de cantidades y mensaje dinámico
let cantidadesEmpanadas = [];
let cantidadesBebidas = [];
let mensajePedido = "";

// URL del CSV publicado en Google Sheets (ajústalo según tu caso)
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR-L_aO92kTMmF1SlLdoddJnrrGmXpat_Vk3HtuoHL0Ex4Y_XfdIB5jC48HIx1pv6nFxsqIeeTjIF3F/pub?output=csv";

// Al cargar la página...
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar el CSV
    cargarDatosDesdeCSV();
    // 2. Configurar el enlace activo del menú
    setActiveLink();
});

/**
 * Parsea una línea CSV respetando comillas.
 * Ej: parseLineCSV('Sprite 500ml,Bebida,"1.500,00",SI,https://drive...') 
 * --> [ "Sprite 500ml", "Bebida", "1.500,00", "SI", "https://drive..." ]
 */
function parseLineCSV(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Cambiamos el estado de "dentro de comillas"
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      // Si encontramos una coma y NO estamos dentro de comillas,
      // cortamos la columna actual
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  // Agregar el último fragmento
  result.push(current.trim());

  // Quitar comillas envolventes, si existen
  for (let r = 0; r < result.length; r++) {
    // Si una columna quedó con comillas al inicio y fin, se las sacamos
    // "texto" -> texto
    const col = result[r];
    if (col.startsWith('"') && col.endsWith('"')) {
      result[r] = col.substring(1, col.length - 1);
    }
  }

  return result;
}

/**
 * Carga y parsea el CSV desde Google Sheets
 */
async function cargarDatosDesdeCSV() {
    try {
        const respuesta = await fetch(CSV_URL);
        const textoCSV = await respuesta.text();
        procesarCSV(textoCSV);
    } catch (error) {
        console.error("Error al cargar el CSV:", error);
    }
}

/**
 * Convierte un link de Drive tipo:
 *  https://drive.google.com/file/d/FILE_ID/view?usp=sharing
 * en un link directo de imagen:
 *  https://drive.google.com/uc?export=view&id=FILE_ID
 */
function convertirLinkDrive(linkOriginal) {
    if (!linkOriginal) return ""; // Si no hay link, retorna vacío

    const regExp = /\/file\/d\/(.*?)\/view/;
    const match = linkOriginal.match(regExp);
    if (match && match[1]) {
        const fileId = match[1];
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    } else {
        // Si no matchea el patrón, devolvemos el link original
        return linkOriginal;
    }
}

/**
 * Procesa el texto del CSV, llenando:
 * - infoDescuentos: Individual, Media Docena, Docena
 * - empanadas: resto de la categoría Comida
 * - bebidas: categoría Bebida
 */
function procesarCSV(csvString) {
    const lineas = csvString.trim().split("\n");

    // Empezamos desde la línea 1 (evitando encabezados)
    for (let i = 1; i < lineas.length; i++) {
        // Usar la función robusta para parsear la línea
        const fila = parseLineCSV(lineas[i]);

        // Asegurarnos de que haya al menos 5 columnas
        if (fila.length < 5) {
            console.warn("Línea CSV incompleta o mal formateada:", lineas[i]);
            continue;
        }

        // 0 -> PRODUCTOS
        // 1 -> CATEGORIA
        // 2 -> PRECIOS
        // 3 -> STOCK
        // 4 -> URL IMG
        const producto = fila[0].trim();
        const categoria = fila[1].trim();
        let precioStr = fila[2].trim().replace(/"/g, "");
        const stock = fila[3].trim().toUpperCase(); 
        const urlImg = fila[4] ? fila[4].trim() : "";

        // Convertir "1.500,00" a 1500
        precioStr = precioStr.replace(/\./g, "").replace(",", ".");
        const precioNum = parseFloat(precioStr);
        if (isNaN(precioNum)) {
            // Si no se puede parsear el precio, salteamos
            continue;
        }

        // Convertimos el link de Drive (si está presente)
        const linkConvertido = convertirLinkDrive(urlImg);

        // Chequear si es "Individual", "Media Docena" o "Docena"
        const productoMinus = producto.toLowerCase();
        if (
            productoMinus === "individual" ||
            productoMinus === "media docena" ||
            productoMinus === "docena"
        ) {
            infoDescuentos.push({
                nombre: producto,
                precio: precioNum,
                stock: stock,
                nombreImg: linkConvertido
            });
            continue;
        }

        // Caso contrario, lo clasificamos por categoría
        if (categoria.toLowerCase() === "comida") {
            empanadas.push({
                nombre: producto,
                precio: precioNum,
                stock: stock,
                nombreImg: linkConvertido
            });
        } else if (categoria.toLowerCase() === "bebida") {
            bebidas.push({
                nombre: producto,
                precio: precioNum,
                stock: stock,
                nombreImg: linkConvertido
            });
        }
    }

    // Inicializamos cantidades
    cantidadesEmpanadas = Array(empanadas.length).fill(0);
    cantidadesBebidas = Array(bebidas.length).fill(0);

    // Generar secciones
    generarPrecios();
    generarProductos();
    actualizarDetalle();
}

/**
 * Genera en el DOM el bloque de "Precios" (Individual, Media Docena, Docena)
 */
function generarPrecios() {
    const preciosDiv = document.getElementById('precios-info');
    if (!preciosDiv) return;

    preciosDiv.innerHTML = "";
    const contenedor = document.createElement('div');
    contenedor.classList.add('precios-contenedor');

    infoDescuentos.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('precio-item');

        let html = `<p><strong>${item.nombre}</strong> - $${item.precio.toLocaleString('es-AR')}</p>`;
        
        // Si hay URL, mostramos la imagen
        if (item.nombreImg) {
            html += `<img src="${item.nombreImg}" alt="${item.nombre}" style="max-width:100px; display:block; margin:0 auto;">`;
        }

        itemDiv.innerHTML = html;
        contenedor.appendChild(itemDiv);
    });

    preciosDiv.appendChild(contenedor);
}

/**
 * Genera dinámicamente los productos (Empanadas y Bebidas)
 */
function generarProductos() {
    const empanadasDiv = document.getElementById('empanadas');
    empanadasDiv.innerHTML = "";

    empanadas.forEach((empanada, index) => {
        const sinStock = (empanada.stock === "NO");
        const productDiv = document.createElement('div');
        productDiv.classList.add('product');
        if (sinStock) {
            productDiv.classList.add('sin-stock');
        }

        // Si hay URL, la usamos; si no, nada
        const imgTag = empanada.nombreImg
            ? `<img src="${empanada.nombreImg}" alt="${empanada.nombre}">`
            : "";

        productDiv.innerHTML = `
            <div class="product-details">
                ${imgTag}
                <span class="playwrite-au-tas-empanadas">${empanada.nombre}</span>
            </div>
            <div>
                <button ${sinStock ? 'disabled' : ''} onclick="cambiarCantidadEmpanada(${index}, 6)">+6</button>
                <button ${sinStock ? 'disabled' : ''} onclick="cambiarCantidadEmpanada(${index}, 12)">+12</button>
                <button ${sinStock ? 'disabled' : ''} onclick="cambiarCantidadEmpanada(${index}, -1)">-</button>
                <span id="cantidad-empanada-${index}">0</span>
                <button ${sinStock ? 'disabled' : ''} onclick="cambiarCantidadEmpanada(${index}, 1)">+</button>
            </div>
        `;
        empanadasDiv.appendChild(productDiv);
    });

    const bebidasDiv = document.getElementById('bebidas');
    bebidasDiv.innerHTML = "";

    bebidas.forEach((bebida, index) => {
        const sinStock = (bebida.stock === "NO");
        const productDiv = document.createElement('div');
        productDiv.classList.add('product');
        if (sinStock) {
            productDiv.classList.add('sin-stock');
        }

        const imgTag = bebida.nombreImg
            ? `<img src="${bebida.nombreImg}" alt="${bebida.nombre}">`
            : "";

        productDiv.innerHTML = `
            <div class="product-details">
                ${imgTag}
                <span class="caveat-bebidas">${bebida.nombre} - $${bebida.precio}</span>
            </div>
            <div>
                <button ${sinStock ? 'disabled' : ''} onclick="cambiarCantidadBebida(${index}, -1)">-</button>
                <span id="cantidad-bebida-${index}">0</span>
                <button ${sinStock ? 'disabled' : ''} onclick="cambiarCantidadBebida(${index}, 1)">+</button>
            </div>
        `;
        bebidasDiv.appendChild(productDiv);
    });
}

/**
 * Cambiar cantidad de empanadas
 */
function cambiarCantidadEmpanada(index, cambio) {
    cantidadesEmpanadas[index] = Math.max(0, cantidadesEmpanadas[index] + cambio);
    document.getElementById(`cantidad-empanada-${index}`).innerText = cantidadesEmpanadas[index];
    actualizarDetalle();
}

/**
 * Cambiar cantidad de bebidas
 */
function cambiarCantidadBebida(index, cambio) {
    cantidadesBebidas[index] = Math.max(0, cantidadesBebidas[index] + cambio);
    document.getElementById(`cantidad-bebida-${index}`).innerText = cantidadesBebidas[index];
    actualizarDetalle();
}

/**
 * Actualiza el detalle (desglose) y el mensaje de pedido
 */
function actualizarDetalle() {
    let desgloseHTML = '<div class="detalles">';
    let comanda = [];
    let bebidasSeleccionadas = [];
    let importes = [];
    let totalEmpanadas = 0;
    let totalBebidas = 0;

    // Empanadas
    empanadas.forEach((empanada, index) => {
        const cant = cantidadesEmpanadas[index];
        if (cant > 0) {
            comanda.push(`-${cant} ${empanada.nombre}`);
            desgloseHTML += `<p class="sangria">${cant} ${empanada.nombre}</p>`;
            totalEmpanadas += cant * empanada.precio;
        }
    });

    // Bebidas
    bebidas.forEach((bebida, index) => {
        const cant = cantidadesBebidas[index];
        if (cant > 0) {
            bebidasSeleccionadas.push(`-${cant} ${bebida.nombre}`);
            desgloseHTML += `<p class="sangria">${cant} ${bebida.nombre}</p>`;
            totalBebidas += cant * bebida.precio;
        }
    });

    // Descuentos por docena
    const cantidadTotalEmpanadas = cantidadesEmpanadas.reduce((a, b) => a + b, 0);
    let docenas = Math.floor(cantidadTotalEmpanadas / 12);
    let empanadasRestantes = cantidadTotalEmpanadas % 12;
    let mediasDocenas = Math.floor(empanadasRestantes / 6);
    empanadasRestantes %= 6;

    if (docenas > 0) {
        importes.push(`${docenas} Docena${docenas > 1 ? 's' : ''} ----- $${(docenas * 12000).toLocaleString('es-AR')}`);
    }
    if (mediasDocenas > 0) {
        importes.push(`${mediasDocenas} Media Docena${mediasDocenas > 1 ? 's' : ''} ----- $${(mediasDocenas * 6500).toLocaleString('es-AR')}`);
    }
    if (empanadasRestantes > 0) {
        importes.push(`${empanadasRestantes} Individual${empanadasRestantes > 1 ? 'es' : ''} ----- $${(empanadasRestantes * 1200).toLocaleString('es-AR')}`);
    }
    if (totalBebidas > 0) {
        importes.push(`Bebidas ----- $${totalBebidas.toLocaleString('es-AR')}`);
    }

    desgloseHTML += '</div><hr class="linea-separadora">';
    desgloseHTML += '<div class="precios">' + importes.map(linea => `<p class="sangria">${linea}</p>`).join('') + '</div>';

    document.getElementById('desglose').innerHTML = desgloseHTML;
    const total = totalEmpanadas + totalBebidas;
    document.getElementById('total').innerText = total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

    // Mensaje de pedido
    mensajePedido = `Hola, me gustaría realizar el siguiente pedido:

*COMANDA:*
${comanda.join('\n')}

*BEBIDAS:*
${bebidasSeleccionadas.join('\n')}

*IMPORTES:*
${importes.join('\n')}

-----------------------
*Total: $${total.toLocaleString('es-AR')}*`;

    // Mostrar u ocultar botón de reset
    const resetearPedidoBtn = document.getElementById('resetear-pedido');
    if (cantidadTotalEmpanadas > 0 || totalBebidas > 0) {
        resetearPedidoBtn.style.display = 'inline-block';
    } else {
        resetearPedidoBtn.style.display = 'none';
    }
}

/**
 * Enviar pedido vía WhatsApp
 */
function enviarPedido() {
    if (mensajePedido.trim() === "") {
        alert("No has seleccionado ningún producto.");
        return;
    }
    if (!confirm("¿Estás seguro de que deseas enviar este pedido?")) {
        return;
    }
    const numeroWhatsApp = "5493515598947";
    const mensajeCodificado = encodeURIComponent(mensajePedido);
    window.open(`https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`, '_blank');
}

/**
 * Mostrar/ocultar el menú (versión móvil)
 */
function toggleMenu() {
    const menuLinks = document.querySelector('.menu-links');
    menuLinks.classList.toggle('show');
}

/**
 * Clase activa en el menú
 */
function setActiveLink() {
    const links = document.querySelectorAll('nav a');
    const currentPath = window.location.pathname;

    links.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
}

/**
 * Confirmar antes de resetear la selección
 */
function confirmarResetear() {
    const confirmacion = confirm("¿Seguro que desea eliminar la selección?");
    if (confirmacion) {
        resetearSeleccion();
    }
}

/**
 * Resetear las cantidades
 */
function resetearSeleccion() {
    cantidadesEmpanadas.fill(0);
    cantidadesBebidas.fill(0);

    // Actualizar visual
    empanadas.forEach((_, index) => {
        document.getElementById(`cantidad-empanada-${index}`).innerText = 0;
    });
    bebidas.forEach((_, index) => {
        document.getElementById(`cantidad-bebida-${index}`).innerText = 0;
    });

    actualizarDetalle();
}
