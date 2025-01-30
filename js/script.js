/****************************************
 * script.js
 ****************************************/

// CSV de estado de la página
const CSV_ESTADO_PAGINA = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdKXzzkXMW_QlRGz_TZ1z5QTQxISGo_BpwKGXFnaAZU_m8w8Npy91SVyrXkpP97cqaj-MnT95xhi6J/pub?output=csv";

// CSV principal de productos
const CSV_PRODUCTOS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR-L_aO92kTMmF1SlLdoddJnrrGmXpat_Vk3HtuoHL0Ex4Y_XfdIB5jC48HIx1pv6nFxsqIeeTjIF3F/pub?output=csv";

// Arrays donde guardamos info
let infoDescuentos = [];  // Para "Individual", "Media Docena", "Docena"
let empanadas = [];       // Categoría Comida
let bebidas = [];         // Categoría Bebida

// Estado de cantidades y mensaje dinámico
let cantidadesEmpanadas = [];
let cantidadesBebidas = [];
let mensajePedido = "";

// Al cargar el DOM, verificamos el estado y luego cargamos productos
document.addEventListener('DOMContentLoaded', async () => {
    await verificarEstadoPagina();
    setActiveLink();
});

/** =======================
 * Sección: Modales Custom
   ========================*/
/**
 * Muestra un modal de alerta con fondo marrón y texto amarillo
 */
function customAlert(mensaje) {
    const alertModal = document.getElementById("custom-alert");
    const alertMsg   = document.getElementById("custom-alert-message");
    const alertOkBtn = document.getElementById("custom-alert-ok");

    alertMsg.textContent = mensaje;
    alertModal.classList.remove("hidden");

    function onOkClick() {
        alertModal.classList.add("hidden");
        alertOkBtn.removeEventListener("click", onOkClick);
    }
    alertOkBtn.addEventListener("click", onOkClick);
}

/**
 * Muestra un modal de confirm con Sí / No
 * callback(true) si Sí, callback(false) si No
 */
function customConfirm(mensaje, callback) {
    const confirmModal  = document.getElementById("custom-confirm");
    const confirmMsg    = document.getElementById("custom-confirm-message");
    const confirmYesBtn = document.getElementById("custom-confirm-yes");
    const confirmNoBtn  = document.getElementById("custom-confirm-no");

    confirmMsg.textContent = mensaje;
    confirmModal.classList.remove("hidden");

    function onYesClick() {
        confirmModal.classList.add("hidden");
        cleanup();
        callback(true);
    }
    function onNoClick() {
        confirmModal.classList.add("hidden");
        cleanup();
        callback(false);
    }
    function cleanup() {
        confirmYesBtn.removeEventListener("click", onYesClick);
        confirmNoBtn.removeEventListener("click", onNoClick);
    }

    confirmYesBtn.addEventListener("click", onYesClick);
    confirmNoBtn.addEventListener("click", onNoClick);
}

/** ===========================
 * 1) Verificar estado página
    ===========================*/
async function verificarEstadoPagina() {
    try {
        const resp = await fetch(CSV_ESTADO_PAGINA);
        const texto = await resp.text();
        const lineas = texto.trim().split("\n");
        const condicion = (lineas[1] || "").toUpperCase().trim();  // "HABILITADA" / "MANTENIMIENTO"

        if (condicion === "MANTENIMIENTO") {
            mostrarPaginaMantenimiento();
        } else {
            cargarProductosDesdeCSV();
        }
    } catch (err) {
        console.error("Error al verificar estado:", err);
        cargarProductosDesdeCSV();
    }
}

/**
 * Mostrar mensaje de mantenimiento
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

/** ==================================
 * 2) Cargar CSV productos
    ==================================*/
async function cargarProductosDesdeCSV() {
    try {
        const resp = await fetch(CSV_PRODUCTOS);
        const texto = await resp.text();
        procesarCSV(texto);
        verificarHorario();
    } catch (err) {
        console.error("Error al cargar CSV productos:", err);
    }
}

/**
 * 3) Verificar horario
 */
