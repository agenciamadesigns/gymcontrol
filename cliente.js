document.addEventListener("DOMContentLoaded", cargarCliente);

async function cargarCliente() {
  const params = new URLSearchParams(window.location.search);
  let token = params.get("token");

  if (token) {
    localStorage.setItem("cliente_token", token);
  } else {
    token = localStorage.getItem("cliente_token");
  }

  const estadoCliente = document.getElementById("estadoCliente");
  const qrCanvas = document.getElementById("qrCliente");
  const accionesCliente = document.getElementById("accionesCliente");

  qrCanvas.style.display = "none";
  accionesCliente.innerHTML = "";

  if (!token) {
    estadoCliente.innerHTML = `
      <div class="cliente-error">
        <h2>Link no válido</h2>
        <p>No se encontró una credencial activa.</p>
      </div>
    `;
    return;
  }

  const { data: cliente, error } = await supabaseClient
    .from("clientes")
    .select("*")
    .eq("qr_token", token)
    .single();

  if (error || !cliente) {
    estadoCliente.innerHTML = `
      <div class="cliente-error">
        <h2>Cliente no encontrado</h2>
        <p>Consulta tu acceso con recepción.</p>
      </div>
    `;
    return;
  }

  const hoy = new Date();
  const hoyTexto = hoy.toISOString().split("T")[0];

  const inicio = new Date(cliente.fecha_inicio + "T00:00:00");
  const vencimiento = new Date(cliente.fecha_vencimiento + "T00:00:00");

  const vencido = cliente.fecha_vencimiento < hoyTexto;
  const activo = cliente.estado === "Activo" && !vencido;

  const diasRestantes = Math.ceil(
    (vencimiento - new Date(hoyTexto + "T00:00:00")) / (1000 * 60 * 60 * 24)
  );

  const totalDias = Math.max(
    Math.ceil((vencimiento - inicio) / (1000 * 60 * 60 * 24)),
    1
  );

  const diasUsados = Math.max(totalDias - diasRestantes, 0);
  const progreso = Math.min(Math.max((diasUsados / totalDias) * 100, 0), 100);

  const foto = cliente.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(cliente.nombre)}&background=eef2ff&color=3730a3`;

  let textoDias = "";

  if (activo) {
    if (diasRestantes === 0) {
      textoDias = "Tu membresía vence hoy";
    } else if (diasRestantes === 1) {
      textoDias = "Falta 1 día para tu pago";
    } else {
      textoDias = `Te quedan ${diasRestantes} días`;
    }
  } else {
    textoDias = "Membresía vencida";
  }

  estadoCliente.innerHTML = `
    <div class="cliente-foto-wrap">
      <img src="${foto}" class="cliente-app-foto">
    </div>

    <h1>${cliente.nombre}</h1>

    <div class="${activo ? 'estado-app activo-app' : 'estado-app vencido-app'}">
      ${activo ? 'Membresía activa' : 'Membresía vencida'}
    </div>

    <div class="cliente-info-premium">
      <div>
        <span>Membresía</span>
        <strong>${cliente.tipo_membresia || "No definida"}</strong>
      </div>

      <div>
        <span>Vence</span>
        <strong>${cliente.fecha_vencimiento}</strong>
      </div>
    </div>

    <div class="dias-card ${activo ? "" : "dias-vencido"}">
      <span>${textoDias}</span>
    </div>

    <div class="progreso-membresia">
      <div style="width:${progreso}%"></div>
    </div>
  `;

  if (activo) {
    qrCanvas.style.display = "block";
    qrCanvas.style.margin = "24px auto 0";

    QRCode.toCanvas(qrCanvas, cliente.qr_token, {
      width: 240,
      margin: 2
    });

    accionesCliente.innerHTML = `
      <p class="nota-qr">Muestra este código en recepción para ingresar.</p>
    `;
  } else {
    qrCanvas.style.display = "none";
    qrCanvas.getContext("2d").clearRect(0, 0, qrCanvas.width, qrCanvas.height);

    accionesCliente.innerHTML = `
      <div class="qr-bloqueado">
        <h3>QR bloqueado</h3>
        <p>Renueva tu membresía para volver a activar tu acceso.</p>
      </div>

      <a class="btn-whatsapp-cliente" href="https://wa.me/526621668765?text=Hola,%20quiero%20renovar%20mi%20membresía" target="_blank">
        Renovar por WhatsApp
      </a>
    `;
  }
}