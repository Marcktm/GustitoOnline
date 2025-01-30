/****************************************
 * script.js
 ****************************************/

// CSV de estado de la página
// Debe terminar en ?output=csv para que sea CSV real (no pubhtml)
const CSV_ESTADO_PAGINA = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdKXzzkXMW_QlRGz_TZ1z5QTQxISGo_BpwKGXFnaAZU_m8w8Npy91SVyrXkpP97cqaj-MnT95xhi6J/pub?output=csv";

// CSV principal de productos
// También debe terminar en ?output=csv
const CSV_PRODUCTOS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR-L_aO92kTMmF1SlLdoddJnrrGmXpat_Vk3HtuoHL0Ex4Y_XfdIB5jC48HIx1pv6nFxsqIeeTjIF3F/pub?output=csv";

// Arrays donde guardamos info
let infoDescuentos = [];  // Individual, Media Docena, Docena
let empanadas = [];       // Categoria Comida
let bebidas = [];         // Categoria Bebida

// Estado de cantidades y mensaje dinámico
let cantidadesEmpanadas = [];
let cantidadesBebidas = [];
let mensajePedido = "";

// Al cargar el DOM, primero verificamos el estado de la página
document.addEventListener('DOMContentLoaded', async () => {
    await verificarEstadoPagina();
    // Después de eso, se setea el link activo del menú
    setActiveLink();
});

/**
 * 1) Verificar estado de la página (CSV_ESTADO_PAGINA)
 *    - Si "MANTENIMIENTO": mostramos mensaje y no cargamos nada más.
 *    - Si "HABILITADA": llamamos a cargarProductosDesdeCSV().
 */
async function verificarEstadoPagina() {
    try {
        const resp = await fetch(CSV_ESTADO_PAGINA);
        const texto = await resp.text();
        const lineas = texto.trim().split("\n");

        // Asumimos que lineas[1] tiene "HABILITADA" o "MANTENIMIENTO"
        const condicion = (lineas[1] || "").toUpperCase().trim();

        if (condicion === "MANTENIMIENTO") {
            mostrarPaginaMantenimiento();
        } else {
            // Asumimos "HABILITADA"
            cargarProductosDesdeCSV();
        }
    } catch (err) {
        console.error("Error al verificar estado de la página:", err);
        // Si falla, por defecto habilitamos
        cargarProductosDesdeCSV();
    }
}

/**
 * Mostrar mensaje de mantenimiento y vaciar container
 */
function mostrarPaginaMantenimiento() {
    const container = document.querySelector('.container');
    if (container) {
        container.innerHTML = `
            <h1 class="titulo-principal">Gustito a Salta</h1>
            <hr class="linea-divisoria">
            <h2 style="text-align:center; color:red; margin-top:30px;">
                Página en mantenimiento
            </h2>
        `;
    }
}

/**
 * 2) Cargar CSV de productos (CSV_PRODUCTOS)
 */
async function cargarProductosDesdeCSV() {
    try {
        const respuesta = await fetch(CSV_PRODUCTOS);
        const textoCSV = await respuesta.text();
        procesarCSV(textoCSV);

        // Después de cargar productos, verificar horario
        verificarHorario();
    } catch (error) {
        console.error("Error al cargar el CSV de productos:", error);
    }
}

/**
 * Lógica de horario:
 * - Se permite pedir sólo en 10:00-13:30 y 20:00-23:30
 * - Fuera de ese horario, se grisa todo y se deshabilita "Realizar Pedido".
 */
function verificarHorario() {
    const ahora = new Date();
    const hora = ahora.getHours();
    const minutos = ahora.getMinutes();

    // Funciones auxiliares
    function mayorOigual(h, m) {
        return (hora > h) || (hora === h && minutos >= m);
    }
    function menorOigual(h, m) {
        return (hora < h) || (hora === h && minutos <= m);
    }

    // Franja 1: 10:00 <= ahora <= 13:30
    const enFranja1 = (mayorOigual(10, 0) && menorOigual(13, 30));
    // Franja 2: 20:00 <= ahora <= 23:30
    const enFranja2 = (mayorOigual(20, 0) && menorOigual(23, 30));

    const enHorario = (enFranja1 || enFranja2);
    if (!enHorario) {
        alert("El local está cerrado. Puedes ver los productos, pero no realizar pedidos.");
        bloquearProductosPorHorario();
    }
}