function verificarHorario() {
    const ahora = new Date();
    const hora = ahora.getHours();
    const minutos = ahora.getMinutes();

    function mayorOigual(h, m) {
        return (hora > h) || (hora === h && minutos >= m);
    }
    function menorOigual(h, m) {
        return (hora < h) || (hora === h && minutos <= m);
    }

    // 10:00 a 13:30
    const enFranja1 = mayorOigual(10, 0) && menorOigual(19, 59);
    // 20:00 a 23:30
    const enFranja2 = mayorOigual(20, 0) && menorOigual(23, 30);

    const enHorario = (enFranja1 || enFranja2);
    if (!enHorario) {
        customAlert("El local está cerrado. Puedes ver los productos, pero no realizar pedidos.");
        bloquearProductosPorHorario();
    }
}

/**
 * Bloquear productos por horario
 */
function bloquearProductosPorHorario() {
    document.querySelectorAll('.product').forEach(prod => {
        prod.classList.add('sin-stock');
    });
    // Deshabilitar botones
    document.querySelectorAll('.product button').forEach(btn => {
        btn.disabled = true;
    });
    // Deshabilitar "Realizar Pedido"
    const btnPedido = document.getElementById('realizar-pedido');
    if (btnPedido) {
        btnPedido.disabled = true;
    }
}

/** ===========================
 * parseLineCSV
    ===========================*/
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
    result.push(current.trim());

    for (let r = 0; r < result.length; r++) {
        const col = result[r];
        if (col.startsWith('"') && col.endsWith('"')) {
            result[r] = col.substring(1, col.length - 1);
        }
    }
    return result;
}

/**
 * Convierte link de Drive
 */
