// Datos de productos
const empanadas = [
    { nombre: 'Salteña de Carne', precio: 1200 },
    { nombre: 'Salteña de Pollo', precio: 1200 },
    { nombre: 'Queso', precio: 1200 },
    { nombre: 'Jamón y Queso', precio: 1200 },
    { nombre: 'Espinaca y Queso Azul', precio: 1200 }
];

const bebidas = [
    { nombre: 'Coca-Cola', precio: 1500 },
    { nombre: 'Pepsi', precio: 1500 },
    { nombre: 'Sprite', precio: 1500 },
    { nombre: 'Salta', precio: 1500 },
    { nombre: 'Grolsch', precio: 2000 }
];

// Estado de cantidades y mensaje dinámico
let cantidadesEmpanadas = Array(empanadas.length).fill(0);
let cantidadesBebidas = Array(bebidas.length).fill(0);
let mensajePedido = ""; // Mensaje dinámico para WhatsApp

// Función para generar productos
function generarProductos() {
    const empanadasDiv = document.getElementById('empanadas');
    empanadas.forEach((empanada, index) => {
        const productDiv = document.createElement('div');
        productDiv.classList.add('product');
        productDiv.innerHTML = `
            <div class="product-details">
                <img src="img/${empanada.nombre.toLowerCase()}.jpg" alt="${empanada.nombre}">
                <span class="playwrite-au-tas-empanadas">${empanada.nombre}</span>
            </div>
            <div>
                <button onclick="cambiarCantidadEmpanada(${index}, 6)">+6</button>
                <button onclick="cambiarCantidadEmpanada(${index}, 12)">+12</button>
                <button onclick="cambiarCantidadEmpanada(${index}, -1)">-</button>
                <span id="cantidad-empanada-${index}">0</span>
                <button onclick="cambiarCantidadEmpanada(${index}, 1)">+</button>
            </div>
        `;
        empanadasDiv.appendChild(productDiv);
    });

    const bebidasDiv = document.getElementById('bebidas');
    bebidas.forEach((bebida, index) => {
        const productDiv = document.createElement('div');
        productDiv.classList.add('product');
        productDiv.innerHTML = `
            <div class="product-details">
                <img src="img/${bebida.nombre.toLowerCase()}.jpg" alt="${bebida.nombre}">
                <span class="caveat-bebidas">${bebida.nombre} - $${bebida.precio}</span>
            </div>
            <div>
                <button onclick="cambiarCantidadBebida(${index}, -1)">-</button>
                <span id="cantidad-bebida-${index}">0</span>
                <button onclick="cambiarCantidadBebida(${index}, 1)">+</button>
            </div>
        `;
        bebidasDiv.appendChild(productDiv);
    });
}

// Generar productos al cargar la página
generarProductos();

// Función para cambiar cantidad de empanadas
function cambiarCantidadEmpanada(index, cambio) {
    cantidadesEmpanadas[index] = Math.max(0, cantidadesEmpanadas[index] + cambio);
    document.getElementById(`cantidad-empanada-${index}`).innerText = cantidadesEmpanadas[index];
    actualizarDetalle();
}

// Función para cambiar cantidad de bebidas
function cambiarCantidadBebida(index, cambio) {
    cantidadesBebidas[index] = Math.max(0, cantidadesBebidas[index] + cambio);
    document.getElementById(`cantidad-bebida-${index}`).innerText = cantidadesBebidas[index];
    actualizarDetalle();
}

// Función para actualizar detalle y mensaje de pedido
function actualizarDetalle() {
    let desgloseHTML = '<div class="detalles">';
    let comanda = [];
    let bebidasSeleccionadas = [];
    let importes = [];
    let totalEmpanadas = 0;
    let totalBebidas = 0;

    // Detalle de empanadas
    empanadas.forEach((empanada, index) => {
        if (cantidadesEmpanadas[index] > 0) {
            comanda.push(`-${cantidadesEmpanadas[index]} ${empanada.nombre}`);
            desgloseHTML += `<p class="sangria">${cantidadesEmpanadas[index]} ${empanada.nombre}</p>`;
            totalEmpanadas += cantidadesEmpanadas[index] * empanada.precio;
        }
    });

    // Detalle de bebidas
    bebidas.forEach((bebida, index) => {
        if (cantidadesBebidas[index] > 0) {
            bebidasSeleccionadas.push(`-${cantidadesBebidas[index]} ${bebida.nombre}`);
            desgloseHTML += `<p class="sangria">${cantidadesBebidas[index]} ${bebida.nombre}</p>`;
            totalBebidas += cantidadesBebidas[index] * bebida.precio;
        }
    });

    // Calcular total con descuentos
    const cantidadTotalEmpanadas = cantidadesEmpanadas.reduce((a, b) => a + b, 0);
    let docenas = Math.floor(cantidadTotalEmpanadas / 12);
    let empanadasRestantes = cantidadTotalEmpanadas % 12;
    let mediasDocenas = Math.floor(empanadasRestantes / 6);
    empanadasRestantes %= 6;

    if (docenas > 0) importes.push(`${docenas} Docena${docenas > 1 ? 's' : ''} ----- $${(docenas * 12000).toLocaleString('es-AR')}`);
    if (mediasDocenas > 0) importes.push(`${mediasDocenas} Media Docena${mediasDocenas > 1 ? 's' : ''} ----- $${(mediasDocenas * 6500).toLocaleString('es-AR')}`);
    if (empanadasRestantes > 0) importes.push(`${empanadasRestantes} Individual${empanadasRestantes > 1 ? 'es' : ''} ----- $${(empanadasRestantes * 1200).toLocaleString('es-AR')}`);
    if (totalBebidas > 0) importes.push(`Bebidas ----- $${totalBebidas.toLocaleString('es-AR')}`);

    desgloseHTML += '</div><hr class="linea-separadora">';
    desgloseHTML += '<div class="precios">' + importes.map(linea => `<p class="sangria">${linea}</p>`).join('') + '</div>';

    document.getElementById('desglose').innerHTML = desgloseHTML;
    const total = totalEmpanadas + totalBebidas;
    document.getElementById('total').innerText = total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

    // Generar mensaje dinámico
    mensajePedido = `Hola, me gustaría realizar el siguiente pedido:

*COMANDA:*
${comanda.join('\n')}

*BEBIDAS:*
${bebidasSeleccionadas.join('\n')}

*IMPORTES:*
${importes.join('\n')}
\n-----------------------
*Total: $${total.toLocaleString('es-AR')}*`;
}

// Función para enviar pedido
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


// Función para mostrar/ocultar el menú
function toggleMenu() {
    const menuLinks = document.querySelector('.menu-links');
    menuLinks.classList.toggle('show');
}