/**
 * Bloquear productos (poner en gris y deshabilitar botones) por horario
 */
function bloquearProductosPorHorario() {
    // Se añade la clase .sin-stock a todos
    document.querySelectorAll('.product').forEach(prod => {
        prod.classList.add('sin-stock');
    });
    // Deshabilitamos todos los botones (+ / -)
    document.querySelectorAll('.product button').forEach(btn => {
        btn.disabled = true;
    });
    // Deshabilitamos el botón "Realizar Pedido"
    const btnPedido = document.getElementById('realizar-pedido');
    if (btnPedido) {
        btnPedido.disabled = true;
    }
}

/**
 * parseLineCSV:
 * Parsea una línea CSV respetando comillas.
 */
function parseLineCSV(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    // Ultimo fragmento
    result.push(current.trim());

    // Quitar comillas envolventes si existen
    for (let r = 0; r < result.length; r++) {
        const col = result[r];
        if (col.startsWith('"') && col.endsWith('"')) {
            result[r] = col.substring(1, col.length - 1);
        }
    }
    return result;
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
 * Procesar CSV de productos
 */
function procesarCSV(csvString) {
    const lineas = csvString.trim().split("\n");

    // Reiniciamos arrays
    infoDescuentos = [];
    empanadas = [];
    bebidas = [];

    // Comenzamos desde 1 para saltar encabezados
    for (let i = 1; i < lineas.length; i++) {
        const fila = parseLineCSV(lineas[i]);
        if (fila.length < 5) {
            console.warn("Línea CSV incompleta:", lineas[i]);
            continue;
        }
        const producto = fila[0].trim();
        const categoria = fila[1].trim();
        let precioStr = fila[2].trim().replace(/"/g, "");
        const stock = fila[3].trim().toUpperCase();
        const urlImg = fila[4] ? fila[4].trim() : "";

        // Convertir "1.500,00" -> "1500"
        precioStr = precioStr.replace(/\./g, "").replace(",", ".");
        const precioNum = parseFloat(precioStr);
        if (isNaN(precioNum)) {
            continue;
        }

        // Convertir link de Drive (si existe)
        const linkConvertido = convertirLinkDrive(urlImg);

        // Ver si es Individual, Media Docena, Docena
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

        // Clasificar en empanadas o bebidas
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

    // Inicializamos contadores
    cantidadesEmpanadas = Array(empanadas.length).fill(0);
    cantidadesBebidas = Array(bebidas.length).fill(0);

    // Generar UI
    generarPrecios();
    generarProductos();
    actualizarDetalle();
}

/**
 * Generar sección de Precios (Individual, Media Docena, Docena)
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
        if (item.nombreImg) {
            html += `<img src="${item.nombreImg}" alt="${item.nombre}" style="max-width:100px; display:block; margin:0 auto;">`;
        }
        itemDiv.innerHTML = html;
        contenedor.appendChild(itemDiv);
    });

    preciosDiv.appendChild(contenedor);
}

/**
 * Generar productos (Empanadas y Bebidas)
 */
function generarProductos() {
    // Empanadas
    const empanadasDiv = document.getElementById('empanadas');
    if (empanadasDiv) {
        empanadasDiv.innerHTML = "";
        empanadas.forEach((empanada, index) => {
            const sinStock = (empanada.stock === "NO");
            const productDiv = document.createElement('div');
            productDiv.classList.add('product');
            if (sinStock) {
                productDiv.classList.add('sin-stock');
            }
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
    }

    // Bebidas
    const bebidasDiv = document.getElementById('bebidas');
    if (bebidasDiv) {
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
 * Actualizar detalle y mensaje
 */
function actualizarDetalle() {
    let desgloseHTML = '<div class="detalles">';
    let comanda = [];
    let bebidasSeleccionadas = [];
    let importes = [];
    let totalEmpanadas = 0;
    let totalBebidas = 0;

    // Empanadas
    empanadas.forEach((emp, i) => {
        const cant = cantidadesEmpanadas[i];
        if (cant > 0) {
            comanda.push(`-${cant} ${emp.nombre}`);
            desgloseHTML += `<p class="sangria">${cant} ${emp.nombre}</p>`;
            totalEmpanadas += cant * emp.precio;
        }
    });

    // Bebidas
    bebidas.forEach((beb, i) => {
        const cant = cantidadesBebidas[i];
        if (cant > 0) {
            bebidasSeleccionadas.push(`-${cant} ${beb.nombre}`);
            desgloseHTML += `<p class="sangria">${cant} ${beb.nombre}</p>`;
            totalBebidas += cant * beb.precio;
        }
    });

    // Descuentos por docena
    const cantidadTotalEmpanadas = cantidadesEmpanadas.reduce((a, b) => a + b, 0);
    let docenas = Math.floor(cantidadTotalEmpanadas / 12);
    let empRest = cantidadTotalEmpanadas % 12;
    let mediasDoc = Math.floor(empRest / 6);
    empRest = empRest % 6;

    if (docenas > 0) {
        importes.push(`${docenas} Docena${docenas > 1 ? 's' : ''} ----- $${(docenas * 12000).toLocaleString('es-AR')}`);
    }
    if (mediasDoc > 0) {
        importes.push(`${mediasDoc} Media Docena${mediasDoc > 1 ? 's' : ''} ----- $${(mediasDoc * 6500).toLocaleString('es-AR')}`);
    }
    if (empRest > 0) {
        importes.push(`${empRest} Individual${empRest > 1 ? 'es' : ''} ----- $${(empRest * 1200).toLocaleString('es-AR')}`);
    }
    if (totalBebidas > 0) {
        importes.push(`Bebidas ----- $${totalBebidas.toLocaleString('es-AR')}`);
    }

    desgloseHTML += '</div><hr class="linea-separadora">';
    desgloseHTML += '<div class="precios">' + importes.map(l => `<p class="sangria">${l}</p>`).join('') + '</div>';

    document.getElementById('desglose').innerHTML = desgloseHTML;

    const total = totalEmpanadas + totalBebidas;
    document.getElementById('total').innerText = total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

    // Mensaje pedido
    mensajePedido = `Hola, me gustaría realizar el siguiente pedido:

*COMANDA:*
${comanda.join('\n')}

*BEBIDAS:*
${bebidasSeleccionadas.join('\n')}

*IMPORTES:*
${importes.join('\n')}

-----------------------
*Total: $${total.toLocaleString('es-AR')}*`;

    // Botón reset
    const resetearPedidoBtn = document.getElementById('resetear-pedido');
    if (cantidadTotalEmpanadas > 0 || totalBebidas > 0) {
        resetearPedidoBtn.style.display = 'inline-block';
    } else {
        resetearPedidoBtn.style.display = 'none';
    }
}

/**
 * Enviar pedido por WhatsApp
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
 * Toggle menú (móvil)
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
 * Confirmar reset
 */
function confirmarResetear() {
    const confirmacion = confirm("¿Seguro que desea eliminar la selección?");
    if (confirmacion) {
        resetearSeleccion();
    }
}

/**
 * Resetear cantidades
 */
function resetearSeleccion() {
    cantidadesEmpanadas.fill(0);
    cantidadesBebidas.fill(0);

    empanadas.forEach((_, i) => {
        const span = document.getElementById(`cantidad-empanada-${i}`);
        if (span) span.innerText = 0;
    });
    bebidas.forEach((_, i) => {
        const span = document.getElementById(`cantidad-bebida-${i}`);
        if (span) span.innerText = 0;
    });
    actualizarDetalle();
}