function convertirLinkDrive(linkOriginal) {
    if (!linkOriginal) return "";
    const regExp = /\/file\/d\/(.*?)\/view/;
    const match = linkOriginal.match(regExp);
    if (match && match[1]) {
        const fileId = match[1];
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    return linkOriginal;
}

/** =============================
 * 4) Procesar CSV principal
    =============================*/
function procesarCSV(csvString) {
    const lineas = csvString.trim().split("\n");
    infoDescuentos = [];
    empanadas = [];
    bebidas = [];

    for (let i = 1; i < lineas.length; i++) {
        const fila = parseLineCSV(lineas[i]);
        if (fila.length < 5) {
            console.warn("Línea CSV incompleta:", lineas[i]);
            continue;
        }

        const producto = fila[0].trim();
        const categoria = fila[1].trim();
        let precioStr   = fila[2].trim().replace(/"/g, "");
        const stock     = fila[3].trim().toUpperCase();
        const urlImg    = fila[4] ? fila[4].trim() : "";

        // "1.500,00" -> "1500"
        precioStr = precioStr.replace(/\./g, "").replace(",", ".");
        const precioNum = parseFloat(precioStr);
        if (isNaN(precioNum)) continue;

        // link drive
        const linkConvertido = convertirLinkDrive(urlImg);
        const prodLower = producto.toLowerCase();

        // "Individual", "Media Docena", "Docena"
        if (prodLower === "individual" || prodLower === "media docena" || prodLower === "docena") {
            infoDescuentos.push({
                nombre: producto,
                precio: precioNum,
                stock,
                nombreImg: linkConvertido
            });
            continue;
        }

        // Clasificar
        if (categoria.toLowerCase() === "comida") {
            empanadas.push({
                nombre: producto,
                precio: precioNum,
                stock,
                nombreImg: linkConvertido
            });
        } else if (categoria.toLowerCase() === "bebida") {
            bebidas.push({
                nombre: producto,
                precio: precioNum,
                stock,
                nombreImg: linkConvertido
            });
        }
    }

    cantidadesEmpanadas = Array(empanadas.length).fill(0);
    cantidadesBebidas = Array(bebidas.length).fill(0);

    generarPrecios();
    generarProductos();
    actualizarDetalle();
}

/** ===========================
 * Generar precios (doc/med/ind)
    ===========================*/
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

/** ===============================
 * Generar productos
    ===============================*/
function generarProductos() {
    // Empanadas
    const empanadasDiv = document.getElementById('empanadas');
    if (empanadasDiv) {
        empanadasDiv.innerHTML = "";
        empanadas.forEach((emp, i) => {
            const sinStock = (emp.stock === "NO");
            const productDiv = document.createElement('div');
            productDiv.classList.add('product');
            if (sinStock) {
                productDiv.classList.add('sin-stock');
            }

            const imgTag = emp.nombreImg ? `<img src="${emp.nombreImg}" alt="${emp.nombre}">` : "";

            productDiv.innerHTML = `
                <div class="product-details">
                    ${imgTag}
                    <span class="playwrite-au-tas-empanadas">${emp.nombre}</span>
                </div>
                <div>
                    <button ${sinStock ? 'disabled' : ''} onclick="cambiarCantidadEmpanada(${i}, 6)">+6</button>
                    <button ${sinStock ? 'disabled' : ''} onclick="cambiarCantidadEmpanada(${i}, 12)">+12</button>
                    <button ${sinStock ? 'disabled' : ''} onclick="cambiarCantidadEmpanada(${i}, -1)">-</button>
                    <span id="cantidad-empanada-${i}">0</span>
                    <button ${sinStock ? 'disabled' : ''} onclick="cambiarCantidadEmpanada(${i}, 1)">+</button>
                </div>
            `;
            empanadasDiv.appendChild(productDiv);
        });
    }

    // Bebidas
    const bebidasDiv = document.getElementById('bebidas');
    if (bebidasDiv) {
        bebidasDiv.innerHTML = "";
        bebidas.forEach((beb, i) => {
            const sinStock = (beb.stock === "NO");
            const productDiv = document.createElement('div');
            productDiv.classList.add('product');
            if (sinStock) {
                productDiv.classList.add('sin-stock');
            }

            const imgTag = beb.nombreImg ? `<img src="${beb.nombreImg}" alt="${beb.nombre}">` : "";

            productDiv.innerHTML = `
                <div class="product-details">
                    ${imgTag}
                    <span class="caveat-bebidas">${beb.nombre} - $${beb.precio}</span>
                </div>
                <div>
                    <button ${sinStock ? 'disabled' : ''} onclick="cambiarCantidadBebida(${i}, -1)">-</button>
                    <span id="cantidad-bebida-${i}">0</span>
                    <button ${sinStock ? 'disabled' : ''} onclick="cambiarCantidadBebida(${i}, 1)">+</button>
                </div>
            `;
            bebidasDiv.appendChild(productDiv);
        });
    }
}

/** ===============================
 * Cambiar Cantidades
    ===============================*/
function cambiarCantidadEmpanada(index, cambio) {
    cantidadesEmpanadas[index] = Math.max(0, cantidadesEmpanadas[index] + cambio);
    document.getElementById(`cantidad-empanada-${index}`).innerText = cantidadesEmpanadas[index];
    actualizarDetalle();
}
function cambiarCantidadBebida(index, cambio) {
    cantidadesBebidas[index] = Math.max(0, cantidadesBebidas[index] + cambio);
    document.getElementById(`cantidad-bebida-${index}`).innerText = cantidadesBebidas[index];
    actualizarDetalle();
}

/** ===============================
 * Helper precio doc/med/ind
    ===============================*/
function getPrecioDescuento(nombre) {
    const desc = infoDescuentos.find(item => item.nombre.toLowerCase() === nombre.toLowerCase());
    return desc ? desc.precio : 0;
}

/** ===============================
 * Actualizar detalle
    ===============================*/
function actualizarDetalle() {
    let desgloseHTML = '<div class="detalles">';
    let comanda = [];
    let bebidasSeleccionadas = [];
    let importes = [];

    // Bebidas
    let totalBebidas = 0;
    // Contamos empanadas sin sumarlas al total
    let cantidadTotalEmpanadas = 0;

    // 1) Listar empanadas
    empanadas.forEach((emp, i) => {
        const cant = cantidadesEmpanadas[i];
        if (cant > 0) {
            comanda.push(`-${cant} ${emp.nombre}`);
            desgloseHTML += `<p class="sangria">${cant} ${emp.nombre}</p>`;
            cantidadTotalEmpanadas += cant;
        }
    });

    // 2) Bebidas (sí sumamos precio)
    bebidas.forEach((beb, i) => {
        const cant = cantidadesBebidas[i];
        if (cant > 0) {
            bebidasSeleccionadas.push(`-${cant} ${beb.nombre}`);
            desgloseHTML += `<p class="sangria">${cant} ${beb.nombre}</p>`;
            totalBebidas += (cant * beb.precio);
        }
    });

    // 3) Precios “Individual”, “Media Docena”, “Docena”
    const precioIndividual = getPrecioDescuento("Individual") || 1200;
    const precioMediaDoc   = getPrecioDescuento("Media Docena") || 6500;
    const precioDocena     = getPrecioDescuento("Docena") || 12000;

    // 4) Calcular docenas, medias, sobrantes
    let docenas = Math.floor(cantidadTotalEmpanadas / 12);
    let empRest = cantidadTotalEmpanadas % 12;
    let mediasDoc = Math.floor(empRest / 6);
    empRest = empRest % 6;

    // 5) Construir importes
    if (docenas > 0) {
        importes.push(`${docenas} Docena${docenas>1?'s':''} ----- $${(docenas*precioDocena).toLocaleString('es-AR')}`);
    }
    if (mediasDoc > 0) {
        importes.push(`${mediasDoc} Media Docena${mediasDoc>1?'s':''} ----- $${(mediasDoc*precioMediaDoc).toLocaleString('es-AR')}`);
    }
    if (empRest > 0) {
        importes.push(`${empRest} Individual${empRest>1?'es':''} ----- $${(empRest*precioIndividual).toLocaleString('es-AR')}`);
    }
    if (totalBebidas > 0) {
        importes.push(`Bebidas ----- $${totalBebidas.toLocaleString('es-AR')}`);
    }

    // Cerrar detalles
    desgloseHTML += '</div><hr class="linea-separadora">';
    desgloseHTML += '<div class="precios">' 
        + importes.map(line => `<p class="sangria">${line}</p>`).join('') 
        + '</div>';

    document.getElementById('desglose').innerHTML = desgloseHTML;

    // 6) Sumar docena + media + individual + bebidas
    let totalEmpanadas = (docenas * precioDocena) 
                       + (mediasDoc * precioMediaDoc) 
                       + (empRest * precioIndividual);
    let total = totalEmpanadas + totalBebidas;

    // Mostramos total
    document.getElementById('total').innerText = total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

    // Armamos mensajePedido
    mensajePedido = `Hola, me gustaría realizar el siguiente pedido:

*COMANDA:*
${comanda.join('\n')}

*BEBIDAS:*
${bebidasSeleccionadas.join('\n')}

*IMPORTES:*
${importes.join('\n')}

-----------------------
*Total: $${total.toLocaleString('es-AR')}*`;

    // Mostrar/ocultar botón reset
    const resetearPedidoBtn = document.getElementById('resetear-pedido');
    if (cantidadTotalEmpanadas > 0 || totalBebidas > 0) {
        resetearPedidoBtn.style.display = 'inline-block';
    } else {
        resetearPedidoBtn.style.display = 'none';
    }
}

/**
 * Enviar pedido
 */
function enviarPedido() {
    const totalEmpanadasSel = cantidadesEmpanadas.reduce((a, b) => a + b, 0);
    const totalBebidasSel   = cantidadesBebidas.reduce((a, b) => a + b, 0);

    // Verificamos si hay algo
    if (totalEmpanadasSel === 0 && totalBebidasSel === 0) {
        customAlert("No has seleccionado ningún producto.");
        return;
    }

    customConfirm("¿Estás seguro de que deseas enviar este pedido?", (respuesta) => {
        if (!respuesta) {
            return;
        }
        const numeroWhatsApp = "5493515598947";
        const mensajeCodificado = encodeURIComponent(mensajePedido);
        window.open(`https://wa.me/${numeroWhatsApp}?text=${mensajeCodificado}`, '_blank');
    });
}

/** ===============================
 * Toggle menú (móvil)
    ===============================*/
function toggleMenu() {
    const menuLinks = document.querySelector('.menu-links');
    menuLinks.classList.toggle('show');
}

/** ===============================
 * Clase activa en menú
    ===============================*/
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

/** ===============================
 * Confirmar reset
    ===============================*/
function confirmarResetear() {
    customConfirm("¿Seguro que desea eliminar la selección?", (respuesta) => {
        if (respuesta) {
            resetearSeleccion();
        }
    });
}

/** ===============================
 * Resetear selección
    ===============================*/
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
